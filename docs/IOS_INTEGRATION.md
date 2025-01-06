# iOS Entegrasyon Dokümantasyonu

## Admin Panel Entegrasyonu

### Kullanıcı Yönetimi

#### Kullanıcı Listesi ve Filtreleme
```swift
func fetchUsers(search: String? = nil, role: String? = nil, status: String? = nil, page: Int = 1, limit: Int = 20) async throws -> UsersResponse {
    var queryItems: [URLQueryItem] = []
    
    if let search = search {
        queryItems.append(URLQueryItem(name: "search", value: search))
    }
    if let role = role {
        queryItems.append(URLQueryItem(name: "role", value: role))
    }
    if let status = status {
        queryItems.append(URLQueryItem(name: "status", value: status))
    }
    
    queryItems.append(URLQueryItem(name: "page", value: String(page)))
    queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
    
    let endpoint = "/api/admin/users"
    return try await APIClient.shared.get(endpoint: endpoint, queryItems: queryItems)
}

struct UsersResponse: Codable {
    let success: Bool
    let users: [User]
    let pagination: Pagination
}

struct Pagination: Codable {
    let total: Int
    let page: Int
    let pages: Int
    let limit: Int
}
```

#### Kullanıcı Detayları
```swift
func fetchUserDetails(userId: String) async throws -> UserDetailResponse {
    let endpoint = "/api/admin/users/\(userId)"
    return try await APIClient.shared.get(endpoint: endpoint)
}

struct UserDetailResponse: Codable {
    let success: Bool
    let user: UserDetail
}

struct UserDetail: Codable {
    let id: String
    let phoneNumber: String
    let firstName: String
    let lastName: String
    let email: String?
    let role: String
    let status: String
    let createdAt: Date
    let updatedAt: Date
    let lastLogin: Date?
    let blockReason: String?
}
```

#### Kullanıcı Rolü Güncelleme
```swift
func updateUserRole(userId: String, role: String) async throws -> UpdateRoleResponse {
    let endpoint = "/api/admin/users/\(userId)/role"
    let body = ["role": role]
    return try await APIClient.shared.patch(endpoint: endpoint, body: body)
}

struct UpdateRoleResponse: Codable {
    let success: Bool
    let user: UpdatedUser
}

struct UpdatedUser: Codable {
    let id: String
    let role: String
    let updatedAt: Date
}
```

#### Kullanıcı Durumu Güncelleme
```swift
func updateUserStatus(userId: String, status: String, reason: String? = nil) async throws -> UpdateStatusResponse {
    let endpoint = "/api/admin/users/\(userId)/status"
    var body: [String: String] = ["status": status]
    if let reason = reason {
        body["reason"] = reason
    }
    return try await APIClient.shared.patch(endpoint: endpoint, body: body)
}

struct UpdateStatusResponse: Codable {
    let success: Bool
    let user: UpdatedUserStatus
}

struct UpdatedUserStatus: Codable {
    let id: String
    let status: String
    let updatedAt: Date
}
```

### Hata Yönetimi
```swift
enum AdminError: Error {
    case invalidRole
    case invalidStatus
    case userNotFound
    case unauthorized
    case cannotModifyOwnRole
    case serverError(String)
}

extension AdminError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .invalidRole:
            return "Geçersiz rol değeri"
        case .invalidStatus:
            return "Geçersiz durum değeri"
        case .userNotFound:
            return "Kullanıcı bulunamadı"
        case .unauthorized:
            return "Bu işlem için yetkiniz bulunmuyor"
        case .cannotModifyOwnRole:
            return "Kendi rolünüzü değiştiremezsiniz"
        case .serverError(let message):
            return message
        }
    }
}
```

### Örnek Kullanım
```swift
// Kullanıcı listesi alma
do {
    let response = try await fetchUsers(search: "John", role: "user", page: 1, limit: 20)
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Kullanıcı detayı alma
do {
    let response = try await fetchUserDetails(userId: "user_id")
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Rol güncelleme
do {
    let response = try await updateUserRole(userId: "user_id", role: "guide")
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Durum güncelleme
do {
    let response = try await updateUserStatus(userId: "user_id", status: "blocked", reason: "Kural ihlali")
    // UI güncelleme
} catch {
    // Hata yönetimi
}
```

