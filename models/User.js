const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'admin'],
        default: 'user'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'blocked', 'deleted'],
        default: 'active'
    },
    avatar: String,
    birthDate: Date,
    gender: {
        type: String,
        enum: ['Erkek', 'Kadın', 'Diğer']
    },
    guideInfo: {
        experience: Number,
        languages: [String],
        specialization: [String],
        rating: {
            type: Number,
            min: 0,
            max: 5,
            default: 0
        },
        totalTours: {
            type: Number,
            default: 0
        }
    },
    deviceTokens: [{
        token: String,
        platform: {
            type: String,
            enum: ['ios', 'android']
        },
        lastUsed: {
            type: Date,
            default: Date.now
        }
    }],
    lastLoginAt: Date,
    refreshToken: String
}, {
    timestamps: true
});

// Bileşik indeksler
userSchema.index({ phoneNumber: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'deviceTokens.token': 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
