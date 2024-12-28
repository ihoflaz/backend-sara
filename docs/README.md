# SA-RA Tour Guide API Dokümantasyonu

## Başlangıç

API dokümantasyonunu görüntülemek ve test etmek için iki yöntem sunuyoruz:

### 1. Swagger UI (Önerilen)

1. Projeyi klonlayın
2. Gerekli bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
3. Sunucuyu başlatın:
   ```bash
   npm run dev
   ```
4. Tarayıcınızda şu adresi açın:
   ```
   http://localhost:3000/api-docs
   ```

### 2. Postman Koleksiyonu

`postman` klasöründe bulunan JSON dosyasını Postman'e import ederek tüm endpoint'leri test edebilirsiniz.

## API Endpoint'leri

### Kimlik Doğrulama (Auth)
- `POST /api/users/check-phone`: Telefon numarası kontrolü ve SMS doğrulama
- `POST /api/users/verify-code`: SMS kodu doğrulama ve giriş
- `POST /api/auth/refresh-token`: Access token yenileme

### Kullanıcı İşlemleri (Users)
- `POST /api/users/complete-registration`: Kayıt tamamlama
- `GET /api/users/profile`: Profil bilgilerini getirme
- `PUT /api/users/profile`: Profil güncelleme
- `POST /api/users/device-token`: Cihaz token güncelleme

### Grup İşlemleri (Groups)
- `POST /api/groups`: Yeni grup oluşturma
- `GET /api/groups`: Grup listesi
- `GET /api/groups/{groupId}`: Grup detayı
- `POST /api/groups/{groupId}/invite`: Gruba üye davet etme
- `POST /api/groups/invitations/{groupId}/accept`: Grup davetini kabul etme
- `POST /api/groups/{groupId}/leave`: Gruptan ayrılma
- `DELETE /api/groups/{groupId}`: Grup silme

### Mesajlaşma (Messages)
- `GET /api/messages/groups/{groupId}/messages`: Grup mesajlarını getirme
- `POST /api/messages/sync`: Mesajları senkronize etme
- `POST /api/messages/read`: Mesajları okundu olarak işaretleme

## Hata Kodları

Tüm endpoint'ler aşağıdaki hata kodlarını döndürebilir:

- `400`: Geçersiz istek
- `401`: Yetkisiz erişim
- `403`: Erişim engellendi
- `404`: Kaynak bulunamadı
- `500`: Sunucu hatası

## Modeller

Detaylı model şemaları için Swagger UI dokümantasyonunu inceleyebilirsiniz.

## Güvenlik

- Tüm istekler HTTPS üzerinden yapılmalıdır
- Auth gerektiren endpoint'ler için Bearer token kullanılmalıdır
- Token'lar 1 saat geçerlidir, süresi dolduğunda refresh token ile yenilenmelidir

## İletişim

API ile ilgili sorularınız için:
- Email: [API destek email adresi]
- Slack: #api-support kanalı 