# iOS Entegrasyon Kılavuzu

## Genel Bakış

Bu uygulama, tur grupları için offline-first bir mesajlaşma sistemi sağlar. Kullanıcılar Bluetooth üzerinden mesajlaşabilir ve internet bağlantısı olduğunda veriler sunucuyla senkronize edilir.

## Temel Bileşenler

1. **Kullanıcı Yönetimi**
   - JWT tabanlı kimlik doğrulama
   - SMS doğrulaması
   - Rol tabanlı yetkilendirme (kullanıcı, rehber, admin)

2. **Grup Yönetimi**
   - Rehberler grup oluşturabilir
   - Kullanıcıları gruplara davet edebilir
   - Grup detaylarını görüntüleyebilir

3. **Mesajlaşma**
   - Bluetooth üzerinden yerel mesajlaşma
   - Offline veri depolama
   - Sunucu senkronizasyonu

## Teknik Gereksinimler

1. **Framework'ler**
   ```swift
   import CoreData          // Yerel veri depolama
   import MultipeerConnectivity  // Bluetooth mesajlaşma
   import CoreLocation      // Konum servisleri
   import Network          // Ağ durumu takibi
   ```

2. **Minimum iOS Sürümü**
   - iOS 14.0+

3. **Gerekli İzinler**
   ```xml
   <!-- Info.plist -->
   <key>NSBluetoothAlwaysUsageDescription</key>
   <string>Bluetooth mesajlaşma için gerekli</string>
   <key>NSLocalNetworkUsageDescription</key>
   <string>Yakındaki kullanıcılarla mesajlaşma için gerekli</string>
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>Konum paylaşımı için gerekli</string>
   ```

## Veri Modelleri

### CoreData Modelleri

1. **Message.swift**
```swift
class Message: NSManagedObject {
    @NSManaged var localId: String          // Benzersiz yerel ID
    @NSManaged var content: String          // Mesaj içeriği
    @NSManaged var type: String            // text, image, location, file
    @NSManaged var senderId: String         // Gönderen ID
    @NSManaged var groupId: String          // Grup ID
    @NSManaged var sentAt: Date            // Gönderim zamanı
    @NSManaged var status: String          // sent, delivered, read, failed
    @NSManaged var syncedAt: Date?         // Senkronizasyon zamanı
    @NSManaged var metadata: Data?         // JSON formatında ek bilgiler
    
    // Metadata yardımcı metodları
    var locationData: LocationMetadata? {
        get {
            guard type == "location",
                  let data = metadata else { return nil }
            return try? JSONDecoder().decode(LocationMetadata.self, from: data)
        }
        set {
            metadata = try? JSONEncoder().encode(newValue)
        }
    }
}

struct LocationMetadata: Codable {
    let latitude: Double
    let longitude: Double
    let address: String?
}
```

2. **TourGroup.swift**
```swift
class TourGroup: NSManagedObject {
    @NSManaged var id: String
    @NSManaged var name: String
    @NSManaged var guideId: String
    @NSManaged var members: Set<Member>
    @NSManaged var isActive: Bool
    @NSManaged var startDate: Date?
    @NSManaged var endDate: Date?
    @NSManaged var lastSyncTime: Date?
}
```

## Bluetooth Mesajlaşma

### 1. MultipeerConnectivity Yöneticisi
```swift
class BluetoothManager: NSObject {
    static let shared = BluetoothManager()
    private let serviceType = "tour-chat"
    private let myPeerId: MCPeerID
    private let session: MCSession
    private let advertiser: MCNearbyServiceAdvertiser
    private let browser: MCNearbyServiceBrowser
    
    private override init() {
        // Benzersiz cihaz kimliği
        let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
        myPeerId = MCPeerID(displayName: deviceId)
        
        // Oturum ve servis ayarları
        session = MCSession(peer: myPeerId, securityIdentity: nil, encryptionPreference: .required)
        advertiser = MCNearbyServiceAdvertiser(peer: myPeerId, discoveryInfo: nil, serviceType: serviceType)
        browser = MCNearbyServiceBrowser(peer: myPeerId, serviceType: serviceType)
        
        super.init()
        
        session.delegate = self
        advertiser.delegate = self
        browser.delegate = self
    }
    
    // Bluetooth servislerini başlat
    func startServices() {
        advertiser.startAdvertisingPeer()
        browser.startBrowsingForPeers()
    }
    
    // Bluetooth servislerini durdur
    func stopServices() {
        advertiser.stopAdvertisingPeer()
        browser.stopBrowsingForPeers()
        session.disconnect()
    }
}
```

