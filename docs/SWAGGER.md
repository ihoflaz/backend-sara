# Swagger UI Kullanım Kılavuzu

## Erişim

API dokümantasyonuna erişmek için:

1. Sunucuyu başlatın: `npm start`
2. Tarayıcınızda şu adresi açın: `http://localhost:5001/api-docs`

## Swagger UI Özellikleri

### 1. Endpoint Grupları
API endpoint'leri şu kategorilerde gruplandırılmıştır:
- Auth: Token yönetimi ve yetkilendirme işlemleri
- Users: Kullanıcı kaydı ve profil yönetimi
- Groups: Tur grubu oluşturma ve yönetimi
- Messages: Mesaj senkronizasyonu ve grup mesajları
- Admin: Yönetici işlemleri

### 2. Endpoint Detayları
Her endpoint için:
- HTTP metodu (GET, POST, PATCH, vb.)
- URL yapısı
- Gerekli parametreler
- Request body şeması
- Response şeması
- Yetkilendirme gereksinimleri
- Örnek kullanım

### 3. Veri Modelleri
Tüm veri modelleri (schemas) detaylı olarak tanımlanmıştır:
- User
- TourGroup
- Message
- Invitation

### 4. Test Etme
1. Endpoint'i seçin
2. "Try it out" butonuna tıklayın
3. Gerekli parametreleri girin
4. "Execute" butonuna tıklayın
5. Response'u inceleyin

### 5. Yetkilendirme
1. Sağ üstteki "Authorize" butonuna tıklayın
2. JWT token'ınızı girin: `Bearer <token>`
3. "Authorize" butonuna tıklayın

### 6. Postman Entegrasyonu
1. Sağ üstteki menüden "Download as Postman Collection" seçeneğini kullanın
2. İndirilen dosyayı Postman'e import edin

## Örnek Kullanım

### 1. Kullanıcı Kaydı
1. `/api/users/check-phone` endpoint'ini bulun
2. "Try it out" butonuna tıklayın
3. Request body'ye telefon numarasını girin
4. "Execute" butonuna tıklayın
5. Response'u inceleyin

### 2. Grup Oluşturma
1. Önce "Authorize" ile token'ınızı girin
2. `/api/groups` POST endpoint'ini bulun
3. Request body'de grup bilgilerini doldurun
4. "Execute" ile test edin

### 3. Mesaj Senkronizasyonu
1. `/api/messages/sync` endpoint'ini bulun
2. Request body'de mesaj array'ini hazırlayın
3. "Execute" ile senkronizasyonu test edin

## Önemli Notlar

1. **Yetkilendirme**: Protected endpoint'ler için mutlaka token gereklidir
2. **Validation**: Request body şemalarında required alanlar belirtilmiştir
3. **Rate Limiting**: API kullanım limitleri dokümantasyonda belirtilmiştir
4. **Hata Kodları**: Tüm hata kodları ve açıklamaları listelenmiştir

## Sık Karşılaşılan Sorunlar

1. **401 Unauthorized**
   - Token eksik veya geçersiz
   - "Authorize" butonundan token'ı kontrol edin

2. **400 Bad Request**
   - Request body formatı hatalı
   - Required alanları kontrol edin

3. **403 Forbidden**
   - Yetkisiz erişim
   - Kullanıcı rolünü kontrol edin

## İletişim

API ile ilgili sorularınız için:
- Backend ekibi ile iletişime geçin
- Issue açın
- Dokümantasyonu geliştirmek için PR gönderin 