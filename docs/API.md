# SA-RA Tour Guide API Dokümantasyonu

## Genel Bilgiler
- Base URL: `http://backend-sara.vercel.app/api`
- Content-Type: `application/json`
- Tüm tarih/zaman değerleri ISO 8601 formatında gönderilmelidir (örn: "2024-01-15T10:00:00.000Z")
- Tüm ID'ler MongoDB ObjectId formatındadır

## Güvenlik
- Tüm istekler HTTPS üzerinden yapılmalıdır
- Maksimum istek boyutu: 10MB
- Kimlik doğrulama için JWT token kullanılmaktadır
- Token'lar Authorization header'ında "Bearer" şeması ile gönderilmelidir
- Access token süresi: 1 saat
- Refresh token süresi: 30 gün

## Hata Kodları
- 400: Geçersiz istek (eksik veya hatalı parametreler)
- 401: Kimlik doğrulama hatası (token eksik veya geçersiz)
- 403: Yetkilendirme hatası (yetkisiz erişim)
- 404: Kaynak bulunamadı
- 409: Çakışma (örn: aynı telefon numarası ile kayıt)
- 429: Çok fazla istek (rate limit aşıldı)
- 500: Sunucu hatası

## Rate Limiting
- SMS doğrulama: 3 istek/saat
- Diğer API endpoint'leri: 100 istek/dakika

## Kimlik Doğrulama İşlemleri (Auth)

### Token Yenileme
```http
POST /api/auth/refresh-token
Auth: Bearer Token gerekli değil

Request:
{
    "refreshToken": "jwt_refresh_token"
}

Response (200 OK):
{
    "success": true,
    "accessToken": "new_jwt_access_token",
    "refreshToken": "new_jwt_refresh_token"
}

Error Response (400):
{
    "success": false,
    "message": "Refresh token gereklidir"
}

Error Response (401):
{
    "success": false,
    "message": "Geçersiz refresh token"
}

Error Response (403):
{
    "success": false,
    "message": "Refresh token süresi dolmuş"
}

## API Endpoints

### Kullanıcı İşlemleri

1. **Telefon Numarası Kontrolü ve SMS Gönderimi**
```http
POST /users/check-phone
Rate limit: 3 istek/saat

Request:
{
    "phoneNumber": "+905551234567"  // Format: +90 ile başlayan 10 haneli numara
}

Response (200 OK):
{
    "success": true,
    "exists": boolean,  // Kullanıcı kayıtlı mı?
    "verificationSid": "VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "status": "pending",
    "message": "Doğrulama kodu gönderildi"
}

Error Response (400):
{
    "success": false,
    "message": "Geçersiz telefon numarası formatı"
}
```

2. **Doğrulama Kodu Kontrolü**
```http
POST /users/verify-code
Rate limit: 3 istek/saat

Request:
{
    "phoneNumber": "+905551234567",
    "code": "123456"  // 6 haneli kod
}

Response (200 OK):
{
    "success": true,
    "isRegistered": boolean,  // Kullanıcı kaydı tamamlanmış mı?
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "user": {
        "_id": "userId",
        "phoneNumber": "+905551234567",
        "firstName": "Ahmet",  // Varsa
        "lastName": "Yılmaz",  // Varsa
        "email": "ahmet@example.com",  // Varsa
        "role": "user",
        "isVerified": true,
        "status": "active"
    }
}

Error Response (400):
{
    "success": false,
    "message": "Geçersiz doğrulama kodu"
}
```

3. **Kullanıcı Kaydını Tamamlama**
```http
POST /users/complete-registration
Auth: Bearer Token

Request:
{
    "firstName": "Ahmet",  // Zorunlu, min: 2, max: 50 karakter
    "lastName": "Yılmaz",  // Zorunlu, min: 2, max: 50 karakter
    "email": "ahmet@example.com",  // Opsiyonel, geçerli email formatı
    "birthDate": "1990-01-01",  // Opsiyonel, ISO 8601 formatı
    "gender": "Erkek",  // Opsiyonel, ["Erkek", "Kadın", "Diğer"]
    "avatar": "https://example.com/avatar.jpg"  // Opsiyonel, geçerli URL
}

Response (200 OK):
{
    "success": true,
    "user": {
        "_id": "userId",
        "phoneNumber": "+905551234567",
        "firstName": "Ahmet",
        "lastName": "Yılmaz",
        "email": "ahmet@example.com",
        "birthDate": "1990-01-01T00:00:00.000Z",
        "gender": "Erkek",
        "avatar": "https://example.com/avatar.jpg",
        "role": "user",
        "isVerified": true,
        "status": "active"
    }
}

Error Response (400):
{
    "success": false,
    "message": "Geçersiz kullanıcı bilgileri",
    "errors": {
        "firstName": "İsim en az 2 karakter olmalıdır",
        "email": "Geçersiz email formatı"
    }
}
```

4. **SMS Tekrar Gönderme**
```http
POST /users/resend-code
Rate limit: 3 istek/saat

Request:
{
    "phoneNumber": "+905551234567"
}

Response (200 OK):
{
    "success": true,
    "verificationSid": "VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "message": "Doğrulama kodu tekrar gönderildi"
}

Error Response (429):
{
    "success": false,
    "message": "Çok fazla deneme yaptınız. Lütfen bir süre bekleyin."
}
```

5. **Profil Güncelleme**
```http
PUT /users/profile
Auth: Bearer Token

