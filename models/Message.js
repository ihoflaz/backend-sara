const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    localMessageId: {
        type: String,
        required: true,
        unique: true,
        description: 'İstemci tarafında oluşturulan benzersiz mesaj ID\'si'
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TourGroup',
        required: true,
        description: 'Mesajın ait olduğu grup ID\'si'
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        description: 'Mesajı okuyan kullanıcılar'
    }],
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        description: 'Mesaj tipine göre ek bilgiler (konum için lat/lng, resim için URL gibi)'
    }
}, {
    timestamps: true
});

// Indexler
messageSchema.index({ localMessageId: 1 });
messageSchema.index({ groupId: 1, sentAt: 1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ status: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 