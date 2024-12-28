const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Tüm kullanıcıları listele
 *     description: Sistemdeki tüm kullanıcıları listeler (Sadece admin rolü için)
 *     tags: [Admin]
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
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: Yetkisiz erişim
 */
router.get('/users', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const users = await User.find()
            .select('-refreshToken -password')
            .sort('-createdAt');

        res.json({
            success: true,
            users: users.map(user => ({
                _id: user._id,
                phoneNumber: user.phoneNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                status: user.status,
                createdAt: user.createdAt
            }))
        });
    } catch (error) {
        console.error('Kullanıcı listeleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcılar listelenirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/users/{userId}/status:
 *   patch:
 *     summary: Kullanıcı durumunu güncelle
 *     description: Kullanıcının hesap durumunu günceller (Sadece admin rolü için)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, blocked]
 *               reason:
 *                 type: string
 *                 description: status=blocked ise zorunlu
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
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 */
router.patch('/users/:userId/status', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { status, reason } = req.body;

        if (!status || (status === 'blocked' && !reason)) {
            return res.status(400).json({
                success: false,
                message: 'Status ve blocked durumunda sebep belirtilmelidir'
            });
        }

        if (!['active', 'blocked'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz status değeri'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            {
                $set: {
                    status,
                    blockReason: status === 'blocked' ? reason : undefined
                }
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        res.json({
            success: true,
            user: {
                _id: user._id,
                status: user.status,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error('Kullanıcı durumu güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcı durumu güncellenirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/guides:
 *   get:
 *     summary: Rehberleri listele
 *     description: Sistemdeki tüm rehberleri listeler (Sadece admin rolü için)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, blocked]
 *         description: Rehber durumu filtresi
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Sayfa başına kayıt sayısı
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
 *                 guides:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       phoneNumber:
 *                         type: string
 *                       email:
 *                         type: string
 *                       status:
 *                         type: string
 *                       guideInfo:
 *                         type: object
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     limit:
 *                       type: integer
 */
router.get('/guides', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const query = { role: 'guide' };

        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;
        const total = await User.countDocuments(query);

        const guides = await User.find(query)
            .select('-refreshToken -password')
            .skip(skip)
            .limit(parseInt(limit))
            .sort('-createdAt');

        res.json({
            success: true,
            guides: guides.map(guide => ({
                _id: guide._id,
                firstName: guide.firstName,
                lastName: guide.lastName,
                phoneNumber: guide.phoneNumber,
                email: guide.email,
                status: guide.status,
                guideInfo: guide.guideInfo,
                createdAt: guide.createdAt
            })),
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Rehber listeleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Rehberler listelenirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/guides/{userId}/status:
 *   patch:
 *     summary: Rehber durumunu güncelle
 *     description: Rehberin hesap durumunu günceller (Sadece admin rolü için)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, blocked]
 *               reason:
 *                 type: string
 *                 description: status=blocked ise zorunlu
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
 *                 guide:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 */
router.patch('/guides/:userId/status', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { status, reason } = req.body;

        if (!status || (status === 'blocked' && !reason)) {
            return res.status(400).json({
                success: false,
                message: 'Status ve blocked durumunda sebep belirtilmelidir'
            });
        }

        if (!['active', 'blocked'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz status değeri'
            });
        }

        const guide = await User.findOne({
            _id: req.params.userId,
            role: 'guide'
        });

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: 'Rehber bulunamadı'
            });
        }

        guide.status = status;
        if (status === 'blocked') {
            guide.blockReason = reason;
        } else {
            guide.blockReason = undefined;
        }

        await guide.save();

        res.json({
            success: true,
            guide: {
                _id: guide._id,
                status: guide.status,
                updatedAt: guide.updatedAt
            }
        });
    } catch (error) {
        console.error('Rehber durumu güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Rehber durumu güncellenirken bir hata oluştu',
            error: error.message
        });
    }
});

module.exports = router; 