Request:
{
    "firstName": "Yeni Ad",  // Opsiyonel
    "lastName": "Yeni Soyad",  // Opsiyonel
    "email": "yeni@email.com",  // Opsiyonel
    "birthDate": "1990-01-01",  // Opsiyonel
    "gender": "Erkek",  // Opsiyonel
    "avatar": "https://example.com/avatar.jpg"  // Opsiyonel
}

Response (200 OK):
{
    "success": true,
    "user": {
        "_id": "userId",
        "firstName": "Yeni Ad",
        "lastName": "Yeni Soyad",
        "email": "yeni@email.com",
        "birthDate": "1990-01-01T00:00:00.000Z",
        "gender": "Erkek",
        "avatar": "https://example.com/avatar.jpg",
        "role": "user",
        "status": "active"
    }
}

Error Response (400):
{
    "success": false,
    "message": "Geçersiz profil bilgileri",
    "errors": {
        "email": "Geçersiz email formatı"
    }
}
```

6. **Hesap Silme**
```http
DELETE /users/account
Auth: Bearer Token

Response (200 OK):
{
    "success": true,
    "message": "Hesap başarıyla silindi"
}

Error Response (403):
{
    "success": false,
    "message": "Aktif grup üyelikleri olan rehberler hesaplarını silemez"
}
```

7. **Cihaz Token'ı Güncelleme (Push Notifications)**
```http
POST /users/device-token
Auth: Bearer Token

Request:
{
    "token": "fcm_device_token",
    "platform": "ios"  // ["ios", "android"]
}

Response (200 OK):
{
    "success": true,
    "message": "Cihaz token'ı güncellendi"
}
```

### Admin İşlemleri

1. **Tüm Kullanıcıları Listeleme**
```http
GET /api/admin/users
Auth: Bearer Token (Admin)
Query Parameters:
  - page (optional): Sayfa numarası (default: 1)
  - limit (optional): Sayfa başına kullanıcı sayısı (default: 20)
  - status (optional): Kullanıcı durumu filtresi (active, blocked)
  - role (optional): Kullanıcı rolü filtresi (user, guide, admin)

Response (200 OK):
{
    "success": true,
    "users": [
        {
            "_id": "userId",
            "phoneNumber": "+905551234567",
            "firstName": "Ahmet",
            "lastName": "Yılmaz",
            "email": "ahmet@example.com",
            "role": "user",
            "status": "active",
            "createdAt": "2024-01-20T15:30:00.000Z",
            "lastLoginAt": "2024-01-20T15:30:00.000Z"
        }
    ],
    "pagination": {
        "total": 45,
        "page": 1,
        "pages": 3,
        "limit": 20
    }
}

Error Response (403):
{
    "success": false,
    "message": "Bu işlem için admin rolü gereklidir"
}
```

2. **Kullanıcı Durumu Güncelleme**
```http
PATCH /api/admin/users/{userId}/status
Auth: Bearer Token (Admin)

Request:
{
    "status": "blocked",  // active veya blocked
    "reason": "Kurallara aykırı davranış"  // status=blocked ise zorunlu
}

Response (200 OK):
{
    "success": true,
    "user": {
        "_id": "userId",
        "status": "blocked",
        "updatedAt": "2024-01-20T15:30:00.000Z"
    }
}

Error Response (400):
{
    "success": false,
    "message": "Bloke etme sebebi belirtilmelidir"
}

Error Response (404):
{
    "success": false,
    "message": "Kullanıcı bulunamadı"
}
```

3. **Rehberleri Listeleme**
```http
GET /api/admin/guides
Auth: Bearer Token (Admin)
Query Parameters:
  - page (optional): Sayfa numarası (default: 1)
  - limit (optional): Sayfa başına rehber sayısı (default: 20)
  - status (optional): Rehber durumu filtresi (active, blocked)
  - specialties (optional): Uzmanlık alanı filtresi (array)

Response (200 OK):
{
    "success": true,
    "guides": [
        {
            "_id": "userId",
            "firstName": "Mehmet",
            "lastName": "Demir",
            "phoneNumber": "+905551234567",
            "email": "mehmet@example.com",
            "status": "active",
            "guideInfo": {
                "languages": ["Türkçe", "İngilizce"],
                "specialties": ["Tarih", "Kültür"],
                "experience": 5,
                "license": {
                    "number": "TR-2024-001",
                    "expiryDate": "2025-01-20T00:00:00.000Z",
                    "isVerified": true
                }
            },
            "activeGroups": 2,
            "totalGroups": 15,
            "createdAt": "2024-01-20T15:30:00.000Z"
        }
    ],
    "pagination": {
        "total": 45,
        "page": 1,
        "pages": 3,
        "limit": 20
    }
}

Error Response (403):
{
    "success": false,
    "message": "Bu işlem için admin rolü gereklidir"
}
```

4. **Rehber Durumu Güncelleme**
```http
PATCH /api/admin/guides/{userId}/status
Auth: Bearer Token (Admin)

Request:
{
    "status": "blocked",  // active veya blocked
    "reason": "Lisans belgesi geçersiz"  // status=blocked ise zorunlu
}

Response (200 OK):
{
    "success": true,
    "guide": {
        "_id": "userId",
        "status": "blocked",
        "updatedAt": "2024-01-20T15:30:00.000Z"
    }
}

Error Response (400):
{
    "success": false,
    "message": "Bloke etme sebebi belirtilmelidir"
}

Error Response (404):
{
    "success": false,
    "message": "Rehber bulunamadı"
}

Error Response (409):
{
    "success": false,
    "message": "Aktif grupları olan rehber bloke edilemez"
}
```

## Grup İşlemleri (Groups)

### Yeni Grup Oluşturma
```http
POST /api/groups
Auth: Bearer Token (Rehber veya Admin rolü gerekli)

