# iOS Entegrasyon Kılavuzu

## Genel Bakış

Bu uygulama, turistik gezilerde rehber ve turist kafilesi arasında internet bağımsız iletişimi sağlayan bir mesajlaşma sistemidir. Kullanıcılar Bluetooth üzerinden grup mesajlaşması yapabilir ve internet bağlantısı olduğunda veriler otomatik olarak sunucuyla senkronize edilir.

## Temel Özellikler

1. **Kullanıcı Rolleri**
   - Admin: Rehber atama yetkisi
   - Guide (Rehber): Grup oluşturma ve kullanıcı davet etme yetkisi
   - User: Yalnızca davet edildiği gruplarda mesajlaşma yetkisi

2. **Mesajlaşma Özellikleri**
   - Bluetooth üzerinden grup mesajlaşması
   - Offline veri depolama ve senkronizasyon
   - Yalnızca grup bazlı mesajlaşma (özel mesajlaşma yok)
   - Konum paylaşımı
   - Medya paylaşımı (resim, dosya)

## Teknik Gereksinimler

### 1. Framework'ler ve Kütüphaneler
```swift
// Core Frameworks
import SwiftUI           // UI Framework
import CoreBluetooth    // Bluetooth iletişimi
import MultipeerConnectivity  // P2P iletişim
import CoreData         // Yerel veritabanı
import Alamofire        // Network istekleri

// Optional Frameworks
import CoreLocation     // Konum servisleri
import Network         // Ağ durumu takibi
```

### 2. Minimum Gereksinimler
- iOS 14.0+
- Bluetooth 4.0+ destekli cihaz
- Xcode 13.0+
- Swift 5.5+

### 3. Gerekli İzinler (Info.plist)
```xml
<!-- Bluetooth İzinleri -->
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Grup mesajlaşması için Bluetooth erişimi gereklidir</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Yakındaki grup üyeleriyle mesajlaşmak için gereklidir</string>

<!-- Yerel Ağ İzinleri -->
<key>NSLocalNetworkUsageDescription</key>
<string>Yakındaki kullanıcılarla mesajlaşma için gereklidir</string>

<!-- Konum İzinleri -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Konum paylaşımı için gereklidir</string>
```

## MVVM Mimarisi

### 1. Core Data Models

#### User.xcdatamodeld
```swift
// User Entity
entity User {
    @NSManaged var id: String
    @NSManaged var phoneNumber: String
    @NSManaged var firstName: String
    @NSManaged var lastName: String
    @NSManaged var role: String // "admin", "guide", "user"
    @NSManaged var isVerified: Bool
    @NSManaged var deviceId: String?
    @NSManaged var groups: NSSet? // İlişki: TourGroup
}

extension User {
    static func fetchRequest() -> NSFetchRequest<User> {
        return NSFetchRequest<User>(entityName: "User")
    }
}
```

#### TourGroup.xcdatamodeld
```swift
// TourGroup Entity
entity TourGroup {
    @NSManaged var id: String
    @NSManaged var name: String
    @NSManaged var guideId: String
    @NSManaged var isActive: Bool
    @NSManaged var startDate: Date?
    @NSManaged var endDate: Date?
    @NSManaged var lastSyncTime: Date?
    @NSManaged var members: NSSet? // İlişki: User
    @NSManaged var messages: NSSet? // İlişki: Message
}

extension TourGroup {
    static func fetchRequest() -> NSFetchRequest<TourGroup> {
        return NSFetchRequest<TourGroup>(entityName: "TourGroup")
    }
}
```

#### Message.xcdatamodeld
```swift
// Message Entity
entity Message {
    @NSManaged var localId: String
    @NSManaged var serverId: String?
    @NSManaged var groupId: String
    @NSManaged var senderId: String
    @NSManaged var content: String
    @NSManaged var type: String // "text", "image", "location"
    @NSManaged var status: String // "sent", "delivered", "read"
    @NSManaged var sentAt: Date
    @NSManaged var syncedAt: Date?
    @NSManaged var metadata: Data? // JSON formatında ek bilgiler
    @NSManaged var group: TourGroup? // İlişki: TourGroup
    @NSManaged var sender: User? // İlişki: User
    
    var isSync: Bool {
        return serverId != nil
    }
}

extension Message {
    static func fetchRequest() -> NSFetchRequest<Message> {
        return NSFetchRequest<Message>(entityName: "Message")
    }
}
```

