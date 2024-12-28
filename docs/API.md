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

### Grup Mesajlarını Getirme
```http
GET /api/messages/groups/{groupId}/messages
Auth: Bearer Token

Response (200 OK):
{
    "success": true,
    "messages": [
        {
            "_id": "messageId",
            "localMessageId": "localMessageId",
            "groupId": "groupId",
            "sender": {
                "_id": "userId",
                "firstName": "Ahmet",
                "lastName": "Yılmaz",
                "phoneNumber": "+905551234567"
            },
            "content": "Mesaj içeriği",
            "type": "text",
            "status": "sent",
            "sentAt": "2024-01-20T15:30:00.000Z",
            "syncedAt": "2024-01-20T15:30:00.000Z",
            "metadata": {}
        }
    ]
}
```

### Mesajları Senkronize Etme
```http
POST /api/messages/sync
Auth: Bearer Token

Request:
{
    "messages": [
        {
            "localMessageId": "localMessageId",
            "groupId": "groupId",
            "content": "Mesaj içeriği",
            "type": "text",
            "sentAt": "2024-01-20T15:30:00.000Z",
            "metadata": {}
        }
    ]
}

Response (200 OK):
{
    "success": true,
    "syncedMessages": [
        {
            "_id": "messageId",
            "localMessageId": "localMessageId",
            "groupId": "groupId",
            "sender": {
                "_id": "userId",
                "firstName": "Ahmet",
                "lastName": "Yılmaz",
                "phoneNumber": "+905551234567"
            },
            "content": "Mesaj içeriği",
            "type": "text",
            "status": "sent",
            "sentAt": "2024-01-20T15:30:00.000Z",
            "syncedAt": "2024-01-20T15:30:00.000Z",
            "metadata": {}
        }
    ]
}
```

### Mesajları Okundu Olarak İşaretleme
```http
POST /api/messages/read
Auth: Bearer Token

Request:
{
    "messageIds": ["messageId1", "messageId2"],  // Okundu olarak işaretlenecek mesaj ID'leri
    "groupId": "groupId"  // Mesajların ait olduğu grup ID'si
}

Response (200 OK):
{
    "success": true,
    "readAt": "2024-01-20T15:30:00.000Z"
}

Error Response (400):
{
    "success": false,
    "message": "Geçersiz mesaj ID'leri"
}
```

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