Request:
{
    "name": "Kapadokya Turu",  // Zorunlu
    "description": "3 günlük kültür turu",  // Opsiyonel
    "startDate": "2024-02-01T10:00:00.000Z",  // Opsiyonel
    "endDate": "2024-02-03T18:00:00.000Z"  // Opsiyonel
}

Response (200 OK):
{
    "success": true,
    "group": {
        "_id": "groupId",
        "name": "Kapadokya Turu",
        "description": "3 günlük kültür turu",
        "guide": {
            "_id": "userId",
            "firstName": "Mehmet",
            "lastName": "Demir",
            "phoneNumber": "+905551234567"
        },
        "members": [],
        "invitations": [],
        "startDate": "2024-02-01T10:00:00.000Z",
        "endDate": "2024-02-03T18:00:00.000Z",
        "isActive": true,
        "createdAt": "2024-01-20T15:30:00.000Z",
        "updatedAt": "2024-01-20T15:30:00.000Z"
    }
}

Error Response (403):
{
    "success": false,
    "message": "Grup oluşturmak için rehber veya admin rolü gereklidir"
}
```

### Grup Listesi
```http
GET /api/groups
Auth: Bearer Token

Response (200 OK):
{
    "success": true,
    "groups": [
        {
            "_id": "groupId",
            "name": "Kapadokya Turu",
            "guide": {
                "_id": "userId",
                "firstName": "Mehmet",
                "lastName": "Demir",
                "phoneNumber": "+905551234567"
            },
            "members": [
                {
                    "user": {
                        "_id": "userId",
                        "firstName": "Ahmet",
                        "lastName": "Yılmaz",
                        "phoneNumber": "+905559876543"
                    },
                    "status": "active",
                    "joinedAt": "2024-01-20T15:30:00.000Z"
                }
            ],
            "startDate": "2024-02-01T10:00:00.000Z",
            "endDate": "2024-02-03T18:00:00.000Z",
            "isActive": true
        }
    ]
}
```

### Grup Detayı
```http
GET /api/groups/{groupId}
Auth: Bearer Token

Response (200 OK):
{
    "success": true,
    "group": {
        "_id": "groupId",
        "name": "Kapadokya Turu",
        "description": "3 günlük kültür turu",
        "guide": {
            "_id": "userId",
            "firstName": "Mehmet",
            "lastName": "Demir",
            "phoneNumber": "+905551234567"
        },
        "members": [
            {
                "user": {
                    "_id": "userId",
                    "firstName": "Ahmet",
                    "lastName": "Yılmaz",
                    "phoneNumber": "+905559876543"
                },
                "status": "active",
                "joinedAt": "2024-01-20T15:30:00.000Z"
            }
        ],
        "invitations": [
            {
                "user": {
                    "_id": "userId",
                    "firstName": "Ayşe",
                    "lastName": "Kaya",
                    "phoneNumber": "+905557891234"
                },
                "status": "pending",
                "invitedAt": "2024-01-20T15:30:00.000Z",
                "expiresAt": "2024-01-21T15:30:00.000Z"
            }
        ],
        "startDate": "2024-02-01T10:00:00.000Z",
        "endDate": "2024-02-03T18:00:00.000Z",
        "isActive": true,
        "createdAt": "2024-01-20T15:30:00.000Z",
        "updatedAt": "2024-01-20T15:30:00.000Z"
    }
}

Error Response (404):
{
    "success": false,
    "message": "Grup bulunamadı"
}
```

### Gruba Üye Davet Etme
```http
POST /api/groups/{groupId}/invite
Auth: Bearer Token (Rehber rolü gerekli)

Request:
{
    "users": ["userId1", "userId2"]  // Davet edilecek kullanıcı ID'leri
}

Response (200 OK):
{
    "success": true,
    "invitations": [
        {
            "user": {
                "_id": "userId1",
                "firstName": "Ayşe",
                "lastName": "Kaya",
                "phoneNumber": "+905557891234"
            },
            "status": "pending",
            "invitedAt": "2024-01-20T15:30:00.000Z",
            "expiresAt": "2024-01-21T15:30:00.000Z"
        }
    ]
}

Error Response (403):
{
    "success": false,
    "message": "Davet göndermek için rehber rolü gereklidir"
}
```

### Grup Davetini Kabul Etme
```http
POST /api/groups/invitations/{groupId}/accept
Auth: Bearer Token

Response (200 OK):
{
    "success": true,
    "message": "Gruba başarıyla katıldınız"
}

Error Response (404):
{
    "success": false,
    "message": "Geçerli bir davet bulunamadı"
}

Error Response (400):
{
    "success": false,
    "message": "Davet süresi dolmuş"
}
```

### Grup Üyelerini Listeleme
```http
GET /api/groups/{groupId}/members
Auth: Bearer Token

Response (200 OK):
{
    "success": true,
    "members": [
        {
            "user": {
                "_id": "userId",
                "firstName": "Ahmet",
                "lastName": "Yılmaz",
                "phoneNumber": "+905559876543"
            },
            "status": "active",
            "joinedAt": "2024-01-20T15:30:00.000Z"
        }
    ]
}
```

### Gruptan Ayrılma
```http
POST /api/groups/{groupId}/leave
Auth: Bearer Token

Response (200 OK):
{
    "success": true,
    "message": "Gruptan başarıyla ayrıldınız"
}
```
- **Notlar**: 
  - Rehberler gruptan ayrılamaz
  - Sadece aktif üyeler gruptan ayrılabilir

### Grup Silme
```http
DELETE /api/groups/{groupId}
Auth: Bearer Token (Rehber veya Admin rolü gerekli)

