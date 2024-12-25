# Messaging App Backend

Bu proje, SMS doğrulama özelliği ile güvenli bir mesajlaşma uygulamasının backend servisidir. Node.js, Express.js ve MongoDB kullanılarak geliştirilmiştir.

## Özellikler

- 📱 SMS ile telefon numarası doğrulama
- 👤 Kullanıcı kaydı ve profil yönetimi
- 🔒 Güvenli kimlik doğrulama
- 📦 MongoDB ile veri depolama
- ☁️ Vercel ile deployment

## Teknolojiler

- Node.js
- Express.js
- MongoDB Atlas
- Twilio (SMS servisi)
- Vercel (Deployment)

## Kurulum

1. Repoyu klonlayın:
```bash
git clone [repo-url]
cd [repo-directory]
```

2. Gerekli paketleri yükleyin:
```bash
npm install
```

3. `.env` dosyasını oluşturun ve gerekli değişkenleri ekleyin:
```env
# Twilio Credentials
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_SERVICE_SID=your_service_sid

# MongoDB Atlas Connection
MONGODB_URI=your_mongodb_connection_string

# Server Configuration
PORT=5001
NODE_ENV=development
```

4. Uygulamayı başlatın:
```bash
npm start
```

## API Endpoints

### Kullanıcı İşlemleri

- `POST /api/users/check-phone`: Telefon numarası kontrolü ve SMS doğrulama kodu gönderimi
  - Request: `{ "phoneNumber": "+905xxxxxxxxx" }`
  - Response: `{ "success": true, "exists": false, "verificationSid": "xxx", "message": "Doğrulama kodu gönderildi" }`

- `POST /api/users/verify-code`: SMS doğrulama kodunun kontrolü
  - Request: `{ "phoneNumber": "+905xxxxxxxxx", "code": "123456" }`
  - Response: `{ "success": true, "isRegistered": false, "message": "Doğrulama başarılı" }`

- `POST /api/users/complete-registration`: Kullanıcı kaydının tamamlanması
  - Request: 
    ```json
    {
      "phoneNumber": "+905xxxxxxxxx",
      "firstName": "Ad",
      "lastName": "Soyad",
      "email": "ornek@email.com",
      "birthDate": "1990-01-01",
      "gender": "Erkek"
    }
    ```
  - Response: `{ "success": true, "user": {...}, "message": "Kayıt başarıyla tamamlandı" }`

## Deployment

### Vercel Deployment Adımları

1. Vercel'de yeni proje oluşturun
2. GitHub reponuzu bağlayın
3. Environment variables'ları ayarlayın:
   - `MONGODB_URI`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_SERVICE_SID`
   - `NODE_ENV=production`
4. Build ayarlarını yapılandırın:
   - Build Command: `npm run build`
   - Output Directory: `.`
   - Install Command: `npm install`

### MongoDB Atlas Ayarları

1. MongoDB Atlas'ta yeni bir cluster oluşturun
2. Database Access'den kullanıcı oluşturun
3. Network Access'den `0.0.0.0/0` IP adresini whitelist'e ekleyin
4. Connection string'i alın ve Vercel'de environment variable olarak ekleyin

## Güvenlik Önlemleri

- Tüm hassas bilgiler environment variables'da saklanır
- CORS politikaları yapılandırılmıştır
- SMS doğrulaması ile güvenli kullanıcı kaydı
- MongoDB bağlantısı için retry mekanizması
- Hata durumlarında otomatik yeniden bağlanma

## Hata Ayıklama

### Yaygın Hatalar ve Çözümleri

1. MongoDB Bağlantı Hataları:
   - IP whitelist kontrolü
   - Connection string formatı kontrolü
   - Veritabanı kullanıcı izinleri kontrolü

2. SMS Doğrulama Hataları:
   - Twilio credentials kontrolü
   - Telefon numarası format kontrolü
   - Servis SID kontrolü

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
