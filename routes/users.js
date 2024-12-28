const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');
const { sendVerificationSMS, verifyCode } = require('../utils/smsUtil');
const { createTokens } = require('./auth');

/**
 * @swagger
 * /api/users/check-phone:
 *   post:
 *     summary: Telefon numarası kontrolü ve SMS gönderimi
 *     description: Telefon numarasını kontrol eder ve doğrulama kodu gönderir
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: +90 ile başlayan 10 haneli numara
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
 *                 exists:
 *                   type: boolean
 *                 verificationSid:
 *                   type: string
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 */
router.post('/check-phone', async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        // Telefon numarası formatı kontrolü
        if (!/^\+90[0-9]{10}$/.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz telefon numarası formatı'
            });
        }

        // Kullanıcı kontrolü
        const existingUser = await User.findOne({ phoneNumber });

        // SMS gönderimi
        const verification = await sendVerificationSMS(phoneNumber);

        res.json({
            success: true,
            exists: !!existingUser,
            verificationSid: verification.sid,
            status: verification.status,
            message: 'Doğrulama kodu gönderildi'
        });
    } catch (error) {
        console.error('Telefon kontrolü hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Doğrulama kodu gönderilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/users/verify-code:
 *   post:
 *     summary: Doğrulama kodu kontrolü
 *     description: SMS ile gönderilen doğrulama kodunu kontrol eder
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - code
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               code:
 *                 type: string
 *                 description: 6 haneli kod
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
 *                 isRegistered:
 *                   type: boolean
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.post('/verify-code', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;

        // Kod doğrulama
        const verification = await verifyCode(phoneNumber, code);
        if (!verification.valid) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz doğrulama kodu'
            });
        }

        // Kullanıcı kontrolü/oluşturma
        let user = await User.findOne({ phoneNumber });
        if (!user) {
            user = new User({
                phoneNumber,
                isVerified: true,
                role: 'user',
                status: 'active'
            });
            await user.save();
        }

        // Token oluşturma
        const tokens = createTokens(user);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        res.json({
            success: true,
            isRegistered: !!user.firstName,
            ...tokens,
            user: {
                _id: user._id,
                phoneNumber: user.phoneNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Kod doğrulama hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Doğrulama kodu kontrol edilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/users/complete-registration:
 *   post:
 *     summary: Kullanıcı kaydını tamamla
 *     description: Kullanıcı bilgilerini güncelleyerek kaydı tamamlar
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: min 2, max 50 karakter
 *               lastName:
 *                 type: string
 *                 description: min 2, max 50 karakter
 *               email:
 *                 type: string
 *                 format: email
 *               birthDate:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [Erkek, Kadın, Diğer]
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Başar��lı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.post('/complete-registration', verifyToken, async (req, res) => {
    try {
        const { firstName, lastName, email, birthDate, gender, avatar } = req.body;
        const errors = {};

        // Validasyonlar
        if (!firstName || firstName.length < 2 || firstName.length > 50) {
            errors.firstName = 'İsim 2-50 karakter arasında olmalıdır';
        }
        if (!lastName || lastName.length < 2 || lastName.length > 50) {
            errors.lastName = 'Soyisim 2-50 karakter arasında olmalıdır';
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = 'Geçersiz email formatı';
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz kullanıcı bilgileri',
                errors
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        // Bilgileri güncelle
        user.firstName = firstName;
        user.lastName = lastName;
        if (email) user.email = email;
        if (birthDate) user.birthDate = birthDate;
        if (gender) user.gender = gender;
        if (avatar) user.avatar = avatar;

        await user.save();

        res.json({
            success: true,
            user: {
                _id: user._id,
                phoneNumber: user.phoneNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                birthDate: user.birthDate,
                gender: user.gender,
                avatar: user.avatar,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Kayıt tamamlama hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kayıt tamamlanırken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/users/resend-code:
 *   post:
 *     summary: SMS tekrar gönder
 *     description: Doğrulama kodunu tekrar gönderir
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
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
 *                 verificationSid:
 *                   type: string
 *                 message:
 *                   type: string
 */
router.post('/resend-code', async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        // SMS gönderimi
        const verification = await sendVerificationSMS(phoneNumber);

        res.json({
            success: true,
            verificationSid: verification.sid,
            message: 'Doğrulama kodu tekrar gönderildi'
        });
    } catch (error) {
        console.error('SMS tekrar gönderme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Doğrulama kodu tekrar gönderilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Profil güncelle
 *     description: Kullanıcı profil bilgilerini günceller
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               birthDate:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [Erkek, Kadın, Diğer]
 *               avatar:
 *                 type: string
 *                 format: uri
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
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { firstName, lastName, email, birthDate, gender, avatar } = req.body;
        const errors = {};

        // Validasyonlar
        if (firstName && (firstName.length < 2 || firstName.length > 50)) {
            errors.firstName = 'İsim 2-50 karakter arasında olmalıdır';
        }
        if (lastName && (lastName.length < 2 || lastName.length > 50)) {
            errors.lastName = 'Soyisim 2-50 karakter arasında olmalıdır';
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = 'Geçersiz email formatı';
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz profil bilgileri',
                errors
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        // Bilgileri güncelle
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (email) user.email = email;
        if (birthDate) user.birthDate = birthDate;
        if (gender) user.gender = gender;
        if (avatar) user.avatar = avatar;

        await user.save();

        res.json({
            success: true,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                birthDate: user.birthDate,
                gender: user.gender,
                avatar: user.avatar,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Profil güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Profil güncellenirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     summary: Hesap sil
 *     description: Kullanıcı hesabın�� siler
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *                 message:
 *                   type: string
 */
router.delete('/account', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        // Rehber kontrolü
        if (user.role === 'guide') {
            const hasActiveGroups = await TourGroup.exists({
                guide: user._id,
                isActive: true,
                'members.status': 'active'
            });

            if (hasActiveGroups) {
                return res.status(403).json({
                    success: false,
                    message: 'Aktif grup üyelikleri olan rehberler hesaplarını silemez'
                });
            }
        }

        user.status = 'deleted';
        user.refreshToken = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Hesap başarıyla silindi'
        });
    } catch (error) {
        console.error('Hesap silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Hesap silinirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/users/device-token:
 *   post:
 *     summary: Cihaz token'ı güncelle
 *     description: Push bildirimleri için cihaz token'ını günceller
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - platform
 *             properties:
 *               token:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
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
 *                 message:
 *                   type: string
 */
router.post('/device-token', verifyToken, async (req, res) => {
    try {
        const { token, platform } = req.body;

        if (!token || !['ios', 'android'].includes(platform)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz token veya platform'
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        user.deviceToken = token;
        user.platform = platform;
        await user.save();

        res.json({
            success: true,
            message: 'Cihaz token\'ı güncellendi'
        });
    } catch (error) {
        console.error('Cihaz token güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Cihaz token\'ı güncellenirken bir hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;