Response (200 OK):
{
    "success": true,
    "message": "Grup başarıyla silindi"
}
```
- **Notlar**:
  - Aktif üyeleri olan gruplar silinemez
  - Silme işlemi soft delete şeklinde yapılır (`isActive: false`)

## Mesajlaşma İşlemleri (Messages)

### Grup Mesajlarını Getir

Belirtilen grubun mesajlarını getirir.

```http
GET /api/messages/groups/{groupId}/messages
```

### Parametreler

| Parametre | Tip | Konum | Zorunlu | Açıklama |
|-----------|-----|--------|----------|-----------|
| groupId | string | path | evet | Grup ID |
| lastSyncTime | string | query | hayır | Son senkronizasyon zamanı (ISO 8601 formatında) |

### Başarılı Yanıt

```json
{
  "success": true,
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "localMessageId": "client-123",
      "groupId": "507f1f77bcf86cd799439012",
      "sender": {
        "_id": "507f1f77bcf86cd799439013",
        "firstName": "John",
        "lastName": "Doe",
        "phoneNumber": "+905551234567"
      },
      "content": "Merhaba!",
      "type": "text",
      "status": "sent",
      "sentAt": "2024-01-20T10:00:00.000Z",
      "syncedAt": "2024-01-20T10:00:01.000Z",
      "readBy": ["507f1f77bcf86cd799439013"]
    }
  ]
}
```

### Hata Yanıtları

| HTTP Kodu | Hata Kodu | Açıklama |
|-----------|-----------|-----------|
| 401 | UNAUTHORIZED | Kimlik doğrulama hatası |
| 403 | FORBIDDEN | Yetkilendirme hatası |
| 404 | NOT_FOUND | Grup bulunamadı |

## Mesajları Senkronize Et

Yerel mesajları sunucu ile senkronize eder.

```http
POST /api/messages/sync
```

### İstek Gövdesi

```json
{
  "messages": [
    {
      "localMessageId": "client-123",
      "groupId": "507f1f77bcf86cd799439012",
      "content": "Merhaba!",
      "type": "text",
      "sentAt": "2024-01-20T10:00:00.000Z"
    }
  ]
}
```

### Başarılı Yanıt

```json
{
  "success": true,
  "syncedMessages": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "localMessageId": "client-123",
      "groupId": "507f1f77bcf86cd799439012",
      "sender": {
        "_id": "507f1f77bcf86cd799439013",
        "firstName": "John",
        "lastName": "Doe"
      },
      "content": "Merhaba!",
      "type": "text",
      "status": "sent",
      "sentAt": "2024-01-20T10:00:00.000Z",
      "syncedAt": "2024-01-20T10:00:01.000Z"
    }
  ]
}
```

### Hata Yanıtları

| HTTP Kodu | Hata Kodu | Açıklama |
|-----------|-----------|-----------|
| 400 | INVALID_REQUEST | Geçersiz istek |
| 401 | UNAUTHORIZED | Kimlik doğrulama hatası |
| 403 | FORBIDDEN | Yetkilendirme hatası |

## Mesajları Okundu Olarak İşaretle

Belirtilen mesajları okundu olarak işaretler.

```http
POST /api/messages/read
```

### İstek Gövdesi

```json
{
  "messageIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
}
```

### Başarılı Yanıt

```json
{
  "success": true,
  "message": "Mesajlar okundu olarak işaretlendi"
}
```

### Hata Yanıtları

| HTTP Kodu | Hata Kodu | Açıklama |
|-----------|-----------|-----------|
| 400 | INVALID_REQUEST | Geçersiz istek |
| 401 | UNAUTHORIZED | Kimlik doğrulama hatası |
| 403 | FORBIDDEN | Yetkilendirme hatası |

## Hata Durumları

Tüm endpoint'ler için olası hata durumları:

### 400 Bad Request
```json
{
    "success": false,
    "message": "Hata mesajı",
    "errors": {
        "field": "Hata açıklaması"
    }
}
```

### 401 Unauthorized
```json
{
    "success": false,
    "message": "Token geçersiz veya süresi dolmuş"
}
```

### 403 Forbidden
```json
{
    "success": false,
    "message": "Bu işlem için yetkiniz yok"
}
```

### 404 Not Found
```json
{
    "success": false,
    "message": "Kaynak bulunamadı"
}
```

### 429 Too Many Requests
```json
{
    "success": false,
    "message": "Çok fazla istek yapıldı. Lütfen bekleyin.",
    "retryAfter": 60  // Saniye cinsinden bekleme süresi
}
```

### 500 Internal Server Error
```json
{
    "success": false,
    "message": "Sunucu hatası",
    "error": "Hata detayı"  // Sadece development ortamında gönderilir
}
```

## Admin Endpoints

### Kullanıcı Yönetimi

#### GET /api/admin/users
Tüm kullanıcıları listeler ve filtreleme imkanı sunar.

**Query Parameters:**
- `search` (string, optional): İsim, soyisim veya telefon numarasına göre arama
- `role` (string, optional): Rol filtreleme (user, guide, admin)
- `status` (string, optional): Durum filtreleme (active, blocked)
- `page` (integer, default: 1): Sayfa numarası
- `limit` (integer, default: 20, max: 100): Sayfa başına kayıt sayısı

**Response:**
```json
{
    "success": true,
    "users": [
        {
            "_id": "string",
            "phoneNumber": "string",
            "firstName": "string",
            "lastName": "string",
            "email": "string",
            "role": "string",
            "status": "string",
            "createdAt": "date"
        }
    ],
    "pagination": {
        "total": "integer",
        "page": "integer",
        "pages": "integer",
        "limit": "integer"
    }
}
```

#### GET /api/admin/users/{userId}
Belirli bir kullanıcının detaylı bilgilerini görüntüler.

**Path Parameters:**
- `userId` (string, required): Kullanıcı ID'si

**Response:**
```json
{
    "success": true,
    "user": {
        "_id": "string",
        "phoneNumber": "string",
        "firstName": "string",
        "lastName": "string",
        "email": "string",
        "role": "string",
        "status": "string",
        "createdAt": "date",
        "updatedAt": "date",
        "lastLogin": "date",
        "blockReason": "string"
    }
}
```

#### PATCH /api/admin/users/{userId}/role
Kullanıcının rolünü günceller.

**Path Parameters:**
- `userId` (string, required): Kullanıcı ID'si

**Request Body:**
```json
{
    "role": "string" // Possible values: user, guide, admin
}
```

**Response:**
```json
{
    "success": true,
    "user": {
        "_id": "string",
        "role": "string",
        "updatedAt": "date"
    }
}
```

#### PATCH /api/admin/users/{userId}/status
Kullanıcının durumunu günceller.

**Path Parameters:**
- `userId` (string, required): Kullanıcı ID'si

**Request Body:**
```json
{
    "status": "string", // Possible values: active, blocked
    "reason": "string"  // Required when status is blocked
}
```

**Response:**
```json
{
    "success": true,
    "user": {
        "_id": "string",
        "status": "string",
        "updatedAt": "date"
    }
}
```

### Rehber Yönetimi

#### GET /api/admin/guides/pending
Onay bekleyen rehberleri listeler.

**Query Parameters:**
- `page` (integer, default: 1): Sayfa numarası
- `limit` (integer, default: 20, max: 100): Sayfa başına kayıt sayısı

**Response:**
```json
{
    "success": true,
    "guides": [
        {
            "_id": "string",
            "firstName": "string",
            "lastName": "string",
            "phoneNumber": "string",
            "email": "string",
            "status": "string",
            "guideInfo": {
                "experience": "number",
                "languages": ["string"],
                "certifications": ["string"]
            },
            "createdAt": "date"
        }
    ],
    "pagination": {
        "total": "integer",
        "page": "integer",
        "pages": "integer",
        "limit": "integer"
    }
}
```

#### POST /api/admin/guides/{guideId}/approve
Rehber başvurusunu onaylar.

**Path Parameters:**
- `guideId` (string, required): Rehber ID'si

**Response:**
```json
{
    "success": true,
    "guide": {
        "_id": "string",
        "approvalStatus": "string",
        "updatedAt": "date"
    }
}
```

#### POST /api/admin/guides/{guideId}/reject
Rehber başvurusunu reddeder.

**Path Parameters:**
- `guideId` (string, required): Rehber ID'si

**Request Body:**
```json
{
    "reason": "string" // Ret sebebi
}
```

**Response:**
```json
{
    "success": true,
    "guide": {
        "_id": "string",
        "approvalStatus": "string",
        "updatedAt": "date"
    }
}
```

### Grup Yönetimi

#### GET /api/admin/groups
Tüm grupları listeler ve filtreleme imkanı sunar.

**Query Parameters:**
- `search` (string, optional): Grup adına göre arama
- `guideId` (string, optional): Rehbere göre filtreleme
- `status` (string, optional): Durum filtreleme (active, inactive)
- `page` (integer, default: 1): Sayfa numarası
- `limit` (integer, default: 20, max: 100): Sayfa başına kayıt sayısı

**Response:**
```json
{
    "success": true,
    "groups": [
        {
            "_id": "string",
            "name": "string",
            "description": "string",
            "guide": {
                "_id": "string",
                "firstName": "string",
                "lastName": "string"
            },
            "memberCount": "integer",
            "status": "string",
            "createdAt": "date"
        }
    ],
    "pagination": {
        "total": "integer",
        "page": "integer",
        "pages": "integer",
        "limit": "integer"
    }
}
```

#### GET /api/admin/groups/{groupId}
Belirli bir grubun detaylı bilgilerini görüntüler.

**Path Parameters:**
- `groupId` (string, required): Grup ID'si

**Response:**
```json
{
    "success": true,
    "group": {
        "_id": "string",
        "name": "string",
        "description": "string",
        "guide": {
            "_id": "string",
            "firstName": "string",
            "lastName": "string",
            "phoneNumber": "string",
            "email": "string"
        },
        "members": [
            {
                "_id": "string",
                "firstName": "string",
                "lastName": "string",
                "phoneNumber": "string"
            }
        ],
        "status": "string",
        "createdAt": "date",
        "updatedAt": "date"
    }
}
```

#### PATCH /api/admin/groups/{groupId}/status
Grubun durumunu günceller.

**Path Parameters:**
- `groupId` (string, required): Grup ID'si

**Request Body:**
```json
{
    "status": "string", // Possible values: active, inactive
    "reason": "string"  // Required when status is inactive
}
```

**Response:**
```json
{
    "success": true,
    "group": {
        "_id": "string",
        "status": "string",
        "updatedAt": "date"
    }
}
```

### İstatistik ve Raporlama Endpoint'leri

#### GET /api/admin/statistics/system
Genel sistem istatistiklerini getirir.

**Query Parameters:**
- `startDate` (string, optional): Başlangıç tarihi (YYYY-MM-DD formatında)
- `endDate` (string, optional): Bitiş tarihi (YYYY-MM-DD formatında)

**Response:**
```json
{
    "success": true,
    "statistics": {
        "totalUsers": "integer",
        "activeUsers": "integer",
        "totalGuides": "integer",
        "activeGuides": "integer",
        "totalGroups": "integer",
        "activeGroups": "integer",
        "totalMessages": "integer",
        "averageGroupSize": "number",
        "averageMessagesPerGroup": "number",
        "dailyActiveUsers": "integer",
        "monthlyActiveUsers": "integer"
    }
}
```

#### GET /api/admin/reports/activity
Belirli bir tarih aralığı için detaylı aktivite raporu oluşturur.

**Query Parameters:**
- `startDate` (string, required): Başlangıç tarihi (YYYY-MM-DD formatında)
- `endDate` (string, required): Bitiş tarihi (YYYY-MM-DD formatında)
- `type` (string, optional): Rapor periyodu (daily, weekly, monthly)

**Response:**
```json
{
    "success": true,
    "report": [
        {
            "date": "date",
            "newUsers": "integer",
            "activeUsers": "integer",
            "newGroups": "integer",
            "totalMessages": "integer",
            "activeGroups": "integer"
        }
    ]
}
```

#### GET /api/admin/metrics/performance
Sistemin genel performans metriklerini ve sağlık durumunu getirir.

**Response:**
```json
{
    "success": true,
    "metrics": {
        "responseTime": {
            "average": "number", // Son 5 dakikadaki ortalama yanıt süresi (ms)
            "current": "number", // Mevcut istek yanıt süresi (ms)
            "max": "number",     // Son 5 dakikadaki maksimum yanıt süresi (ms)
            "min": "number"      // Son 5 dakikadaki minimum yanıt süresi (ms)
        },
        "memoryUsage": {
            "total": "number",   // Toplam bellek (MB)
            "used": "number",    // Kullanılan bellek (MB)
            "free": "number"     // Boş bellek (MB)
        },
        "databaseMetrics": {
            "connections": "number",      // Aktif veritabanı bağlantı sayısı
            "activeQueries": "number",    // Aktif sorgu sayısı
            "averageQueryTime": "number"  // Ortalama sorgu süresi
        },
        "systemLoad": {
            "current": "number", // Anlık sistem yükü
            "average": "number"  // Ortalama sistem yükü (son 5 dakika)
        },
        "uptime": "number"      // Sistem çalışma süresi (saniye)
    }
}
```

### Bildirim Yönetimi

#### POST /api/admin/notifications
Sistem bildirimi gönderir.

**Request Body:**
```json
{
    "recipients": ["string"], // Opsiyonel. Boş bırakılırsa tüm kullanıcılara gönderilir
    "title": "string",
    "message": "string",
    "type": "string", // system_alert, guide_approval, guide_rejection, user_block, user_unblock
    "expiresIn": "number" // Saat cinsinden, varsayılan: 720 (30 gün)
}
```

**Response:**
```json
{
    "success": true,
    "sentCount": "integer"
}
```

#### GET /api/admin/notifications
Bildirimleri listeler.

**Query Parameters:**
- `type` (string, optional): Bildirim tipi filtresi
- `startDate` (string, optional): Başlangıç tarihi (YYYY-MM-DD formatında)
- `endDate` (string, optional): Bitiş tarihi (YYYY-MM-DD formatında)
- `page` (integer, default: 1): Sayfa numarası
- `limit` (integer, default: 20): Sayfa başına kayıt sayısı

**Response:**
```json
{
    "success": true,
    "notifications": [
        {
            "_id": "string",
            "type": "string",
            "title": "string",
            "message": "string",
            "recipient": {
                "_id": "string",
                "firstName": "string",
                "lastName": "string"
            },
            "isRead": "boolean",
            "createdAt": "date",
            "expiresAt": "date"
        }
    ],
    "pagination": {
        "total": "integer",
        "page": "integer",
        "pages": "integer",
        "limit": "integer"
    }
}
```

#### DELETE /api/admin/notifications/{notificationId}
Bildirimi siler.

**Path Parameters:**
- `notificationId` (string, required): Bildirim ID'si

**Response:**
```json
{
    "success": true
}
```

### Sistem Yönetimi

#### GET /api/admin/system/logs
Sistem loglarını filtreler ve listeler.

**Query Parameters:**
- `level` (string, optional): Log seviyesi filtresi (info, warning, error, critical)
- `category` (string, optional): Log kategorisi filtresi (system, auth, database, api, bluetooth, notification)
- `startDate` (string, optional): Başlangıç tarihi (YYYY-MM-DD formatında)
- `endDate` (string, optional): Bitiş tarihi (YYYY-MM-DD formatında)
- `resolved` (boolean, optional): Çözülmüş/çözülmemiş log filtresi
- `page` (integer, default: 1): Sayfa numarası
- `limit` (integer, default: 20): Sayfa başına kayıt sayısı

**Response:**
```json
{
    "success": true,
    "logs": [
        {
            "_id": "string",
            "level": "string",
            "category": "string",
            "message": "string",
            "details": "object",
            "source": "string",
            "timestamp": "date",
            "resolved": "boolean",
            "resolvedAt": "date",
            "resolvedBy": {
                "_id": "string",
                "firstName": "string",
                "lastName": "string"
            },
            "resolution": "string"
        }
    ],
    "pagination": {
        "total": "integer",
        "page": "integer",
        "pages": "integer",
        "limit": "integer"
    }
}
```

#### PATCH /api/admin/system/logs/{logId}/resolve
Sistem logunu çözüldü olarak işaretler.

**Path Parameters:**
- `logId` (string, required): Log ID'si

**Request Body:**
```json
{
    "resolution": "string" // Çözüm açıklaması
}
```

**Response:**
```json
{
    "success": true,
    "log": {
        "_id": "string",
        "resolved": "boolean",
        "resolvedAt": "date",
        "resolution": "string"
    }
}
```

#### GET /api/admin/system/settings
Sistem ayarlarını kategorilere göre getirir.

**Query Parameters:**
- `category` (string, optional): Ayar kategorisi filtresi (general, security, notification, performance, maintenance)

**Response:**
```json
{
    "success": true,
    "settings": [
        {
            "key": "string",
            "value": "object",
            "category": "string",
            "description": "string",
            "updatedAt": "date",
            "updatedBy": {
                "_id": "string",
                "firstName": "string",
                "lastName": "string"
            }
        }
    ]
}
```

#### PATCH /api/admin/system/settings/{key}
Sistem ayarının değerini günceller.

**Path Parameters:**
- `key` (string, required): Ayar anahtarı

**Request Body:**
```json
{
    "value": "object" // Ayarın yeni değeri
}
```

**Response:**
```json
{
    "success": true,
    "setting": {
        "key": "string",
        "value": "object",
        "updatedAt": "date"
    }
}
```

## Performans Metrikleri

### Sistem Metrikleri

**Endpoint:** `GET /api/admin/metrics/system`

Sistem performans metriklerini getirir.

**Yetkilendirme:** Admin token gerekli

**Başarılı Yanıt:**
```json
{
    "success": true,
    "data": {
        "system": {
            "uptime": 123456,
            "memory": {
                "total": 8589934592,
                "free": 4294967296,
                "used": 4294967296,
                "usagePercentage": 50
            },
            "cpu": {
                "loadAverage": [1.5, 1.2, 0.9],
                "cores": 8
            },
            "platform": "darwin",
            "arch": "x64"
        },
        "mongodb": {
            "status": "connected",
            "collections": 10,
            "connectionPoolSize": 5
        }
    }
}
```

### Uygulama Metrikleri

**Endpoint:** `GET /api/admin/metrics/application`

Uygulama kullanım metriklerini getirir.

**Yetkilendirme:** Admin token gerekli

**Başarılı Yanıt:**
```json
{
    "success": true,
    "data": {
        "users": {
            "total": 1000,
            "active": 500,
            "activePercentage": 50
        },
        "groups": {
            "total": 100,
            "active": 80,
            "activePercentage": 80
        },
        "messages": {
            "daily": 5000,
            "weekly": 30000,
            "averagePerDay": 4285.71
        },
        "bluetooth": {
            "successRate": 98.5,
            "total": 1000,
            "success": 985
        }
    }
}
```

### Hata Metrikleri

**Endpoint:** `GET /api/admin/metrics/errors`

Sistem hata metriklerini getirir.

**Yetkilendirme:** Admin token gerekli

**Başarılı Yanıt:**
```json
{
    "success": true,
    "data": {
        "summary": {
            "total": 100,
            "unresolved": 20
        },
        "byLevel": [
            {
                "_id": "error",
                "categories": [
                    {
                        "category": "bluetooth",
                        "count": 30,
                        "unresolvedCount": 5
                    },
                    {
                        "category": "database",
                        "count": 20,
                        "unresolvedCount": 3
                    }
                ],
                "totalCount": 50,
                "totalUnresolved": 8
            }
        ],
        "commonErrors": [
            {
                "message": "Bluetooth bağlantı hatası",
                "count": 25,
                "category": "bluetooth",
                "level": "error",
                "lastOccurrence": "2024-01-20T10:30:00Z"
            }
        ]
    }
}
```

## Admin Panel API Endpoints

### Metrik İşlemleri

1. **Sistem Metrikleri**
```http
GET /api/admin/metrics/system
Auth: Bearer Token (Admin)

