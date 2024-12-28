const mongoose = require('mongoose');

const tourGroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    guide: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'left'],
            default: 'active'
        }
    }],
    invitations: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'expired'],
            default: 'pending'
        },
        invitedAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date,
            required: true
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    description: String
}, {
    timestamps: true
});

// Bileşik indeksler
tourGroupSchema.index({ guide: 1, createdAt: -1 });
tourGroupSchema.index({ 'members.user': 1 });
tourGroupSchema.index({ 'invitations.user': 1, 'invitations.status': 1 });

const TourGroup = mongoose.model('TourGroup', tourGroupSchema);

module.exports = TourGroup; 