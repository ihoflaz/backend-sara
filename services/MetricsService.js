const os = require('os');
const mongoose = require('mongoose');
const SystemLog = require('../models/SystemLog');
const User = require('../models/User');
const TourGroup = require('../models/TourGroup');
const Message = require('../models/Message');

class MetricsService {
    // Sistem Performans Metrikleri
    static async getSystemMetrics() {
        try {
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;

            return {
                system: {
                    uptime: os.uptime(),
                    memory: {
                        total: totalMemory,
                        free: freeMemory,
                        used: usedMemory,
                        usagePercentage: (usedMemory / totalMemory) * 100
                    },
                    cpu: {
                        loadAverage: os.loadavg(),
                        cores: os.cpus().length
                    },
                    platform: os.platform(),
                    arch: os.arch()
                },
                mongodb: {
                    status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
                    collections: Object.keys(mongoose.connection.collections).length,
                    connectionPoolSize: mongoose.connection.config?.poolSize || 'default'
                }
            };
        } catch (error) {
            console.error('Sistem metrikleri alma hatası:', error);
            throw error;
        }
    }

    // Uygulama Metrikleri
    static async getApplicationMetrics() {
        try {
            const now = new Date();
            const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
            const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

            // Aktif kullanıcı ve grup sayıları
            const [
                totalUsers,
                activeUsers,
                totalGroups,
                activeGroups,
                dailyMessages,
                weeklyMessages
            ] = await Promise.all([
                User.countDocuments(),
                User.countDocuments({ lastActivity: { $gte: oneDayAgo } }),
                TourGroup.countDocuments(),
                TourGroup.countDocuments({ status: 'active' }),
                Message.countDocuments({ createdAt: { $gte: oneDayAgo } }),
                Message.countDocuments({ createdAt: { $gte: oneWeekAgo } })
            ]);

            // Bluetooth bağlantı başarı oranı (son 24 saat)
            const bluetoothStats = await SystemLog.aggregate([
                {
                    $match: {
                        category: 'bluetooth',
                        timestamp: { $gte: oneDayAgo }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        success: {
                            $sum: {
                                $cond: [{ $ne: ['$level', 'error'] }, 1, 0]
                            }
                        }
                    }
                }
            ]);

            const bluetoothSuccessRate = bluetoothStats.length > 0
                ? (bluetoothStats[0].success / bluetoothStats[0].total) * 100
                : 100;

            return {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    activePercentage: (activeUsers / totalUsers) * 100
                },
                groups: {
                    total: totalGroups,
                    active: activeGroups,
                    activePercentage: (activeGroups / totalGroups) * 100
                },
                messages: {
                    daily: dailyMessages,
                    weekly: weeklyMessages,
                    averagePerDay: weeklyMessages / 7
                },
                bluetooth: {
                    successRate: bluetoothSuccessRate,
                    total: bluetoothStats[0]?.total || 0,
                    success: bluetoothStats[0]?.success || 0
                }
            };
        } catch (error) {
            console.error('Uygulama metrikleri alma hatası:', error);
            throw error;
        }
    }

    // Hata Metrikleri
    static async getErrorMetrics() {
        try {
            const now = new Date();
            const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

            // Hata istatistikleri
            const errorStats = await SystemLog.aggregate([
                {
                    $match: {
                        timestamp: { $gte: oneDayAgo },
                        level: { $in: ['error', 'critical'] }
                    }
                },
                {
                    $group: {
                        _id: {
                            level: '$level',
                            category: '$category'
                        },
                        count: { $sum: 1 },
                        unresolvedCount: {
                            $sum: {
                                $cond: [{ $eq: ['$resolved', false] }, 1, 0]
                            }
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
                                unresolvedCount: '$unresolvedCount'
                            }
                        },
                        totalCount: { $sum: '$count' },
                        totalUnresolved: { $sum: '$unresolvedCount' }
                    }
                }
            ]);

            // En sık karşılaşılan hatalar
            const commonErrors = await SystemLog.aggregate([
                {
                    $match: {
                        timestamp: { $gte: oneDayAgo },
                        level: { $in: ['error', 'critical'] }
                    }
                },
                {
                    $group: {
                        _id: '$message',
                        count: { $sum: 1 },
                        lastOccurrence: { $max: '$timestamp' },
                        category: { $first: '$category' },
                        level: { $first: '$level' }
                    }
                },
                {
                    $sort: { count: -1 }
                },
                {
                    $limit: 10
                }
            ]);

            return {
                summary: {
                    total: errorStats.reduce((sum, stat) => sum + stat.totalCount, 0),
                    unresolved: errorStats.reduce((sum, stat) => sum + stat.totalUnresolved, 0)
                },
                byLevel: errorStats,
                commonErrors: commonErrors.map(error => ({
                    message: error._id,
                    count: error.count,
                    category: error.category,
                    level: error.level,
                    lastOccurrence: error.lastOccurrence
                }))
            };
        } catch (error) {
            console.error('Hata metrikleri alma hatası:', error);
            throw error;
        }
    }
}

module.exports = MetricsService; 