Response (200 OK):
{
    "success": true,
    "metrics": {
        "system": {
            "uptime": 123456,
            "memory": {
                "total": 16000000000,
                "free": 8000000000,
                "used": 8000000000,
                "usagePercentage": 50
            },
            "cpu": {
                "loadAverage": [1.5, 1.2, 1.0],
                "cores": 8
            },
            "platform": "darwin",
            "arch": "x64"
        },
        "mongodb": {
            "status": "connected",
            "collections": 10,
            "connectionPoolSize": 5
        }
    }
}
```

2. **Uygulama Metrikleri**
```http
GET /api/admin/metrics/application
Auth: Bearer Token (Admin)

Response (200 OK):
{
    "success": true,
    "metrics": {
        "users": {
            "total": 1000,
            "active": 800,
            "dailyActive": 200,
            "monthlyActive": 600
        },
        "groups": {
            "total": 50,
            "active": 30
        },
        "messages": {
            "daily": 5000,
            "weekly": 30000
        },
        "bluetooth": {
            "successRate": 95.5
        }
    }
}
```

3. **Hata Metrikleri**
```http
GET /api/admin/metrics/errors
Auth: Bearer Token (Admin)

Response (200 OK):
{
    "success": true,
    "metrics": {
        "total": 100,
        "unresolved": 20,
        "byCategory": {
            "bluetooth": 30,
            "database": 20,
            "api": 50
        },
        "byLevel": {
            "error": 60,
            "warning": 30,
            "critical": 10
        },
        "mostCommon": [
            {
                "message": "Bluetooth connection failed",
                "count": 25
            }
        ]
    }
}
```

### Sistem Yönetimi

1. **Sistem Logları Listeleme**
```http
GET /api/admin/system/logs
Auth: Bearer Token (Admin)