### 2. Mesaj Gönderme ve Alma
```swift
extension BluetoothManager {
    // Mesaj gönderme
    func sendMessage(_ message: Message, to peers: [MCPeerID]) {
        do {
            let messageData = try JSONEncoder().encode(message)
            try session.send(messageData, toPeers: peers, with: .reliable)
            
            // Yerel veritabanına kaydet
            CoreDataManager.shared.saveMessage(message)
        } catch {
            print("Mesaj gönderme hatası:", error)
            message.status = "failed"
            CoreDataManager.shared.saveContext()
        }
    }
    
    // Mesaj alma
    func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
        do {
            let message = try JSONDecoder().decode(Message.self, from: data)
            
            // Yerel veritabanına kaydet
            DispatchQueue.main.async {
                CoreDataManager.shared.saveMessage(message)
                NotificationCenter.default.post(name: .newMessageReceived, object: message)
            }
        } catch {
            print("Mesaj alma hatası:", error)
        }
    }
}
```

## Veri Senkronizasyonu

### 1. Senkronizasyon Yöneticisi
```swift
class SyncManager {
    static let shared = SyncManager()
    private let networkMonitor = NWPathMonitor()
    private var syncTimer: Timer?
    
    private init() {
        setupNetworkMonitoring()
    }
    
    // Ağ durumu izleme
    private func setupNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            if path.status == .satisfied {
                self?.syncMessages()
            }
        }
        networkMonitor.start(queue: DispatchQueue.global())
    }
    
    // Periyodik senkronizasyon
    func startPeriodicSync() {
        syncTimer = Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { [weak self] _ in
            self?.syncMessages()
        }
    }
}
```

### 2. Mesaj Senkronizasyonu
```swift
extension SyncManager {
    func syncMessages() {
        // İnternet bağlantısı kontrolü
        guard NetworkReachability.shared.isConnected else { return }
        
        // Senkronize edilmemiş mesajları al
        let unsyncedMessages = CoreDataManager.shared.fetchUnsyncedMessages()
        
        guard !unsyncedMessages.isEmpty else { return }
        
        // API'ye gönder
        APIClient.shared.syncMessages(unsyncedMessages) { result in
            switch result {
            case .success(let response):
                self.handleSyncSuccess(response)
            case .failure(let error):
                self.handleSyncError(error)
            }
        }
    }
    
    private func handleSyncSuccess(_ response: SyncResponse) {
        CoreDataManager.shared.performBackgroundTask { context in
            for result in response.syncedMessages {
                if let message = context.message(withLocalId: result.localMessageId) {
                    message.syncedAt = response.syncTime
                    message.status = "sent"
                }
            }
            try? context.save()
        }
    }
}
```

## Hata Yönetimi

### 1. Ağ Hataları
```swift
enum NetworkError: Error {
    case noInternet
    case serverError(String)
    case authenticationError
    
    var localizedDescription: String {
        switch self {
        case .noInternet:
            return "İnternet bağlantısı yok"
        case .serverError(let message):
            return "Sunucu hatası: \(message)"
        case .authenticationError:
            return "Oturum süresi doldu"
        }
    }
}

class ErrorHandler {
    static func handle(_ error: Error) {
        switch error {
        case NetworkError.noInternet:
            // Mesajları yerel olarak sakla
            continueOfflineMode()
            
        case NetworkError.authenticationError:
            // Yeniden giriş yap
            refreshTokenAndRetry()
            
        case NetworkError.serverError:
            // Hatayı logla ve kullanıcıyı bilgilendir
            logError(error)
            showErrorAlert(error)
            
        default:
            // Genel hata
            showErrorAlert(error)
        }
    }
}
```

