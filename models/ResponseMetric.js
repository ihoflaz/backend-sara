const mongoose = require('mongoose');

const responseMetricSchema = new mongoose.Schema({
    endpoint: {
        type: String,
        required: true,
        index: true
    },
    method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    responseTime: {
        type: Number,
        required: true
    },
    statusCode: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Performans için indeks
responseMetricSchema.index({ timestamp: -1, endpoint: 1 });

// 7 günden eski kayıtları otomatik sil
responseMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('ResponseMetric', responseMetricSchema); 