Query Parameters:
- level: string (info, warning, error, critical)
- category: string (system, auth, database, api, bluetooth, notification)
- startDate: string (ISO 8601)
- endDate: string (ISO 8601)
- resolved: boolean
- page: number (default: 1)
- limit: number (default: 20)

Response (200 OK):
{
    "success": true,
    "logs": [
        {
            "_id": "logId",
            "level": "error",
            "category": "bluetooth",
            "message": "Connection failed",
            "details": {},
            "source": "BluetoothService",
            "timestamp": "2024-01-15T10:00:00.000Z",
            "resolved": false
        }
    ],
    "pagination": {
        "total": 100,
        "page": 1,
        "pages": 5,
        "limit": 20
    }
}
```

2. **Log Çözüldü Olarak İşaretleme**
```http
PATCH /api/admin/system/logs/{logId}/resolve
Auth: Bearer Token (Admin)

Request:
{
    "resolution": "Sorun çözüldü açıklaması"
}

Response (200 OK):
{
    "success": true,
    "log": {
        "_id": "logId",
        "resolved": true,
        "resolvedAt": "2024-01-15T10:00:00.000Z",
        "resolution": "Sorun çözüldü açıklaması"
    }
}
```

3. **Sistem Ayarları Listeleme**
```http
GET /api/admin/system/settings
Auth: Bearer Token (Admin)

