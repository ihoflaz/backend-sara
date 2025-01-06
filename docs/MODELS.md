# Veritabanı Modelleri

## User Model

Kullanıcı bilgilerini tutan model.

```typescript
interface User {
  // Temel Bilgiler
  phoneNumber: string;     // Zorunlu, Benzersiz, Format: +901234567890
  firstName?: string;      // Opsiyonel, trim edilir
  lastName?: string;      // Opsiyonel, trim edilir
  email?: string;         // Opsiyonel, trim edilir, küçük harfe çevrilir
  birthDate?: Date;       // Opsiyonel
  gender?: 'Erkek' | 'Kadın' | 'Diğer';  // Opsiyonel
  avatar?: string;        // Profil fotoğrafı URL'i

  // Sistem Bilgileri
  role: 'user' | 'guide' | 'admin';  // Varsayılan: 'user'
  isVerified: boolean;    // SMS doğrulaması yapıldı mı? Varsayılan: false
  status: 'active' | 'blocked' | 'deleted';  // Varsayılan: 'active'
  refreshToken?: string;  // JWT refresh token
  lastLoginAt?: Date;     // Son giriş zamanı
  
  // Rehber Özel Bilgileri (role === 'guide' ise)
  guideInfo?: {
    experience: number;   // Deneyim yılı
    languages: string[]; // Bilinen diller
    specialization: string[]; // Uzmanlık alanları
    rating: number;     // Rehber puanı (0-5 arası, varsayılan: 0)
    totalTours: number; // Toplam tur sayısı (varsayılan: 0)
  };

  // Cihaz Bilgileri
  deviceTokens: [{
    token: string;
    platform: 'ios' | 'android';
    lastUsed: Date;     // Son kullanım zamanı, varsayılan: Date.now
  }];

  // Zaman Bilgileri
  createdAt: Date;
  updatedAt: Date;
}

// İndeksler
userSchema.index({ phoneNumber: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'deviceTokens.token': 1 });

// Örnek Kullanım:
const userExample = {
  phoneNumber: "+905551234567",
  firstName: "Ahmet",
  lastName: "Yılmaz",
  email: "ahmet@example.com",
  role: "guide",
  status: "active",
  isVerified: true,
  guideInfo: {
    experience: 5,
    languages: ["Türkçe", "İngilizce"],
    specialization: ["Kültür Turları"],
    rating: 4.8,
    totalTours: 50
  },
  deviceTokens: [{
    token: "fcm-token-123",
    platform: "ios",
    lastUsed: new Date()
  }]
};
```

## TourGroup Model

Tur gruplarını ve üyeliklerini yöneten model.

```typescript
interface TourGroup {
  // Temel Bilgiler
  name: string;           // Zorunlu, trim edilir
  description?: string;   // Opsiyonel
  guide: string;          // Zorunlu, User referansı
  
  // Üyelik Bilgileri
  members: [{
    user: string;         // User referansı
    joinedAt: Date;       // Varsayılan: Date.now
    status: 'active' | 'inactive' | 'left';  // Varsayılan: 'active'
  }];

  // Davet Bilgileri
  invitations: [{
    user: string;        // User referansı
    status: 'pending' | 'accepted' | 'rejected' | 'expired';  // Varsayılan: 'pending'
    invitedAt: Date;     // Varsayılan: Date.now
    expiresAt: Date;     // Zorunlu
  }];

  // Tur Bilgileri
  startDate?: Date;      // Opsiyonel
  endDate?: Date;        // Opsiyonel
  description?: string;  // Opsiyonel
  isActive: boolean;     // Varsayılan: true

  // Zaman Bilgileri
  createdAt: Date;
  updatedAt: Date;
}

// İndeksler
tourGroupSchema.index({ guide: 1, createdAt: -1 });
tourGroupSchema.index({ 'members.user': 1 });
tourGroupSchema.index({ 'invitations.user': 1, 'invitations.status': 1 });

// Örnek Kullanım:
const groupExample = {
  name: "Roma Turu 2024",
  description: "7 günlük Roma kültür turu",
  guide: "guide_user_id",
  members: [{
    user: "member_user_id",
    joinedAt: new Date(),
    status: "active"
  }],
  invitations: [{
    user: "invited_user_id",
    status: "pending",
    invitedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  }],
  startDate: new Date("2024-06-01"),
  endDate: new Date("2024-06-07"),
  isActive: true
};
```

## Message Model

Mesajlaşma verilerini tutan model.

## Şema

