const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  phoneNumber: { 
    type: String, 
    required: true, 
    unique: true,
    validate: {
      validator: function(v) {
        return /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message: props => `${props.value} geçerli bir telefon numarası değil!`
    }
  },
  firstName: { 
    type: String,
    required: function() {
      return this.isRegistrationComplete === true;
    }
  },
  lastName: { 
    type: String,
    required: function() {
      return this.isRegistrationComplete === true;
    }
  },
  email: { 
    type: String,
    validate: {
      validator: function(v) {
        return v === undefined || v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} geçerli bir e-posta adresi değil!`
    }
  },
  birthDate: { 
    type: Date
  },
  gender: { 
    type: String,
    enum: ['Erkek', 'Kadın', 'Diğer']
  },
  verificationCode: {
    code: String,
    expiresAt: Date
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isRegistrationComplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