Query Parameters:
- category: string (general, security, notification, performance, maintenance)

Response (200 OK):
{
    "success": true,
    "settings": [
        {
            "key": "maxGroupSize",
            "value": 100,
            "category": "general",
            "description": "Maksimum grup üye sayısı",
            "updatedAt": "2024-01-15T10:00:00.000Z"
        }
    ]
}
```

4. **Sistem Ayarı Güncelleme**
```http
PATCH /api/admin/system/settings/{key}
Auth: Bearer Token (Admin)

Request:
{
    "value": "yeni_değer"
}

Response (200 OK):
{
    "success": true,
    "setting": {
        "key": "maxGroupSize",
        "value": "yeni_değer",
        "updatedAt": "2024-01-15T10:00:00.000Z"
    }
}
```

### Bildirim Yönetimi

1. **Bildirim Gönderme**
```http
POST /api/admin/notifications
Auth: Bearer Token (Admin)

Request:
{
    "recipients": ["userId1", "userId2"],  // Boş bırakılırsa tüm kullanıcılara gönderilir
    "title": "Bildirim Başlığı",
    "message": "Bildirim Mesajı",
    "type": "system_alert",  // system_alert, guide_approval, guide_rejection, user_block, user_unblock
    "expiresIn": 720  // Saat cinsinden, varsayılan: 720 (30 gün)
}