### 2. Bluetooth Hataları
```swift
enum BluetoothError: Error {
    case notAvailable
    case connectionLost
    case peerNotFound
    
    var localizedDescription: String {
        switch self {
        case .notAvailable:
            return "Bluetooth kullanılamıyor"
        case .connectionLost:
            return "Bağlantı koptu"
        case .peerNotFound:
            return "Eşleşen cihaz bulunamadı"
        }
    }
}

extension BluetoothManager {
    func handleConnectionError(_ error: BluetoothError) {
        switch error {
        case .connectionLost:
            // Yeniden bağlanmayı dene
            retryConnection()
            
        case .notAvailable:
            // Kullanıcıyı bilgilendir
            showBluetoothAlert()
            
        case .peerNotFound:
            // Yakındaki cihazları tara
            startBrowsingForPeers()
        }
    }
}
```

## Güvenlik

### 1. Veri Güvenliği
```swift
class SecurityManager {
    // JWT token yönetimi
    static func saveToken(_ token: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "jwt_token",
            kSecValueData as String: token.data(using: .utf8)!
        ]
        SecItemAdd(query as CFDictionary, nil)
    }
    
    // Hassas veri şifreleme
    static func encryptMessage(_ message: String) -> Data? {
        guard let data = message.data(using: .utf8) else { return nil }
        return try? CryptoKit.AES.GCM.seal(data, using: symmetricKey).combined
    }
}
```

### 2. Bluetooth Güvenliği
```swift
extension BluetoothManager {
    // Peer kimlik doğrulama
    func session(_ session: MCSession, didReceiveCertificate certificate: [Any]?, fromPeer peerID: MCPeerID, certificateHandler: @escaping (Bool) -> Void) {
        // Sertifika kontrolü
        if let cert = certificate?.first as? SecCertificate {
            validatePeerCertificate(cert)
            certificateHandler(true)
        } else {
            certificateHandler(false)
        }
    }
}
```

## Test Önerileri

1. **Offline Testler**
```swift
class OfflineTests {
    func testMessageStorage() {
        // İnternet bağlantısını kapat
        NetworkReachability.shared.simulateOffline()
        
        // Test mesajı gönder
        let message = Message(content: "Test mesajı")
        messageManager.sendMessage(message)
        
        // Yerel veritabanını kontrol et
        let savedMessage = CoreDataManager.shared.fetchMessage(withLocalId: message.localId)
        XCTAssertNotNil(savedMessage)
    }
}
```

2. **Bluetooth Testler**
```swift
class BluetoothTests {
    func testPeerDiscovery() {
        // Bluetooth servisini başlat
        BluetoothManager.shared.startServices()
        
        // Yakındaki cihazları kontrol et
        XCTAssertTrue(BluetoothManager.shared.peers.count > 0)
    }
}
```

## Örnek Kullanım

### 1. Mesaj Gönderme
```swift
// Text mesajı
func sendTextMessage(_ text: String, in group: TourGroup) {
    let message = Message(context: viewContext)
    message.localId = UUID().uuidString
    message.content = text
    message.type = "text"
    message.groupId = group.id
    message.senderId = currentUser.id
    message.sentAt = Date()
    message.status = "pending"
    
    // Bluetooth ile gönder
    BluetoothManager.shared.sendMessage(message)
}

// Konum mesajı
func sendLocationMessage(_ coordinate: CLLocationCoordinate2D, in group: TourGroup) {
    let message = Message(context: viewContext)
    message.localId = UUID().uuidString
    message.type = "location"
    message.groupId = group.id
    
    let metadata = LocationMetadata(
        latitude: coordinate.latitude,
        longitude: coordinate.longitude
    )
    message.metadata = try? JSONEncoder().encode(metadata)
    
    // Bluetooth ile gönder
    BluetoothManager.shared.sendMessage(message)
}
```

### 2. Mesaj Alma ve Gösterme
```swift
class ChatViewController: UIViewController {
    private var messages: [Message] = []
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupMessageObserver()
    }
    
    private func setupMessageObserver() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleNewMessage),
            name: .newMessageReceived,
            object: nil
        )
    }
    
    @objc private func handleNewMessage(_ notification: Notification) {
        guard let message = notification.object as? Message else { return }
        messages.append(message)
        updateUI()
    }
} 