```javascript
{
  localMessageId: {
    type: String,
    required: true,
    unique: true,
    description: 'İstemci tarafında oluşturulan benzersiz mesaj ID\'si'
  },
  groupId: {
    type: ObjectId,
    ref: 'TourGroup',
    required: true,
    description: 'Mesajın ait olduğu grup ID\'si'
  },
  sender: {
    type: ObjectId,
    ref: 'User',
    required: true,
    description: 'Mesajı gönderen kullanıcı ID\'si'
  },
  content: {
    type: String,
    required: true,
    description: 'Mesaj içeriği'
  },
  type: {
    type: String,
    enum: ['text', 'image', 'location'],
    default: 'text',
    description: 'Mesaj tipi'
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent',
    description: 'Mesaj durumu'
  },
  sentAt: {
    type: Date,
    required: true,
    description: 'Mesajın gönderilme zamanı (istemci saati)'
  },
  syncedAt: {
    type: Date,
    default: Date.now,
    description: 'Mesajın sunucuya senkronize edilme zamanı'
  },
  readBy: [{
    type: ObjectId,
    ref: 'User',
    description: 'Mesajı okuyan kullanıcılar'
  }],
  metadata: {
    type: Mixed,
    description: 'Mesaj tipine göre ek bilgiler (konum için lat/lng, resim için URL gibi)'
  }
}
```

## İndeksler

- `localMessageId`: Tekil indeks
- `{ groupId: 1, sentAt: 1 }`: Bileşik indeks
- `sender`: İndeks
- `status`: İndeks

## İlişkiler

- `groupId` -> `TourGroup` modeli ile ilişkili
- `sender` -> `User` modeli ile ilişkili
- `readBy` -> `User` modeli ile ilişkili

## Örnek Kullanım

```javascript
// Yeni mesaj oluşturma
const message = new Message({
  localMessageId: 'client-123',
  groupId: '507f1f77bcf86cd799439011',
  sender: '507f1f77bcf86cd799439012',
  content: 'Merhaba!',
  type: 'text',
  sentAt: new Date()
});

// Mesaj okuma
const messages = await Message.find({ groupId: '507f1f77bcf86cd799439011' })
  .populate('sender', 'firstName lastName')
  .sort('sentAt');

// Mesajı okundu olarak işaretleme
await Message.updateOne(
  { _id: '507f1f77bcf86cd799439013' },
  { 
    $set: { status: 'read' },
    $addToSet: { readBy: '507f1f77bcf86cd799439014' }
  }
);
```

## Notification Model

Bildirim sistemini yöneten model.

```typescript
interface Notification {
    // İlişki Bilgileri
    recipient: string;      // Zorunlu, User referansı
    relatedGroup?: string; // Opsiyonel, TourGroup referansı
    
    // Bildirim Bilgileri
    type: 'message' | 'announcement' | 'invitation' | 'group_update';  // Zorunlu
    title: string;         // Bildirim başlığı
    content: string;       // Bildirim içeriği
    
    // Durum Bilgileri
    isRead: boolean;       // Varsayılan: false
    
    // Zaman Bilgileri
    createdAt: Date;
    updatedAt: Date;
}

// İndeksler
notificationSchema.index({ recipient: 1, isRead: 1 });

// Örnek Kullanım:
const notificationExample = {
    recipient: "user_id",
    type: "invitation",
    title: "Yeni Grup Daveti",
    content: "Roma Turu 2024 grubuna davet edildiniz",
    relatedGroup: "group_id",
    isRead: false
};
```

## SystemLog Model

Sistem loglarını tutan model.

```typescript
interface SystemLog {
  // Log Bilgileri
  level: 'info' | 'warning' | 'error' | 'critical';  // Zorunlu
  category: 'system' | 'auth' | 'database' | 'api' | 'bluetooth' | 'notification';  // Zorunlu
  message: string;       // Zorunlu
  details?: object;      // Opsiyonel, detaylı hata bilgisi
  source: string;        // Log kaynağı (servis/fonksiyon adı)
  
  // Çözüm Bilgileri
  resolved: boolean;     // Varsayılan: false
  resolvedAt?: Date;    // Çözüldüğü zaman
  resolvedBy?: string;  // User referansı
  resolution?: string;  // Çözüm açıklaması
  
  // Zaman Bilgileri
  createdAt: Date;      // Varsayılan: Date.now
  updatedAt: Date;      // Varsayılan: Date.now
}

// İndeksler
systemLogSchema.index({ level: 1, category: 1 });
systemLogSchema.index({ resolved: 1 });
systemLogSchema.index({ createdAt: 1 });

// Örnek Kullanım:
const logExample = {
  level: "error",
  category: "bluetooth",
  message: "Bluetooth bağlantısı başarısız",
  details: { 
    deviceId: "device123",
    errorCode: "BT_CONN_FAILED"
  },
  source: "BluetoothService.connect",
  resolved: false,
  createdAt: new Date()
};
```