Response (200 OK):
{
    "success": true,
    "sentCount": 2
}
```

2. **Bildirimleri Listeleme**
```http
GET /api/admin/notifications
Auth: Bearer Token (Admin)

Query Parameters:
- type: string
- startDate: string (ISO 8601)
- endDate: string (ISO 8601)
- page: number (default: 1)
- limit: number (default: 20)

Response (200 OK):
{
    "success": true,
    "notifications": [
        {
            "_id": "notificationId",
            "type": "system_alert",
            "title": "Bildirim Başlığı",
            "message": "Bildirim Mesajı",
            "recipient": {
                "_id": "string",
                "firstName": "string",
                "lastName": "string"
            },
            "isRead": false,
            "createdAt": "date",
            "expiresAt": "date"
        }
    ],
    "pagination": {
        "total": "integer",
        "page": "integer",
        "pages": "integer",
        "limit": "integer"
    }
}
```

### Raporlama

1. **Aktivite Raporu**
```http
GET /api/admin/reports/activity
Auth: Bearer Token (Admin)

Query Parameters:
- startDate: string (ISO 8601) (Zorunlu)
- endDate: string (ISO 8601) (Zorunlu)
- type: string (daily, weekly, monthly)

Response (200 OK):
{
    "success": true,
    "report": [
        {
            "date": "2024-01-15T00:00:00.000Z",
            "newUsers": 50,
            "activeUsers": 200,
            "newGroups": 5,
            "totalMessages": 1000,
            "activeGroups": 30
        }
    ]
}
```

2. **Kullanıcı Aktivite Raporu**
```http
GET /api/admin/reports/user-activity
Auth: Bearer Token (Admin)

Query Parameters:
- userId: string (Zorunlu)
- startDate: string (ISO 8601)
- endDate: string (ISO 8601)

Response (200 OK):
{
    "success": true,
    "report": {
        "user": {
            "_id": "userId",
            "firstName": "Ahmet",
            "lastName": "Yılmaz"
        },
        "totalGroups": 10,
        "activeGroups": 5,
        "totalMessages": 500,
        "lastLoginAt": "2024-01-15T10:00:00.000Z",
        "completedTours": 5,
        "totalTimeInSystem": 30  // Gün cinsinden
    }
}
```

3. **Grup Aktivite Raporu**
```http
GET /api/admin/reports/group-activity
Auth: Bearer Token (Admin)

Query Parameters:
- groupId: string (Zorunlu)
- startDate: string (ISO 8601)
- endDate: string (ISO 8601)

Response (200 OK):
{
    "success": true,
    "report": {
        "group": {
            "_id": "groupId",
            "name": "Grup Adı"
        },
        "totalMembers": 50,
        "activeMembers": 30,
        "totalMessages": 1000,
        "messagesByDate": [
            {
                "date": "2024-01-15",
                "count": 100
            }
        ],
        "lastActivityAt": "2024-01-15T10:00:00.000Z"
    }
}
```