### Rehber Onaylama Sistemi

#### Onay Bekleyen Rehberleri Listeleme
```swift
func fetchPendingGuides(page: Int = 1, limit: Int = 20) async throws -> PendingGuidesResponse {
    var queryItems = [
        URLQueryItem(name: "page", value: String(page)),
        URLQueryItem(name: "limit", value: String(limit))
    ]
    
    let endpoint = "/api/admin/guides/pending"
    return try await APIClient.shared.get(endpoint: endpoint, queryItems: queryItems)
}

struct PendingGuidesResponse: Codable {
    let success: Bool
    let guides: [GuideDetail]
    let pagination: Pagination
}

struct GuideDetail: Codable {
    let id: String
    let firstName: String
    let lastName: String
    let phoneNumber: String
    let email: String?
    let status: String
    let guideInfo: GuideInfo
    let createdAt: Date
}

struct GuideInfo: Codable {
    let experience: Int
    let languages: [String]
    let certifications: [String]
    let approvalStatus: String
    let rejectionReason: String?
}

#### Rehber Başvurusunu Onaylama
```swift
func approveGuide(guideId: String) async throws -> GuideApprovalResponse {
    let endpoint = "/api/admin/guides/\(guideId)/approve"
    return try await APIClient.shared.post(endpoint: endpoint)
}

struct GuideApprovalResponse: Codable {
    let success: Bool
    let guide: GuideApprovalStatus
}

struct GuideApprovalStatus: Codable {
    let id: String
    let approvalStatus: String
    let updatedAt: Date
}

