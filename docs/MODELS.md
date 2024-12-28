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

Mesajlaşma sistemini yöneten model.

```typescript
interface Message {
    // İlişki Bilgileri
    sender: string;        // Zorunlu, User referansı
    groupId: string;      // Zorunlu, TourGroup referansı
    
    // Mesaj Bilgileri
    content: string;       // Zorunlu, mesaj içeriği
    messageType: 'text' | 'image' | 'file' | 'location';  // Varsayılan: 'text'
    localMessageId: string; // Zorunlu, istemci tarafında oluşturulan benzersiz ID
    
    // Dosya/Konum Bilgileri
    fileUrl?: string;     // Dosya/resim URL'i
    location?: {          // Konum bilgisi
        latitude: number;
        longitude: number;
    };
    
    // Durum Bilgileri
    status: 'pending' | 'sent' | 'delivered' | 'failed';  // Varsayılan: 'pending'
    sentAt: Date;        // Zorunlu, istemci saatine göre gönderim zamanı
    syncedAt?: Date;     // Sunucu ile senkronizasyon zamanı, varsayılan: null
    
    // Okunma Bilgileri
    readBy: [{
        user: string;    // User referansı
        readAt: Date;    // Varsayılan: Date.now
    }];

    // Zaman Bilgileri
    createdAt: Date;
    updatedAt: Date;
}

// İndeksler
messageSchema.index({ groupId: 1, sentAt: -1 });
messageSchema.index({ localMessageId: 1, sender: 1 }, { unique: true });

// Örnek Kullanım:
const messageExample = {
    sender: "user_id",
    groupId: "group_id",
    content: "Merhaba grup!",
    messageType: "text",
    localMessageId: "client_generated_uuid",
    status: "sent",
    sentAt: new Date(),
    syncedAt: new Date()
};

// Konum mesajı örneği:
const locationMessageExample = {
    sender: "user_id",
    groupId: "group_id",
    content: "Buluşma noktası",
    messageType: "location",
    localMessageId: "client_generated_uuid",
    location: {
        latitude: 41.0082,
        longitude: 28.9784
    },
    status: "sent",
    sentAt: new Date()
};
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
