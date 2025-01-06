const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
    level: {
        type: String,
        required: true,
        enum: ['info', 'warning', 'error', 'critical'],
        index: true
    },
    category: {
        type: String,
        required: true,
        enum: ['system', 'auth', 'database', 'api', 'bluetooth', 'notification'],
        index: true
    },
    message: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    source: {
        type: String,
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    resolved: {
        type: Boolean,
        default: false,
        index: true
    },
    resolvedAt: {
        type: Date
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolution: {
        type: String
    }
});

// Performans için bileşik indeksler
systemLogSchema.index({ level: 1, timestamp: -1 });
systemLogSchema.index({ category: 1, timestamp: -1 });
systemLogSchema.index({ resolved: 1, level: 1, timestamp: -1 });

// 30 günden eski logları otomatik sil (error ve critical hariç)
systemLogSchema.index(
    { timestamp: 1 },
    { 
        expireAfterSeconds: 30 * 24 * 60 * 60,
        partialFilterExpression: { 
            level: { $nin: ['error', 'critical'] } 
        }
    }
);

module.exports = mongoose.model('SystemLog', systemLogSchema); 