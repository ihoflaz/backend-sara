# Değişiklik Geçmişi

## [2.1.0] - 2024-01-20
### Eklenenler
- Bluetooth mesajlaşma sistemi
- Offline-first yaklaşım
- Mesaj senkronizasyon sistemi
- Konum paylaşımı
- Swagger UI entegrasyonu

### Değişenler
- Socket.IO kaldırıldı, yerine Bluetooth iletişimi eklendi
- Mesaj modeli güncellendi (localMessageId, metadata eklendi)
- API dokümantasyonu güncellendi
- Veritabanı indeksleri optimize edildi

### Düzeltmeler
- Senkronizasyon sürecindeki hatalar giderildi
- Bluetooth bağlantı sorunları çözüldü
- Veritabanı sorguları iyileştirildi

## [2.0.0] - 2024-01-15
### Eklenenler
- Rehber (guide) rolü ve özellikleri
- Tur grubu yönetimi
- Grup mesajlaşma sistemi
- Duyuru gönderme özelliği
- Bildirim sistemi
- Davet yönetimi sistemi

### Değişenler
- User modeline guide bilgileri eklendi
- Mesajlaşma sistemi bire-bir'den grup bazlı yapıya geçirildi
- Token yönetimi güncellendi
- API endpoint'leri yeniden yapılandırıldı

### Düzeltmeler
- Token yenileme sürecindeki hatalar giderildi
- SMS doğrulama sürecindeki performans sorunları çözüldü
- Veritabanı indeksleri optimize edildi

## [1.1.0] - 2024-01-01
### Eklenenler
- SMS doğrulama sistemi
- JWT tabanlı kimlik doğrulama
- Kullanıcı profil yönetimi
- Admin paneli temel özellikleri

### Değişenler
- Kullanıcı kayıt süreci güncellendi
- Hata yönetimi geliştirildi
- Rate limiting eklendi

### Düzeltmeler
- Telefon numarası formatı düzeltildi
- Kullanıcı durumu güncelleme hataları giderildi

## [1.0.0] - 2023-12-15
### İlk Sürüm
- Temel kullanıcı yönetimi
- Telefon numarası ile kayıt
- Basit profil yönetimi
- Admin/kullanıcı rol sistemi

## Planlanan Güncellemeler

### [2.2.0] - Şubat 2024
- Dosya paylaşım sistemi
- Offline dosya önbelleği
- Mesaj şifreleme
- Gelişmiş konum özellikleri
- Bluetooth mesh networking

### [2.3.0] - Mart 2024
- Çoklu dil desteği
- Gelişmiş arama özellikleri
- Mesaj yedekleme sistemi
- Performans optimizasyonları
- Batarya kullanımı iyileştirmeleri
