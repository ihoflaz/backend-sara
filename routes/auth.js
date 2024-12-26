const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Token oluşturma yardımcı fonksiyonu
const createTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      id: user._id, 
      phoneNumber: user.phoneNumber, 
      isVerified: user.isVerified,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

// Token yenileme endpoint'i
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token gerekli' });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findOne({ _id: decoded.id, refreshToken });

    if (!user) {
      return res.status(403).json({ message: 'Geçersiz refresh token' });
    }

    const tokens = createTokens(user);
    await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });

    res.json(tokens);
  } catch (error) {
    res.status(403).json({ message: 'Geçersiz token' });
  }
});

module.exports = { router, createTokens }; 