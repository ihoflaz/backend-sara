const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TourGroup',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'location'],
        default: 'text'
    },
    fileUrl: String,
    location: {
        latitude: Number,
        longitude: Number
    },
    localMessageId: {
        type: String,
        required: true
    },
    sentAt: {
        type: Date,
        required: true
    },
    syncedAt: {
        type: Date,
        default: null
    },
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Bileşik indeks oluşturma
messageSchema.index({ groupId: 1, sentAt: -1 });
messageSchema.index({ localMessageId: 1, sender: 1 }, { unique: true });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 