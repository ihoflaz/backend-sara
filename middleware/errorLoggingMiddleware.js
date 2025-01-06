const SystemLog = require('../models/SystemLog');

const errorLoggingMiddleware = async (err, req, res, next) => {
    try {
        // Hata seviyesini belirle
        let level = 'error';
        if (err.status >= 500) {
            level = 'critical';
        } else if (err.status >= 400) {
            level = 'warning';
        }

        // Hata kategorisini belirle
        let category = 'system';
        if (err.name === 'ValidationError') {
            category = 'database';
        } else if (err.name === 'JsonWebTokenError') {
            category = 'auth';
        } else if (err.name === 'BluetoothError') {
            category = 'bluetooth';
        } else if (req.originalUrl.includes('/notifications')) {
            category = 'notification';
        } else if (req.originalUrl.includes('/api')) {
            category = 'api';
        }

        // Hata detaylarını hazırla
        const details = {
            name: err.name,
            status: err.status || 500,
            path: req.originalUrl,
            method: req.method,
            query: req.query,
            body: req.body,
            stack: err.stack,
            userId: req.user?._id
        };

        // Hatayı logla
        await SystemLog.create({
            level,
            category,
            message: err.message || 'Bir hata oluştu',
            details,
            source: req.get('User-Agent') || 'unknown'
        });

        // Hata yanıtını hazırla
        const response = {
            success: false,
            message: process.env.NODE_ENV === 'production' 
                ? 'Bir hata oluştu'
                : err.message,
            error: process.env.NODE_ENV === 'production'
                ? undefined
                : {
                    name: err.name,
                    stack: err.stack
                }
        };

        // Yanıtı gönder
        res.status(err.status || 500).json(response);
    } catch (error) {
        console.error('Hata loglama hatası:', error);
        next(err);
    }
};

module.exports = errorLoggingMiddleware; 