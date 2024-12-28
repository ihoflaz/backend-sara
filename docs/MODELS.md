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
