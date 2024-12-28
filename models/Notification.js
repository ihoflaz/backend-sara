const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['message', 'announcement', 'invitation', 'group_update'],
    required: true
  },
  title: String,
  content: String,
  relatedGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourGroup'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Okunmamış bildirimleri hızlı bulmak için index
NotificationSchema.index({ recipient: 1, isRead: 1 }); 