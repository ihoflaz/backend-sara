const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['general', 'security', 'notification', 'performance', 'maintenance'],
        index: true
    },
    description: {
        type: String,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

// Varsayılan sistem ayarları
systemSettingSchema.statics.defaultSettings = {
    'maintenance.mode': {
        value: false,
        category: 'maintenance',
        description: 'Bakım modu'
    },
    'security.max_login_attempts': {
        value: 5,
        category: 'security',
        description: 'Maksimum başarısız giriş denemesi'
    },
    'security.lockout_duration': {
        value: 30,
        category: 'security',
        description: 'Hesap kilitleme süresi (dakika)'
    },
    'notification.expiry_days': {
        value: 30,
        category: 'notification',
        description: 'Bildirimlerin silinme süresi (gün)'
    },
    'performance.max_group_members': {
        value: 100,
        category: 'performance',
        description: 'Bir gruptaki maksimum üye sayısı'
    },
    'performance.message_batch_size': {
        value: 50,
        category: 'performance',
        description: 'Mesaj senkronizasyon parti boyutu'
    }
};

// Ayarları yükle veya oluştur
systemSettingSchema.statics.loadSettings = async function(adminUserId) {
    const settings = await this.find();
    const defaultSettings = this.defaultSettings;

    for (const [key, setting] of Object.entries(defaultSettings)) {
        const exists = settings.some(s => s.key === key);
        if (!exists) {
            await this.create({
                key,
                value: setting.value,
                category: setting.category,
                description: setting.description,
                updatedBy: adminUserId
            });
        }
    }
};

module.exports = mongoose.model('SystemSetting', systemSettingSchema); 