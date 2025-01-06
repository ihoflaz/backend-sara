const ResponseMetric = require('../models/ResponseMetric');

const responseTimeMiddleware = async (req, res, next) => {
    const start = process.hrtime();

    // Orijinal end fonksiyonunu kaydet
    const originalEnd = res.end;

    // end fonksiyonunu override et
    res.end = function (...args) {
        const [seconds, nanoseconds] = process.hrtime(start);
        const responseTime = seconds * 1000 + nanoseconds / 1000000; // milisaniye cinsinden

        // Metriği kaydet
        ResponseMetric.create({
            endpoint: req.originalUrl,
            method: req.method,
            responseTime,
            statusCode: res.statusCode
        }).catch(err => {
            console.error('Yanıt süresi metriği kaydedilemedi:', err);
        });

        // Orijinal end fonksiyonunu çağır
        originalEnd.apply(res, args);
    };

    next();
};

module.exports = responseTimeMiddleware; 