#### Rehber Başvurusunu Reddetme
```swift
func rejectGuide(guideId: String, reason: String) async throws -> GuideRejectionResponse {
    let endpoint = "/api/admin/guides/\(guideId)/reject"
    let body = ["reason": reason]
    return try await APIClient.shared.post(endpoint: endpoint, body: body)
}

struct GuideRejectionResponse: Codable {
    let success: Bool
    let guide: GuideApprovalStatus
}

### Örnek Kullanım
```swift
// Onay bekleyen rehberleri listeleme
do {
    let response = try await fetchPendingGuides(page: 1, limit: 20)
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Rehber başvurusunu onaylama
do {
    let response = try await approveGuide(guideId: "guide_id")
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Rehber başvurusunu reddetme
do {
    let response = try await rejectGuide(guideId: "guide_id", reason: "Yetersiz deneyim")
    // UI güncelleme
} catch {
    // Hata yönetimi
}
```

### Hata Yönetimi
```swift
extension AdminError {
    static let guideNotFound = AdminError.custom("Rehber bulunamadı")
    static let invalidApprovalStatus = AdminError.custom("Geçersiz onay durumu")
    static let rejectionReasonRequired = AdminError.custom("Ret sebebi belirtilmelidir")
}
```

### Grup Yönetimi

#### Grupları Listeleme ve Filtreleme
```swift
func fetchGroups(search: String? = nil, guideId: String? = nil, status: String? = nil, page: Int = 1, limit: Int = 20) async throws -> GroupsResponse {
    var queryItems: [URLQueryItem] = []
    
    if let search = search {
        queryItems.append(URLQueryItem(name: "search", value: search))
    }
    if let guideId = guideId {
        queryItems.append(URLQueryItem(name: "guideId", value: guideId))
    }
    if let status = status {
        queryItems.append(URLQueryItem(name: "status", value: status))
    }
    
    queryItems.append(URLQueryItem(name: "page", value: String(page)))
    queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
    
    let endpoint = "/api/admin/groups"
    return try await APIClient.shared.get(endpoint: endpoint, queryItems: queryItems)
}

struct GroupsResponse: Codable {
    let success: Bool
    let groups: [GroupSummary]
    let pagination: Pagination
}

struct GroupSummary: Codable {
    let id: String
    let name: String
    let description: String
    let guide: GuideBasic
    let memberCount: Int
    let status: String
    let createdAt: Date
}

struct GuideBasic: Codable {
    let id: String
    let firstName: String
    let lastName: String
}

#### Grup Detayları
```swift
func fetchGroupDetails(groupId: String) async throws -> GroupDetailResponse {
    let endpoint = "/api/admin/groups/\(groupId)"
    return try await APIClient.shared.get(endpoint: endpoint)
}

struct GroupDetailResponse: Codable {
    let success: Bool
    let group: GroupDetail
}

struct GroupDetail: Codable {
    let id: String
    let name: String
    let description: String
    let guide: GuideDetail
    let members: [GroupMember]
    let status: String
    let createdAt: Date
    let updatedAt: Date
}

struct GuideDetail: Codable {
    let id: String
    let firstName: String
    let lastName: String
    let phoneNumber: String
    let email: String?
}

struct GroupMember: Codable {
    let id: String
    let firstName: String
    let lastName: String
    let phoneNumber: String
}

#### Grup Durumu Güncelleme
```swift
func updateGroupStatus(groupId: String, status: String, reason: String? = nil) async throws -> UpdateGroupStatusResponse {
    let endpoint = "/api/admin/groups/\(groupId)/status"
    var body: [String: String] = ["status": status]
    if let reason = reason {
        body["reason"] = reason
    }
    return try await APIClient.shared.patch(endpoint: endpoint, body: body)
}

struct UpdateGroupStatusResponse: Codable {
    let success: Bool
    let group: UpdatedGroupStatus
}

struct UpdatedGroupStatus: Codable {
    let id: String
    let status: String
    let updatedAt: Date
}
```

### Örnek Kullanım
```swift
// Grupları listeleme
do {
    let response = try await fetchGroups(search: "Turist", status: "active", page: 1, limit: 20)
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Grup detayı alma
do {
    let response = try await fetchGroupDetails(groupId: "group_id")
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Grup durumu güncelleme
do {
    let response = try await updateGroupStatus(groupId: "group_id", status: "inactive", reason: "Tur tamamlandı")
    // UI güncelleme
} catch {
    // Hata yönetimi
}
```

### Hata Yönetimi
```swift
extension AdminError {
    static let groupNotFound = AdminError.custom("Grup bulunamadı")
    static let invalidGroupStatus = AdminError.custom("Geçersiz grup durumu")
    static let inactiveReasonRequired = AdminError.custom("Pasif duruma alma sebebi belirtilmelidir")
}
```

### İstatistik İşlemleri

#### Kullanıcı İstatistikleri
```swift
func fetchUserStatistics(userId: String) async throws -> UserStatisticsResponse {
    let endpoint = "/api/admin/users/\(userId)/statistics"
    return try await APIClient.shared.get(endpoint: endpoint)
}

struct UserStatisticsResponse: Codable {
    let success: Bool
    let statistics: UserStatistics
}

struct UserStatistics: Codable {
    let totalGroups: Int
    let activeGroups: Int
    let totalMessages: Int
    let lastLoginAt: Date?
    let completedTours: Int
    let totalTimeInSystem: Int
    let createdAt: Date
}

#### Rehber Performans İstatistikleri
```swift
func fetchGuidePerformance(guideId: String) async throws -> GuidePerformanceResponse {
    let endpoint = "/api/admin/guides/\(guideId)/performance"
    return try await APIClient.shared.get(endpoint: endpoint)
}

struct GuidePerformanceResponse: Codable {
    let success: Bool
    let performance: GuidePerformance
}

struct GuidePerformance: Codable {
    let totalGroups: Int
    let activeGroups: Int
    let completedTours: Int
    let totalMembers: Int
    let averageGroupSize: Double
    let messageResponseRate: Double
    let totalFeedbacks: Int
    let averageRating: Double
}

#### Rehber Grupları
```swift
func fetchGuideGroups(guideId: String, status: String? = nil, page: Int = 1, limit: Int = 20) async throws -> GuideGroupsResponse {
    var queryItems: [URLQueryItem] = [
        URLQueryItem(name: "page", value: String(page)),
        URLQueryItem(name: "limit", value: String(limit))
    ]
    
    if let status = status {
        queryItems.append(URLQueryItem(name: "status", value: status))
    }
    
    let endpoint = "/api/admin/guides/\(guideId)/groups"
    return try await APIClient.shared.get(endpoint: endpoint, queryItems: queryItems)
}

struct GuideGroupsResponse: Codable {
    let success: Bool
    let groups: [GuideGroupDetail]
    let pagination: Pagination
}

struct GuideGroupDetail: Codable {
    let id: String
    let name: String
    let status: String
    let memberCount: Int
    let startDate: Date?
    let endDate: Date?
    let lastActivityAt: Date
    let totalMessages: Int
}

### Örnek Kullanım
```swift
// Kullanıcı istatistikleri
do {
    let response = try await fetchUserStatistics(userId: "user_id")
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Rehber performans istatistikleri
do {
    let response = try await fetchGuidePerformance(guideId: "guide_id")
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Rehber grupları
do {
    let response = try await fetchGuideGroups(
        guideId: "guide_id",
        status: "active",
        page: 1,
        limit: 20
    )
    // UI güncelleme
} catch {
    // Hata yönetimi
}
```

### Hata Yönetimi
```swift
extension AdminError {
    static let statisticsNotFound = AdminError.custom("İstatistikler bulunamadı")
    static let performanceDataNotAvailable = AdminError.custom("Performans verileri mevcut değil")
    static let invalidDateRange = AdminError.custom("Geçersiz tarih aralığı")
}

### Sistem İstatistikleri ve Raporlama

#### Sistem İstatistikleri
```swift
func fetchSystemStatistics(startDate: Date? = nil, endDate: Date? = nil) async throws -> SystemStatisticsResponse {
    var queryItems: [URLQueryItem] = []
    
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    
    if let startDate = startDate {
        queryItems.append(URLQueryItem(name: "startDate", value: dateFormatter.string(from: startDate)))
    }
    
    if let endDate = endDate {
        queryItems.append(URLQueryItem(name: "endDate", value: dateFormatter.string(from: endDate)))
    }
    
    let endpoint = "/api/admin/statistics/system"
    return try await APIClient.shared.get(endpoint: endpoint, queryItems: queryItems)
}

struct SystemStatisticsResponse: Codable {
    let success: Bool
    let statistics: SystemStatistics
}

struct SystemStatistics: Codable {
    let totalUsers: Int
    let activeUsers: Int
    let totalGuides: Int
    let activeGuides: Int
    let totalGroups: Int
    let activeGroups: Int
    let totalMessages: Int
    let averageGroupSize: Double
    let averageMessagesPerGroup: Double
    let dailyActiveUsers: Int
    let monthlyActiveUsers: Int
}

#### Aktivite Raporu
```swift
enum ActivityReportType: String {
    case daily
    case weekly
    case monthly
}

func fetchActivityReport(startDate: Date, endDate: Date, type: ActivityReportType = .daily) async throws -> ActivityReportResponse {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    
    let queryItems = [
        URLQueryItem(name: "startDate", value: dateFormatter.string(from: startDate)),
        URLQueryItem(name: "endDate", value: dateFormatter.string(from: endDate)),
        URLQueryItem(name: "type", value: type.rawValue)
    ]
    
    let endpoint = "/api/admin/reports/activity"
    return try await APIClient.shared.get(endpoint: endpoint, queryItems: queryItems)
}

struct ActivityReportResponse: Codable {
    let success: Bool
    let report: [ActivityPeriod]
}

struct ActivityPeriod: Codable {
    let date: Date
    let newUsers: Int
    let activeUsers: Int
    let newGroups: Int
    let totalMessages: Int
    let activeGroups: Int
}

### Örnek Kullanım
```swift
// Sistem istatistikleri
do {
    let endDate = Date()
    let calendar = Calendar.current
    let startDate = calendar.date(byAdding: .month, value: -1, to: endDate)!
    
    let response = try await fetchSystemStatistics(startDate: startDate, endDate: endDate)
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Aktivite raporu
do {
    let endDate = Date()
    let calendar = Calendar.current
    let startDate = calendar.date(byAdding: .month, value: -1, to: endDate)!
    
    let response = try await fetchActivityReport(
        startDate: startDate,
        endDate: endDate,
        type: .weekly
    )
    // UI güncelleme
} catch {
    // Hata yönetimi
}
```

### Hata Yönetimi
```swift
extension AdminError {
    static let invalidDateRange = AdminError.custom("Geçersiz tarih aralığı")
    static let reportGenerationFailed = AdminError.custom("Rapor oluşturulamadı")
    static let statisticsNotAvailable = AdminError.custom("İstatistikler mevcut değil")
}

### Performans Metrikleri

#### Sistem Performans Metrikleri
```swift
func fetchSystemPerformance() async throws -> SystemPerformanceResponse {
    let endpoint = "/api/admin/metrics/performance"
    return try await APIClient.shared.get(endpoint: endpoint)
}

struct SystemPerformanceResponse: Codable {
    let success: Bool
    let metrics: SystemMetrics
}

struct SystemMetrics: Codable {
    let responseTime: ResponseTimeMetrics
    let memoryUsage: MemoryMetrics
    let databaseMetrics: DatabaseMetrics
    let systemLoad: SystemLoadMetrics
    let uptime: Double
}

struct ResponseTimeMetrics: Codable {
    let average: Double
    let current: Double
    let max: Double
    let min: Double
}

struct MemoryMetrics: Codable {
    let total: Double
    let used: Double
    let free: Double
}

struct DatabaseMetrics: Codable {
    let connections: Int
    let activeQueries: Int
    let averageQueryTime: Double
}

struct SystemLoadMetrics: Codable {
    let current: Double
    let average: Double
}

### Örnek Kullanım
```swift
// Sistem performans metrikleri
do {
    let response = try await fetchSystemPerformance()
    
    // Yanıt süreleri
    let avgResponseTime = response.metrics.responseTime.average
    let maxResponseTime = response.metrics.responseTime.max
    
    // Bellek kullanımı
    let usedMemory = response.metrics.memoryUsage.used
    let freeMemory = response.metrics.memoryUsage.free
    
    // Veritabanı metrikleri
    let activeConnections = response.metrics.databaseMetrics.connections
    let avgQueryTime = response.metrics.databaseMetrics.averageQueryTime
    
    // UI güncelleme
} catch {
    // Hata yönetimi
}
```

### Hata Yönetimi
```swift
extension AdminError {
    static let metricsNotAvailable = AdminError.custom("Performans metrikleri alınamadı")
    static let systemOverloaded = AdminError.custom("Sistem aşırı yüklü")
}

## Admin Panel - Performans Metrikleri

### Sistem Metriklerini Alma

Sistem performans metriklerini almak için aşağıdaki kodu kullanabilirsiniz:

```swift
func getSystemMetrics() async throws -> SystemMetrics {
    let url = URL(string: "\(baseURL)/api/admin/metrics/system")!
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.addValue("Bearer \(adminToken)", forHTTPHeaderField: "Authorization")
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw NetworkError.invalidResponse
    }
    
    let result = try JSONDecoder().decode(APIResponse<SystemMetrics>.self, from: data)
    return result.data
}

// Model tanımlamaları
struct SystemMetrics: Codable {
    let system: SystemInfo
    let mongodb: MongoDBInfo
}

struct SystemInfo: Codable {
    let uptime: Double
    let memory: MemoryInfo
    let cpu: CPUInfo
    let platform: String
    let arch: String
}

struct MemoryInfo: Codable {
    let total: Int64
    let free: Int64
    let used: Int64
    let usagePercentage: Double
}

struct CPUInfo: Codable {
    let loadAverage: [Double]
    let cores: Int
}

struct MongoDBInfo: Codable {
    let status: String
    let collections: Int
    let connectionPoolSize: String
}
```

### Uygulama Metriklerini Alma

Uygulama kullanım metriklerini almak için aşağıdaki kodu kullanabilirsiniz:

```swift
func getApplicationMetrics() async throws -> ApplicationMetrics {
    let url = URL(string: "\(baseURL)/api/admin/metrics/application")!
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.addValue("Bearer \(adminToken)", forHTTPHeaderField: "Authorization")
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw NetworkError.invalidResponse
    }
    
    let result = try JSONDecoder().decode(APIResponse<ApplicationMetrics>.self, from: data)
    return result.data
}

// Model tanımlamaları
struct ApplicationMetrics: Codable {
    let users: UserMetrics
    let groups: GroupMetrics
    let messages: MessageMetrics
    let bluetooth: BluetoothMetrics
}

struct UserMetrics: Codable {
    let total: Int
    let active: Int
    let activePercentage: Double
}

struct GroupMetrics: Codable {
    let total: Int
    let active: Int
    let activePercentage: Double
}

struct MessageMetrics: Codable {
    let daily: Int
    let weekly: Int
    let averagePerDay: Double
}

struct BluetoothMetrics: Codable {
    let successRate: Double
    let total: Int
    let success: Int
}
```

### Hata Metriklerini Alma

Sistem hata metriklerini almak için aşağıdaki kodu kullanabilirsiniz:

```swift
func getErrorMetrics() async throws -> ErrorMetrics {
    let url = URL(string: "\(baseURL)/api/admin/metrics/errors")!
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.addValue("Bearer \(adminToken)", forHTTPHeaderField: "Authorization")
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw NetworkError.invalidResponse
    }
    
    let result = try JSONDecoder().decode(APIResponse<ErrorMetrics>.self, from: data)
    return result.data
}

// Model tanımlamaları
struct ErrorMetrics: Codable {
    let summary: ErrorSummary
    let byLevel: [ErrorLevel]
    let commonErrors: [CommonError]
}

struct ErrorSummary: Codable {
    let total: Int
    let unresolved: Int
}

struct ErrorLevel: Codable {
    let id: String
    let categories: [ErrorCategory]
    let totalCount: Int
    let totalUnresolved: Int
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case categories
        case totalCount
        case totalUnresolved
    }
}

struct ErrorCategory: Codable {
    let category: String
    let count: Int
    let unresolvedCount: Int
}

struct CommonError: Codable {
    let message: String
    let count: Int
    let category: String
    let level: String
    let lastOccurrence: Date
}
```

### Örnek Kullanım

```swift
class AdminDashboardViewModel: ObservableObject {
    @Published var systemMetrics: SystemMetrics?
    @Published var applicationMetrics: ApplicationMetrics?
    @Published var errorMetrics: ErrorMetrics?
    @Published var error: Error?
    
    func loadAllMetrics() {
        Task {
            do {
                async let systemMetrics = getSystemMetrics()
                async let applicationMetrics = getApplicationMetrics()
                async let errorMetrics = getErrorMetrics()
                
                let (system, app, errors) = try await (systemMetrics, applicationMetrics, errorMetrics)
                
                await MainActor.run {
                    self.systemMetrics = system
                    self.applicationMetrics = app
                    self.errorMetrics = errors
                }
            } catch {
                await MainActor.run {
                    self.error = error
                }
            }
        }
    }
}
```

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

### Bildirim Yönetimi

#### Bildirim Gönderme
```swift
struct NotificationRequest: Codable {
    let recipients: [String]?
    let title: String
    let message: String
    let type: NotificationType
    let expiresIn: Int?
}

enum NotificationType: String, Codable {
    case systemAlert = "system_alert"
    case guideApproval = "guide_approval"
    case guideRejection = "guide_rejection"
    case userBlock = "user_block"
    case userUnblock = "user_unblock"
}

func sendNotification(_ request: NotificationRequest) async throws -> NotificationResponse {
    let endpoint = "/api/admin/notifications"
    return try await APIClient.shared.post(endpoint: endpoint, body: request)
}

struct NotificationResponse: Codable {
    let success: Bool
    let sentCount: Int
}

#### Bildirimleri Listeleme
```swift
struct NotificationListRequest {
    let type: NotificationType?
    let startDate: Date?
    let endDate: Date?
    let page: Int
    let limit: Int
    
    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]
        
        if let type = type {
            items.append(URLQueryItem(name: "type", value: type.rawValue))
        }
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        
        if let startDate = startDate {
            items.append(URLQueryItem(name: "startDate", value: dateFormatter.string(from: startDate)))
        }
        
        if let endDate = endDate {
            items.append(URLQueryItem(name: "endDate", value: dateFormatter.string(from: endDate)))
        }
        
        return items
    }
}

func fetchNotifications(request: NotificationListRequest) async throws -> NotificationListResponse {
    let endpoint = "/api/admin/notifications"
    return try await APIClient.shared.get(endpoint: endpoint, queryItems: request.queryItems)
}

struct NotificationListResponse: Codable {
    let success: Bool
    let notifications: [NotificationDetail]
    let pagination: Pagination
}

struct NotificationDetail: Codable {
    let id: String
    let type: NotificationType
    let title: String
    let message: String
    let recipient: RecipientDetail
    let isRead: Bool
    let createdAt: Date
    let expiresAt: Date?
}

struct RecipientDetail: Codable {
    let id: String
    let firstName: String
    let lastName: String
}

#### Bildirim Silme
```swift
func deleteNotification(id: String) async throws -> BasicResponse {
    let endpoint = "/api/admin/notifications/\(id)"
    return try await APIClient.shared.delete(endpoint: endpoint)
}

### Örnek Kullanım
```swift
// Bildirim gönderme
do {
    let request = NotificationRequest(
        recipients: ["user1", "user2"],
        title: "Sistem Güncellemesi",
        message: "Yeni özellikler eklendi",
        type: .systemAlert,
        expiresIn: 24 // 24 saat
    )
    
    let response = try await sendNotification(request)
    print("Bildirim \(response.sentCount) kullanıcıya gönderildi")
} catch {
    // Hata yönetimi
}

// Bildirimleri listeleme
do {
    let request = NotificationListRequest(
        type: .systemAlert,
        startDate: Date().addingTimeInterval(-7 * 24 * 3600), // Son 7 gün
        endDate: Date(),
        page: 1,
        limit: 20
    )
    
    let response = try await fetchNotifications(request: request)
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Bildirim silme
do {
    let response = try await deleteNotification(id: "notification_id")
    if response.success {
        // UI güncelleme
    }
} catch {
    // Hata yönetimi
}
```

### Hata Yönetimi
```swift
extension AdminError {
    static let notificationSendFailed = AdminError.custom("Bildirim gönderilemedi")
    static let notificationNotFound = AdminError.custom("Bildirim bulunamadı")
    static let invalidNotificationType = AdminError.custom("Geçersiz bildirim tipi")
} 
```

### Sistem Yönetimi

#### Sistem Logları
```swift
enum LogLevel: String, Codable {
    case info
    case warning
    case error
    case critical
}

enum LogCategory: String, Codable {
    case system
    case auth
    case database
    case api
    case bluetooth
    case notification
}

struct SystemLogRequest {
    let level: LogLevel?
    let category: LogCategory?
    let startDate: Date?
    let endDate: Date?
    let resolved: Bool?
    let page: Int
    let limit: Int
    
    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]
        
        if let level = level {
            items.append(URLQueryItem(name: "level", value: level.rawValue))
        }
        
        if let category = category {
            items.append(URLQueryItem(name: "category", value: category.rawValue))
        }
        
        if let resolved = resolved {
            items.append(URLQueryItem(name: "resolved", value: String(resolved)))
        }
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        
        if let startDate = startDate {
            items.append(URLQueryItem(name: "startDate", value: dateFormatter.string(from: startDate)))
        }
        
        if let endDate = endDate {
            items.append(URLQueryItem(name: "endDate", value: dateFormatter.string(from: endDate)))
        }
        
        return items
    }
}

func fetchSystemLogs(request: SystemLogRequest) async throws -> SystemLogResponse {
    let endpoint = "/api/admin/system/logs"
    return try await APIClient.shared.get(endpoint: endpoint, queryItems: request.queryItems)
}

struct SystemLogResponse: Codable {
    let success: Bool
    let logs: [SystemLog]
    let pagination: Pagination
}

struct SystemLog: Codable {
    let id: String
    let level: LogLevel
    let category: LogCategory
    let message: String
    let details: [String: AnyCodable]
    let source: String
    let timestamp: Date
    let resolved: Bool
    let resolvedAt: Date?
    let resolvedBy: UserDetail?
    let resolution: String?
}

func resolveSystemLog(id: String, resolution: String) async throws -> ResolveLogResponse {
    let endpoint = "/api/admin/system/logs/\(id)/resolve"
    let body = ["resolution": resolution]
    return try await APIClient.shared.patch(endpoint: endpoint, body: body)
}

struct ResolveLogResponse: Codable {
    let success: Bool
    let log: ResolvedLog
}

struct ResolvedLog: Codable {
    let id: String
    let resolved: Bool
    let resolvedAt: Date
    let resolution: String
}

#### Sistem Ayarları
```swift
enum SettingCategory: String, Codable {
    case general
    case security
    case notification
    case performance
    case maintenance
}

func fetchSystemSettings(category: SettingCategory? = nil) async throws -> SystemSettingsResponse {
    var queryItems: [URLQueryItem] = []
    
    if let category = category {
        queryItems.append(URLQueryItem(name: "category", value: category.rawValue))
    }
    
    let endpoint = "/api/admin/system/settings"
    return try await APIClient.shared.get(endpoint: endpoint, queryItems: queryItems)
}

struct SystemSettingsResponse: Codable {
    let success: Bool
    let settings: [SystemSetting]
}

struct SystemSetting: Codable {
    let key: String
    let value: AnyCodable
    let category: SettingCategory
    let description: String
    let updatedAt: Date
    let updatedBy: UserDetail?
}

func updateSystemSetting(key: String, value: Any) async throws -> UpdateSettingResponse {
    let endpoint = "/api/admin/system/settings/\(key)"
    let body = ["value": value]
    return try await APIClient.shared.patch(endpoint: endpoint, body: body)
}

struct UpdateSettingResponse: Codable {
    let success: Bool
    let setting: UpdatedSetting
}

struct UpdatedSetting: Codable {
    let key: String
    let value: AnyCodable
    let updatedAt: Date
}

### Örnek Kullanım
```swift
// Sistem loglarını getirme
do {
    let request = SystemLogRequest(
        level: .error,
        category: .api,
        startDate: Date().addingTimeInterval(-7 * 24 * 3600), // Son 7 gün
        endDate: Date(),
        resolved: false,
        page: 1,
        limit: 20
    )
    
    let response = try await fetchSystemLogs(request: request)
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Log çözme
do {
    let response = try await resolveSystemLog(
        id: "log_id",
        resolution: "Sorun çözüldü: Veritabanı bağlantısı yeniden sağlandı"
    )
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Sistem ayarlarını getirme
do {
    let response = try await fetchSystemSettings(category: .security)
    // UI güncelleme
} catch {
    // Hata yönetimi
}

// Sistem ayarı güncelleme
do {
    let response = try await updateSystemSetting(
        key: "security.max_login_attempts",
        value: 3
    )
    // UI güncelleme
} catch {
    // Hata yönetimi
}
```

### Hata Yönetimi
```swift
extension AdminError {
    static let logNotFound = AdminError.custom("Log bulunamadı")
    static let invalidLogResolution = AdminError.custom("Geçersiz çözüm açıklaması")
    static let settingNotFound = AdminError.custom("Ayar bulunamadı")
    static let invalidSettingValue = AdminError.custom("Geçersiz ayar değeri")
}
``` 