## SystemSetting Model

Sistem ayarlarını tutan model.

```typescript
interface SystemSetting {
  // Ayar Bilgileri
  key: string;          // Zorunlu, Benzersiz
  value: any;           // Zorunlu, herhangi bir tip olabilir
  category: 'general' | 'security' | 'notification' | 'performance' | 'maintenance';  // Zorunlu
  description: string;  // Ayarın açıklaması
  
  // Değişiklik Bilgileri
  updatedBy: string;    // User referansı
  updatedAt: Date;      // Varsayılan: Date.now
}

// İndeksler
systemSettingSchema.index({ key: 1 }, { unique: true });
systemSettingSchema.index({ category: 1 });

// Örnek Kullanım:
const settingExample = {
  key: "maxGroupSize",
  value: 100,
  category: "general",
  description: "Bir gruptaki maksimum üye sayısı",
  updatedBy: "admin_user_id",
  updatedAt: new Date()
};
```

## ResponseMetric Model

API yanıt metriklerini tutan model.

```typescript
interface ResponseMetric {
  // İstek Bilgileri
  endpoint: string;     // API endpoint'i
  method: string;       // HTTP metodu
  statusCode: number;   // HTTP durum kodu
  
  // Performans Metrikleri
  responseTime: number; // Milisaniye cinsinden yanıt süresi
  requestSize: number;  // Byte cinsinden istek boyutu
  responseSize: number; // Byte cinsinden yanıt boyutu
  
  // İstemci Bilgileri
  userAgent: string;    // İstemci bilgisi
  ipAddress: string;    // İstemci IP adresi
  
  // Zaman Bilgisi
  timestamp: Date;      // Varsayılan: Date.now
}

// İndeksler
responseMetricSchema.index({ endpoint: 1, timestamp: 1 });
responseMetricSchema.index({ statusCode: 1 });
responseMetricSchema.index({ timestamp: 1 });

// Örnek Kullanım:
const metricExample = {
  endpoint: "/api/groups",
  method: "GET",
  statusCode: 200,
  responseTime: 150,
  requestSize: 1024,
  responseSize: 5120,
  userAgent: "Mozilla/5.0...",
  ipAddress: "192.168.1.1",
  timestamp: new Date()
};
```

## ErrorLog Model

Uygulama hatalarını detaylı şekilde tutan model.

```typescript
interface ErrorLog {
  // Hata Bilgileri
  name: string;         // Hata adı
  message: string;      // Hata mesajı
  stack?: string;       // Hata stack trace
  code?: string;        // Hata kodu
  
  // Bağlam Bilgileri
  context: {
    endpoint?: string;  // Hata oluştuğunda çağrılan endpoint
    method?: string;    // HTTP metodu
    params?: object;    // İstek parametreleri
    userId?: string;    // Kullanıcı ID'si
    deviceInfo?: {      // Cihaz bilgileri
      platform: string;
      version: string;
      deviceId?: string;
    }
  };
  
  // Durum Bilgileri
  severity: 'low' | 'medium' | 'high' | 'critical';  // Hata önceliği
  status: 'new' | 'investigating' | 'resolved' | 'ignored';  // Varsayılan: 'new'
  
  // Çözüm Bilgileri
  resolution?: {
    resolvedBy?: string;  // User referansı
    resolvedAt?: Date;    // Çözüm zamanı
    notes?: string;       // Çözüm notları
  };
  
  // Zaman Bilgileri
  createdAt: Date;      // Varsayılan: Date.now
  updatedAt: Date;      // Varsayılan: Date.now
}

// İndeksler
errorLogSchema.index({ severity: 1, status: 1 });
errorLogSchema.index({ 'context.endpoint': 1 });
errorLogSchema.index({ createdAt: 1 });

// Örnek Kullanım:
const errorExample = {
  name: "ValidationError",
  message: "Geçersiz grup adı",
  stack: "Error: Geçersiz grup adı\n    at validateGroup...",
  code: "INVALID_GROUP_NAME",
  context: {
    endpoint: "/api/groups",
    method: "POST",
    params: { name: "" },
    userId: "user123",
    deviceInfo: {
      platform: "ios",
      version: "15.0",
      deviceId: "device123"
    }
  },
  severity: "medium",
  status: "new",
  createdAt: new Date()
};
```