### 2. ViewModels

#### AuthViewModel
```swift
class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    private let authService: AuthService
    private let context: NSManagedObjectContext
    
    func sendVerificationCode(phoneNumber: String) async throws {
        // SMS doğrulama kodu gönderme
    }
    
    func verifyCode(_ code: String) async throws {
        // Doğrulama kodunu kontrol etme ve kullanıcıyı CoreData'ya kaydetme
        try await context.perform {
            let user = User(context: self.context)
            // Kullanıcı bilgilerini doldur
            try self.context.save()
        }
    }
}
```

#### GroupViewModel
```swift
class GroupViewModel: ObservableObject {
    @Published var groups: [TourGroup] = []
    private let groupService: GroupService
    private let context: NSManagedObjectContext
    
    // CoreData'dan grupları yükle
    func loadGroups() {
        let request = TourGroup.fetchRequest()
        request.sortDescriptors = [NSSortDescriptor(key: "startDate", ascending: false)]
        
        do {
            groups = try context.fetch(request)
        } catch {
            print("Grup yükleme hatası:", error)
        }
    }
    
    func createGroup(name: String, members: [String]) async throws {
        // 1. API'ye grup oluşturma isteği gönder
        // 2. Başarılı olursa CoreData'ya kaydet
        try await context.perform {
            let group = TourGroup(context: self.context)
            // Grup bilgilerini doldur
            try self.context.save()
        }
    }
}
```

#### ChatViewModel
```swift
class ChatViewModel: ObservableObject {
    @Published var messages: [Message] = []
    private let messageService: MessageService
    private let bluetoothManager: BluetoothManager
    private let context: NSManagedObjectContext
    
    // CoreData'dan mesajları yükle
    func loadMessages(for groupId: String) {
        let request = Message.fetchRequest()
        request.predicate = NSPredicate(format: "groupId == %@", groupId)
        request.sortDescriptors = [NSSortDescriptor(key: "sentAt", ascending: true)]
        
        do {
            messages = try context.fetch(request)
        } catch {
            print("Mesaj yükleme hatası:", error)
        }
    }
    
    func sendMessage(_ content: String, in group: TourGroup) async throws {
        try await context.perform {
            // 1. CoreData'da mesaj oluştur
            let message = Message(context: self.context)
            message.localId = UUID().uuidString
            message.content = content
            message.groupId = group.id
            message.sentAt = Date()
            
            // 2. Kaydet
            try self.context.save()
            
            // 3. Bluetooth ile gönder
            try await self.bluetoothManager.sendMessage(message, in: group)
            
            // 4. İnternet varsa sunucuya gönder
            if NetworkMonitor.shared.isConnected {
                try await self.syncMessage(message)
            }
        }
    }
}
```

## Bluetooth İletişimi

### BluetoothManager
```swift
class BluetoothManager: NSObject {
    private let serviceType = "tour-chat"
    private var session: MCSession?
    private var advertiser: MCNearbyServiceAdvertiser?
    private var browser: MCNearbyServiceBrowser?
    private let context: NSManagedObjectContext
    
    func startServices() {
        // Bluetooth servislerini başlat
        setupSession()
        startAdvertising()
        startBrowsing()
    }
    
    func sendMessage(_ message: Message, in group: TourGroup) async throws {
        // 1. Mesajı JSON'a dönüştür
        let encoder = JSONEncoder()
        let data = try encoder.encode(message)
        
        // 2. Gruptaki diğer üyelere gönder
        try session?.send(data, toPeers: session?.connectedPeers ?? [], with: .reliable)
    }
}

extension BluetoothManager: MCSessionDelegate {
    func session(_ session: MCSession, didReceive data: Data, fromPeer: MCPeerID) {
        // 1. Gelen veriyi Message objesine dönüştür
        guard let message = try? JSONDecoder().decode(Message.self, from: data) else { return }
        
        // 2. CoreData'ya kaydet
        context.perform {
            let newMessage = Message(context: self.context)
            // Mesaj bilgilerini doldur
            try? self.context.save()
        }
    }
}
```

