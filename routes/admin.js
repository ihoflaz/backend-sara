const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Admin kullanıcı listesi
router.get('/users', verifyToken, authorize(['admin']), async (req, res) => {
  try {
    const users = await User.find().select('-refreshToken');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; 