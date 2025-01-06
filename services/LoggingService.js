const SystemLog = require('../models/SystemLog');

class LoggingService {
    static async logInfo(message, category = 'system', details = {}, source = 'system') {
        return this.log('info', message, category, details, source);
    }

    static async logWarning(message, category = 'system', details = {}, source = 'system') {
        return this.log('warning', message, category, details, source);
    }

    static async logError(message, category = 'system', details = {}, source = 'system') {
        return this.log('error', message, category, details, source);
    }

    static async logCritical(message, category = 'system', details = {}, source = 'system') {
        return this.log('critical', message, category, details, source);
    }

    static async log(level, message, category, details, source) {
        try {
            // TTL için expiresAt alanını hesapla
            let expiresAt = null;
            if (!['error', 'critical'].includes(level)) {
                const date = new Date();
                date.setDate(date.getDate() + 30); // 30 gün sonra
                expiresAt = date;
            }

            const log = await SystemLog.create({
                level,
                category,
                message,
                details,
                source,
                expiresAt // Yeni alan
            });

            // Critical seviyesindeki loglar için bildirim gönder
            if (level === 'critical') {
                await this.notifyAdmins(log);
            }

            return log;
        } catch (error) {
            console.error('Log oluşturma hatası:', error);
            throw error;
        }
    }

    static async notifyAdmins(log) {
        try {
            const Notification = require('../models/Notification');
            const User = require('../models/User');

            // Admin kullanıcıları bul
            const admins = await User.find({ role: 'admin' }).select('_id');

            // Her admin için bildirim oluştur
            const notifications = admins.map(admin => ({
                recipient: admin._id,
                type: 'system_alert',
                title: `Kritik Sistem Hatası: ${log.category}`,
                message: log.message,
                data: {
                    logId: log._id,
                    details: log.details
                }
            }));

            await Notification.insertMany(notifications);
        } catch (error) {
            console.error('Admin bildirim hatası:', error);
        }
    }

    static async getLogStats(startDate, endDate) {
        try {
            const stats = await SystemLog.aggregate([
                {
                    $match: {
                        timestamp: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            level: '$level',
                            category: '$category'
                        },
                        count: { $sum: 1 },
                        resolvedCount: {
                            $sum: { $cond: ['$resolved', 1, 0] }
                        }
                    }
                },
                {
                    $group: {
                        _id: '$_id.level',
                        categories: {
                            $push: {
                                category: '$_id.category',
                                count: '$count',
                                resolvedCount: '$resolvedCount'
                            }
                        },
                        totalCount: { $sum: '$count' },
                        totalResolved: { $sum: '$resolvedCount' }
                    }
                }
            ]);

            return stats;
        } catch (error) {
            console.error('Log istatistikleri alma hatası:', error);
            throw error;
        }
    }

    static async cleanOldLogs(days = 30) {
        try {
            const now = new Date();
            
            // expiresAt'i geçmiş olan logları sil
            const expiredResult = await SystemLog.deleteMany({
                expiresAt: { $lt: now }
            });

            // Eski error ve critical logları için ayrı temizlik
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - (days * 2)); // error ve critical için 60 gün
            
            const criticalResult = await SystemLog.deleteMany({
                level: { $in: ['error', 'critical'] },
                timestamp: { $lt: cutoffDate },
                resolved: true
            });

            return {
                expiredCount: expiredResult.deletedCount,
                criticalCount: criticalResult.deletedCount,
                totalCount: expiredResult.deletedCount + criticalResult.deletedCount
            };
        } catch (error) {
            console.error('Eski log temizleme hatası:', error);
            throw error;
        }
    }
}

module.exports = LoggingService; 