## Veri Senkronizasyonu

### SyncManager
```swift
class SyncManager {
    private let context: NSManagedObjectContext
    private let apiClient: APIClient
    private let networkMonitor = NWPathMonitor()
    
    func startMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            if path.status == .satisfied {
                self?.syncPendingData()
            }
        }
    }
    
    private func syncPendingData() async {
        let request = Message.fetchRequest()
        request.predicate = NSPredicate(format: "serverId == nil")
        
        do {
            let messages = try context.fetch(request)
            for message in messages {
                try await syncMessage(message)
            }
        } catch {
            print("Senkronizasyon hatası:", error)
        }
    }
    
    private func syncMessage(_ message: Message) async throws {
        // 1. API'ye gönder
        let response = try await apiClient.syncMessages([message])
        
        // 2. Başarılı yanıt gelirse CoreData'yı güncelle
        try await context.perform {
            message.serverId = response.messageId
            message.syncedAt = Date()
            try self.context.save()
        }
    }
}
```

## Hata Yönetimi

```swift
enum AppError: Error {
    case bluetoothUnavailable
    case networkError(String)
    case authenticationError
    case syncError(String)
    case coreDataError(String)
    
    var localizedDescription: String {
        switch self {
        case .bluetoothUnavailable:
            return "Bluetooth kullanılamıyor"
        case .networkError(let message):
            return "Ağ hatası: \(message)"
        case .authenticationError:
            return "Oturum hatası"
        case .syncError(let message):
            return "Senkronizasyon hatası: \(message)"
        case .coreDataError(let message):
            return "Veritabanı hatası: \(message)"
        }
    }
}
```

## API İstekleri (Alamofire)

### APIClient
```swift
class APIClient {
    private let baseURL = "https://backend-sara.vercel.app/api"
    
    func syncMessages(_ messages: [Message]) async throws -> SyncResponse {
        let parameters = messages.map { message in
            return [
                "localId": message.localId,
                "groupId": message.groupId,
                "content": message.content,
                "type": message.type,
                "sentAt": ISO8601DateFormatter().string(from: message.sentAt)
            ]
        }
        
        return try await AF.request(
            "\(baseURL)/messages/sync",
            method: .post,
            parameters: ["messages": parameters],
            encoding: JSONEncoding.default
        ).serializingDecodable(SyncResponse.self).value
    }
}
```

## Test Stratejisi

1. **Unit Tests**
   - ViewModel testleri
   - CoreData CRUD işlemleri testleri
   - Bluetooth mesaj gönderme/alma testleri

2. **Integration Tests**
   - CoreData ve Bluetooth entegrasyon testleri
   - API senkronizasyon testleri

3. **UI Tests**
   - Temel kullanıcı akışı testleri
   - Offline/Online durum geçiş testleri

## Performans İpuçları

1. **CoreData Optimizasyonu**
   - NSFetchedResultsController kullan
   - Batch işlemleri için NSBatchDeleteRequest ve NSBatchUpdateRequest kullan
   - İndeksler ekle
   - Gereksiz ilişkileri fetch etme

2. **Bluetooth Optimizasyonu**
   - Mesaj boyutlarını küçük tut
   - Gereksiz taramaları engelle
   - Bağlantı kopması durumunda otomatik yeniden bağlan

3. **Batarya Optimizasyonu**
   - Bluetooth tarama aralıklarını optimize et
   - Arka plan senkronizasyonunu akıllıca yönet
   - Konum servislerini gerektiğinde kullan 