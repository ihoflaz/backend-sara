const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Token yenileme
 *     description: Refresh token kullanarak yeni bir access token alır
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Geçerli refresh token
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 accessToken:
 *                   type: string
 *                   description: Yeni access token
 *                 refreshToken:
 *                   type: string
 *                   description: Yeni refresh token
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Geçersiz refresh token
 *       403:
 *         description: Token süresi dolmuş
 */
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token gereklidir'
            });
        }

        try {
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            const user = await User.findOne({
                _id: decoded.id,
                refreshToken,
                status: 'active'
            });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Geçersiz refresh token'
                });
            }

            const tokens = createTokens(user);
            await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });

            res.json({
                success: true,
                ...tokens
            });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(403).json({
                    success: false,
                    message: 'Refresh token süresi dolmuş'
                });
            }

            throw error;
        }
    } catch (error) {
        console.error('Token yenileme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Token yenilenirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     TokenResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         accessToken:
 *           type: string
 *           description: JWT access token
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token
 */

// Token oluşturma yardımcı fonksiyonu
const createTokens = (user) => {
    // Access token - 1 saat geçerli
    const accessToken = jwt.sign(
        {
            id: user._id,
            phoneNumber: user.phoneNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isVerified: user.isVerified,
            status: user.status
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    // Refresh token - 30 gün geçerli
    const refreshToken = jwt.sign(
        {
            id: user._id,
            version: user.tokenVersion || 0 // Token sürümü için
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' }
    );

    return { accessToken, refreshToken };
};

module.exports = { router, createTokens }; 