const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken, authorize } = require('../middleware/authMiddleware');
const TourGroup = require('../models/TourGroup');
const Message = require('../models/Message');
const mongoose = require('mongoose');
const os = require('os');
const MetricsService = require('../services/MetricsService');

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Tüm kullanıcıları listele
 *     description: Sistemdeki tüm kullanıcıları listeler (Sadece admin rolü için)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: İsim, soyisim veya telefon numarasına göre arama
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, guide, admin]
 *         description: Rol filtreleme
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, blocked]
 *         description: Durum filtreleme
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
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
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
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
 *       403:
 *         description: Yetkisiz erişim
 */
router.get('/users', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { search, role, status, page = 1, limit = 20 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) {
            query.role = role;
        }

        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;
        const total = await User.countDocuments(query);

        const users = await User.find(query)
            .select('-refreshToken -password')
            .skip(skip)
            .limit(parseInt(limit))
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
            })),
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
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
 * /api/admin/users/{userId}:
 *   get:
 *     summary: Kullanıcı detaylarını görüntüle
 *     description: Belirtilen kullanıcının detaylı bilgilerini görüntüler
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
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
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.get('/users/:userId', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('-refreshToken -password');

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
                phoneNumber: user.phoneNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                status: user.status,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                lastLogin: user.lastLogin,
                blockReason: user.blockReason
            }
        });
    } catch (error) {
        console.error('Kullanıcı detay görüntüleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcı detayları görüntülenirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/users/{userId}/role:
 *   patch:
 *     summary: Kullanıcı rolünü güncelle
 *     description: Belirtilen kullanıcının rolünü günceller
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, guide, admin]
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
 *                     role:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 */
router.patch('/users/:userId/role', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { role } = req.body;

        if (!role || !['user', 'guide', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz rol değeri'
            });
        }

        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        // Kendisinin rolünü değiştirmesini engelle
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Kendi rolünüzü değiştiremezsiniz'
            });
        }

        user.role = role;
        await user.save();

        res.json({
            success: true,
            user: {
                _id: user._id,
                role: user.role,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error('Kullanıcı rolü güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcı rolü güncellenirken bir hata oluştu',
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

/**
 * @swagger
 * /api/admin/guides/pending:
 *   get:
 *     summary: Onay bekleyen rehberleri listele
 *     description: Sistemde onay bekleyen rehberleri listeler
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
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
 *                         properties:
 *                           experience:
 *                             type: number
 *                           languages:
 *                             type: array
 *                             items:
 *                               type: string
 *                           certifications:
 *                             type: array
 *                             items:
 *                               type: string
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
router.get('/guides/pending', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const query = { 
            role: 'guide',
            'guideInfo.approvalStatus': 'pending'
        };

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
        console.error('Onay bekleyen rehberleri listeleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Onay bekleyen rehberler listelenirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/guides/{guideId}/approve:
 *   post:
 *     summary: Rehber başvurusunu onayla
 *     description: Rehber başvurusunu onaylar ve rehberi aktif eder
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: guideId
 *         required: true
 *         schema:
 *           type: string
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
 *                     approvalStatus:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 */
router.post('/guides/:guideId/approve', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const guide = await User.findOne({
            _id: req.params.guideId,
            role: 'guide',
            'guideInfo.approvalStatus': 'pending'
        });

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: 'Onay bekleyen rehber bulunamadı'
            });
        }

        guide.guideInfo.approvalStatus = 'approved';
        guide.status = 'active';
        await guide.save();

        res.json({
            success: true,
            guide: {
                _id: guide._id,
                approvalStatus: guide.guideInfo.approvalStatus,
                updatedAt: guide.updatedAt
            }
        });
    } catch (error) {
        console.error('Rehber onaylama hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Rehber onaylanırken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/guides/{guideId}/reject:
 *   post:
 *     summary: Rehber başvurusunu reddet
 *     description: Rehber başvurusunu reddeder
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: guideId
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Ret sebebi
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
 *                     approvalStatus:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 */
router.post('/guides/:guideId/reject', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Ret sebebi belirtilmelidir'
            });
        }

        const guide = await User.findOne({
            _id: req.params.guideId,
            role: 'guide',
            'guideInfo.approvalStatus': 'pending'
        });

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: 'Onay bekleyen rehber bulunamadı'
            });
        }

        guide.guideInfo.approvalStatus = 'rejected';
        guide.guideInfo.rejectionReason = reason;
        guide.status = 'blocked';
        await guide.save();

        res.json({
            success: true,
            guide: {
                _id: guide._id,
                approvalStatus: guide.guideInfo.approvalStatus,
                updatedAt: guide.updatedAt
            }
        });
    } catch (error) {
        console.error('Rehber reddetme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Rehber reddedilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/groups:
 *   get:
 *     summary: Tüm grupları listele
 *     description: Sistemdeki tüm grupları listeler (Sadece admin rolü için)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Grup adına göre arama
 *       - in: query
 *         name: guideId
 *         schema:
 *           type: string
 *         description: Rehber ID'sine göre filtreleme
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Durum filtreleme
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
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
 *                 groups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TourGroup'
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
 *       403:
 *         description: Yetkisiz erişim
 */
router.get('/groups', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { search, guideId, status, page = 1, limit = 20 } = req.query;
        const query = {};

        // Arama filtresi
        if (search && search !== 'undefined') {
            query.name = { $regex: search, $options: 'i' };
        }

        // Rehber filtresi
        if (guideId && guideId !== 'undefined') {
            query.guide = guideId;
        }

        // Durum filtresi
        if (status && status !== 'undefined') {
            query.isActive = status === 'active';
        }

        const skip = (page - 1) * limit;
        const total = await TourGroup.countDocuments(query);

        const groups = await TourGroup.find(query)
            .populate('guide', 'firstName lastName phoneNumber')
            .skip(skip)
            .limit(parseInt(limit))
            .sort('-createdAt');

        const formattedGroups = groups.map(group => ({
            _id: group._id,
            name: group.name,
            description: group.description,
            guide: {
                _id: group.guide._id,
                firstName: group.guide.firstName,
                lastName: group.guide.lastName,
                phoneNumber: group.guide.phoneNumber
            },
            memberCount: group.members ? group.members.length : 0,
            isActive: group.isActive,
            startDate: group.startDate,
            endDate: group.endDate,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt
        }));

        res.json({
            success: true,
            groups: formattedGroups,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Grup listeleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Gruplar listelenirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/groups/{groupId}:
 *   get:
 *     summary: Grup detaylarını getir
 *     description: Belirtilen ID'ye sahip grubun detaylı bilgilerini getirir (Sadece admin rolü için)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Grup ID'si
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
 *                 group:
 *                   $ref: '#/components/schemas/TourGroup'
 *       404:
 *         description: Grup bulunamadı
 *       403:
 *         description: Yetkisiz erişim
 */
router.get('/groups/:groupId', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await TourGroup.findById(groupId)
            .populate('guide', 'firstName lastName phoneNumber email')
            .populate('members', 'firstName lastName phoneNumber email');

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Grup bulunamadı'
            });
        }

        const formattedGroup = {
            _id: group._id,
            name: group.name,
            description: group.description,
            guide: {
                _id: group.guide._id,
                firstName: group.guide.firstName,
                lastName: group.guide.lastName,
                phoneNumber: group.guide.phoneNumber,
                email: group.guide.email
            },
            members: group.members.map(member => ({
                _id: member._id,
                firstName: member.firstName,
                lastName: member.lastName,
                phoneNumber: member.phoneNumber,
                email: member.email
            })),
            memberCount: group.members.length,
            isActive: group.isActive,
            startDate: group.startDate,
            endDate: group.endDate,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt
        };

        res.json({
            success: true,
            group: formattedGroup
        });
    } catch (error) {
        console.error('Grup detayları getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Grup detayları alınırken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/groups/{groupId}/status:
 *   patch:
 *     summary: Grup durumunu güncelle
 *     description: Belirtilen grubun durumunu günceller
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
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
 *                 enum: [active, inactive]
 *               reason:
 *                 type: string
 *                 description: status=inactive ise zorunlu
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
 *                 group:
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
router.patch('/groups/:groupId/status', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { status, reason } = req.body;

        if (!status || (status === 'inactive' && !reason)) {
            return res.status(400).json({
                success: false,
                message: 'Status ve inactive durumunda sebep belirtilmelidir'
            });
        }

        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz status değeri'
            });
        }

        const group = await TourGroup.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Grup bulunamadı'
            });
        }

        group.status = status;
        group.inactiveReason = status === 'inactive' ? reason : undefined;
        await group.save();

        res.json({
            success: true,
            group: {
                _id: group._id,
                status: group.status,
                updatedAt: group.updatedAt
            }
        });
    } catch (error) {
        console.error('Grup durumu güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Grup durumu güncellenirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/users/{userId}/statistics:
 *   get:
 *     summary: Kullanıcı istatistiklerini getir
 *     description: Belirtilen kullanıcının tüm sistem istatistiklerini getirir
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
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
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     totalGroups:
 *                       type: integer
 *                     activeGroups:
 *                       type: integer
 *                     totalMessages:
 *                       type: integer
 *                     lastLoginAt:
 *                       type: string
 *                       format: date-time
 *                     completedTours:
 *                       type: integer
 *                     totalTimeInSystem:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 */
router.get('/users/:userId/statistics', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        // Grup üyeliklerini say
        const totalGroups = await GroupMember.countDocuments({ user: user._id });
        const activeGroups = await GroupMember.countDocuments({
            user: user._id,
            'group.status': 'active'
        });

        // Toplam mesaj sayısı
        const totalMessages = await Message.countDocuments({ sender: user._id });

        // Tamamlanan tur sayısı (inactive olan gruplar)
        const completedTours = await GroupMember.countDocuments({
            user: user._id,
            'group.status': 'inactive'
        });

        // Sistemde geçirilen toplam süre (gün olarak)
        const totalTimeInSystem = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

        res.json({
            success: true,
            statistics: {
                totalGroups,
                activeGroups,
                totalMessages,
                lastLoginAt: user.lastLogin,
                completedTours,
                totalTimeInSystem,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Kullanıcı istatistikleri getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcı istatistikleri getirilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/guides/{guideId}/performance:
 *   get:
 *     summary: Rehber performans istatistiklerini getir
 *     description: Belirtilen rehberin performans istatistiklerini getirir
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: guideId
 *         required: true
 *         schema:
 *           type: string
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
 *                 performance:
 *                   type: object
 *                   properties:
 *                     totalGroups:
 *                       type: integer
 *                     activeGroups:
 *                       type: integer
 *                     completedTours:
 *                       type: integer
 *                     totalMembers:
 *                       type: integer
 *                     averageGroupSize:
 *                       type: number
 *                     messageResponseRate:
 *                       type: number
 *                     totalFeedbacks:
 *                       type: integer
 *                     averageRating:
 *                       type: number
 */
router.get('/guides/:guideId/performance', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const guide = await User.findOne({
            _id: req.params.guideId,
            role: 'guide'
        });

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: 'Rehber bulunamadı'
            });
        }

        // Tüm grupları getir
        const totalGroups = await TourGroup.countDocuments({ guide: guide._id });
        const activeGroups = await TourGroup.countDocuments({ 
            guide: guide._id,
            status: 'active'
        });
        const completedTours = await TourGroup.countDocuments({
            guide: guide._id,
            status: 'inactive'
        });

        // Toplam üye sayısı ve ortalama grup büyüklüğü
        const groups = await TourGroup.find({ guide: guide._id });
        let totalMembers = 0;
        for (const group of groups) {
            const memberCount = await GroupMember.countDocuments({ group: group._id });
            totalMembers += memberCount;
        }
        const averageGroupSize = totalGroups > 0 ? totalMembers / totalGroups : 0;

        // Mesaj yanıtlama oranı (son 30 gün)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const totalGroupMessages = await Message.countDocuments({
            group: { $in: groups.map(g => g._id) },
            createdAt: { $gte: thirtyDaysAgo }
        });
        const guideResponses = await Message.countDocuments({
            sender: guide._id,
            createdAt: { $gte: thirtyDaysAgo }
        });
        const messageResponseRate = totalGroupMessages > 0 ? guideResponses / totalGroupMessages : 0;

        res.json({
            success: true,
            performance: {
                totalGroups,
                activeGroups,
                completedTours,
                totalMembers,
                averageGroupSize,
                messageResponseRate,
                totalFeedbacks: 0, // Gelecekte feedback sistemi eklendiğinde güncellenecek
                averageRating: 0 // Gelecekte feedback sistemi eklendiğinde güncellenecek
            }
        });
    } catch (error) {
        console.error('Rehber performans istatistikleri getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Rehber performans istatistikleri getirilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/guides/{guideId}/groups:
 *   get:
 *     summary: Rehberin gruplarını getir
 *     description: Belirtilen rehberin tüm gruplarını ve detaylarını getirir
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: guideId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Grup durumu filtresi
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
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
 *                 groups:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                       memberCount:
 *                         type: integer
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       lastActivityAt:
 *                         type: string
 *                         format: date-time
 *                       totalMessages:
 *                         type: integer
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
router.get('/guides/:guideId/groups', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const query = { guide: req.params.guideId };

        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;
        const total = await TourGroup.countDocuments(query);

        const groups = await TourGroup.find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .sort('-createdAt');

        const groupDetails = await Promise.all(groups.map(async group => {
            const memberCount = await GroupMember.countDocuments({ group: group._id });
            const totalMessages = await Message.countDocuments({ group: group._id });
            const lastMessage = await Message.findOne({ group: group._id })
                .sort('-createdAt');

            return {
                _id: group._id,
                name: group.name,
                status: group.status,
                memberCount,
                startDate: group.startDate,
                endDate: group.endDate,
                lastActivityAt: lastMessage ? lastMessage.createdAt : group.updatedAt,
                totalMessages
            };
        }));

        res.json({
            success: true,
            groups: groupDetails,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Rehber grupları getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Rehber grupları getirilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/statistics/system:
 *   get:
 *     summary: Genel sistem istatistiklerini getir
 *     description: Sistemdeki tüm kullanıcı, grup ve mesaj istatistiklerini getirir
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi
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
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                     activeUsers:
 *                       type: integer
 *                     totalGuides:
 *                       type: integer
 *                     activeGuides:
 *                       type: integer
 *                     totalGroups:
 *                       type: integer
 *                     activeGroups:
 *                       type: integer
 *                     totalMessages:
 *                       type: integer
 *                     averageGroupSize:
 *                       type: number
 *                     averageMessagesPerGroup:
 *                       type: number
 *                     dailyActiveUsers:
 *                       type: integer
 *                     monthlyActiveUsers:
 *                       type: integer
 */
router.get('/statistics/system', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = {};
        
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Kullanıcı istatistikleri
        const totalUsers = await User.countDocuments({ role: 'user', ...dateFilter });
        const activeUsers = await User.countDocuments({ role: 'user', status: 'active', ...dateFilter });
        const totalGuides = await User.countDocuments({ role: 'guide', ...dateFilter });
        const activeGuides = await User.countDocuments({ role: 'guide', status: 'active', ...dateFilter });

        // Grup istatistikleri
        const totalGroups = await TourGroup.countDocuments(dateFilter);
        const activeGroups = await TourGroup.countDocuments({ status: 'active', ...dateFilter });

        // Mesaj istatistikleri
        const totalMessages = await Message.countDocuments(dateFilter);

        // Ortalama grup büyüklüğü
        const groups = await TourGroup.find(dateFilter);
        let totalMembers = 0;
        for (const group of groups) {
            const memberCount = await GroupMember.countDocuments({ group: group._id });
            totalMembers += memberCount;
        }
        const averageGroupSize = totalGroups > 0 ? totalMembers / totalGroups : 0;
        const averageMessagesPerGroup = totalGroups > 0 ? totalMessages / totalGroups : 0;

        // Aktif kullanıcı istatistikleri
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const dailyActiveUsers = await User.countDocuments({
            lastLogin: { $gte: oneDayAgo }
        });

        const monthlyActiveUsers = await User.countDocuments({
            lastLogin: { $gte: oneMonthAgo }
        });

        res.json({
            success: true,
            statistics: {
                totalUsers,
                activeUsers,
                totalGuides,
                activeGuides,
                totalGroups,
                activeGroups,
                totalMessages,
                averageGroupSize,
                averageMessagesPerGroup,
                dailyActiveUsers,
                monthlyActiveUsers
            }
        });
    } catch (error) {
        console.error('Sistem istatistikleri getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sistem istatistikleri getirilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/reports/activity:
 *   get:
 *     summary: Aktivite raporu getir
 *     description: Belirli bir tarih aralığı için detaylı aktivite raporu oluşturur
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *         description: Rapor periyodu
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
 *                 report:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       newUsers:
 *                         type: integer
 *                       activeUsers:
 *                         type: integer
 *                       newGroups:
 *                         type: integer
 *                       totalMessages:
 *                         type: integer
 *                       activeGroups:
 *                         type: integer
 */
router.get('/reports/activity', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { startDate, endDate, type = 'daily' } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Başlangıç ve bitiş tarihi gereklidir'
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const report = [];

        let currentDate = new Date(start);
        while (currentDate <= end) {
            const nextDate = new Date(currentDate);
            switch (type) {
                case 'weekly':
                    nextDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'monthly':
                    nextDate.setMonth(currentDate.getMonth() + 1);
                    break;
                default: // daily
                    nextDate.setDate(currentDate.getDate() + 1);
            }

            const periodData = {
                date: new Date(currentDate),
                newUsers: await User.countDocuments({
                    createdAt: {
                        $gte: currentDate,
                        $lt: nextDate
                    }
                }),
                activeUsers: await User.countDocuments({
                    lastLogin: {
                        $gte: currentDate,
                        $lt: nextDate
                    }
                }),
                newGroups: await TourGroup.countDocuments({
                    createdAt: {
                        $gte: currentDate,
                        $lt: nextDate
                    }
                }),
                totalMessages: await Message.countDocuments({
                    createdAt: {
                        $gte: currentDate,
                        $lt: nextDate
                    }
                }),
                activeGroups: await TourGroup.countDocuments({
                    status: 'active',
                    createdAt: {
                        $lte: nextDate
                    },
                    $or: [
                        { endDate: { $gte: currentDate } },
                        { endDate: null }
                    ]
                })
            };

            report.push(periodData);
            currentDate = nextDate;
        }

        res.json({
            success: true,
            report
        });
    } catch (error) {
        console.error('Aktivite raporu oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Aktivite raporu oluşturulurken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/metrics/performance:
 *   get:
 *     summary: Sistem performans metriklerini getir
 *     description: Sistemin genel performans metriklerini ve sağlık durumunu getirir
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
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     responseTime:
 *                       type: object
 *                       properties:
 *                         average:
 *                           type: number
 *                         max:
 *                           type: number
 *                         min:
 *                           type: number
 *                     memoryUsage:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         used:
 *                           type: number
 *                         free:
 *                           type: number
 *                     databaseMetrics:
 *                       type: object
 *                       properties:
 *                         connections:
 *                           type: number
 *                         activeQueries:
 *                           type: number
 *                         averageQueryTime:
 *                           type: number
 *                     systemLoad:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: number
 *                         average:
 *                           type: number
 *                     uptime:
 *                       type: number
 */
router.get('/metrics/performance', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const startTime = process.hrtime();

        // Sistem bellek kullanımı
        const memoryUsage = process.memoryUsage();
        
        // MongoDB bağlantı metrikleri
        const dbStats = await mongoose.connection.db.admin().serverStatus();
        
        // Sistem yükü
        const loadavg = os.loadavg();
        
        // Ortalama yanıt süresi hesaplama
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const responseTime = seconds * 1000 + nanoseconds / 1000000;

        // Son 5 dakikadaki ortalama yanıt süresi
        const averageResponseTime = await calculateAverageResponseTime();

        res.json({
            success: true,
            metrics: {
                responseTime: {
                    average: averageResponseTime,
                    current: responseTime,
                    max: await getMaxResponseTime(),
                    min: await getMinResponseTime()
                },
                memoryUsage: {
                    total: memoryUsage.heapTotal / 1024 / 1024, // MB cinsinden
                    used: memoryUsage.heapUsed / 1024 / 1024,
                    free: (memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024
                },
                databaseMetrics: {
                    connections: dbStats.connections.current,
                    activeQueries: dbStats.globalLock.activeClients.total,
                    averageQueryTime: dbStats.opcounters.query / dbStats.uptime
                },
                systemLoad: {
                    current: loadavg[0],
                    average: loadavg[1]
                },
                uptime: process.uptime()
            }
        });
    } catch (error) {
        console.error('Performans metrikleri getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Performans metrikleri getirilirken bir hata oluştu',
            error: error.message
        });
    }
});

// Yardımcı fonksiyonlar
async function calculateAverageResponseTime() {
    // Son 5 dakikadaki ortalama yanıt süresini hesapla
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const metrics = await ResponseMetric.find({
        timestamp: { $gte: fiveMinutesAgo }
    });
    
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, metric) => sum + metric.responseTime, 0);
    return total / metrics.length;
}

async function getMaxResponseTime() {
    const metric = await ResponseMetric.findOne({
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    }).sort('-responseTime');
    return metric ? metric.responseTime : 0;
}

async function getMinResponseTime() {
    const metric = await ResponseMetric.findOne({
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    }).sort('responseTime');
    return metric ? metric.responseTime : 0;
}

/**
 * @swagger
 * /api/admin/notifications:
 *   post:
 *     summary: Sistem bildirimi gönder
 *     description: Seçili kullanıcılara veya tüm kullanıcılara sistem bildirimi gönderir
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Bildirim gönderilecek kullanıcı ID'leri. Boş bırakılırsa tüm kullanıcılara gönderilir.
 *               title:
 *                 type: string
 *                 description: Bildirim başlığı
 *               message:
 *                 type: string
 *                 description: Bildirim mesajı
 *               type:
 *                 type: string
 *                 enum: [system_alert, guide_approval, guide_rejection, user_block, user_unblock]
 *                 default: system_alert
 *               expiresIn:
 *                 type: number
 *                 description: Bildirimin geçerlilik süresi (saat cinsinden)
 *                 default: 720
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
 *                 sentCount:
 *                   type: integer
 */
router.post('/notifications', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { recipients, title, message, type = 'system_alert', expiresIn = 720 } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Başlık ve mesaj alanları zorunludur'
            });
        }

        let userQuery = {};
        if (recipients && recipients.length > 0) {
            userQuery._id = { $in: recipients };
        }

        const users = await User.find(userQuery).select('_id');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiresIn);

        const notifications = users.map(user => ({
            recipient: user._id,
            type,
            title,
            message,
            expiresAt
        }));

        await Notification.insertMany(notifications);

        res.json({
            success: true,
            sentCount: notifications.length
        });
    } catch (error) {
        console.error('Bildirim gönderme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim gönderilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/notifications:
 *   get:
 *     summary: Bildirimleri listele
 *     description: Sistemdeki bildirimleri filtreler ve listeler
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Bildirim tipi filtresi
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi
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
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       type:
 *                         type: string
 *                       title:
 *                         type: string
 *                       message:
 *                         type: string
 *                       recipient:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                       isRead:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       expiresAt:
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
router.get('/notifications', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { type, startDate, endDate, page = 1, limit = 20 } = req.query;
        const query = {};

        if (type) {
            query.type = type;
        }

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const skip = (page - 1) * limit;
        const total = await Notification.countDocuments(query);

        const notifications = await Notification.find(query)
            .populate('recipient', 'firstName lastName')
            .sort('-createdAt')
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            notifications,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Bildirim listeleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirimler listelenirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/notifications/{notificationId}:
 *   delete:
 *     summary: Bildirimi sil
 *     description: Belirtilen bildirimi sistemden siler
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
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
 */
router.delete('/notifications/:notificationId', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const notification = await Notification.findByIdAndDelete(req.params.notificationId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Bildirim bulunamadı'
            });
        }

        res.json({
            success: true
        });
    } catch (error) {
        console.error('Bildirim silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim silinirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/system/logs:
 *   get:
 *     summary: Sistem loglarını getir
 *     description: Sistem loglarını filtreler ve listeler
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [info, warning, error, critical]
 *         description: Log seviyesi filtresi
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [system, auth, database, api, bluetooth, notification]
 *         description: Log kategorisi filtresi
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: boolean
 *         description: Çözülmüş/çözülmemiş log filtresi
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
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       level:
 *                         type: string
 *                       category:
 *                         type: string
 *                       message:
 *                         type: string
 *                       details:
 *                         type: object
 *                       source:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       resolved:
 *                         type: boolean
 *                       resolvedAt:
 *                         type: string
 *                         format: date-time
 *                       resolvedBy:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                       resolution:
 *                         type: string
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
router.get('/system/logs', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { level, category, startDate, endDate, resolved, page = 1, limit = 20 } = req.query;
        const query = {};

        if (level) {
            query.level = level;
        }

        if (category) {
            query.category = category;
        }

        if (typeof resolved === 'boolean') {
            query.resolved = resolved;
        }

        if (startDate && endDate) {
            query.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const skip = (page - 1) * limit;
        const total = await SystemLog.countDocuments(query);

        const logs = await SystemLog.find(query)
            .populate('resolvedBy', 'firstName lastName')
            .sort('-timestamp')
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            logs,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Sistem logları getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sistem logları getirilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/system/logs/{logId}/resolve:
 *   patch:
 *     summary: Sistem logunu çöz
 *     description: Belirtilen sistem logunu çözüldü olarak işaretler
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: logId
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
 *               - resolution
 *             properties:
 *               resolution:
 *                 type: string
 *                 description: Çözüm açıklaması
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
 *                 log:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     resolved:
 *                       type: boolean
 *                     resolvedAt:
 *                       type: string
 *                       format: date-time
 *                     resolution:
 *                       type: string
 */
router.patch('/system/logs/:logId/resolve', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { resolution } = req.body;

        if (!resolution) {
            return res.status(400).json({
                success: false,
                message: 'Çözüm açıklaması gereklidir'
            });
        }

        const log = await SystemLog.findById(req.params.logId);

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Log bulunamadı'
            });
        }

        log.resolved = true;
        log.resolvedAt = new Date();
        log.resolvedBy = req.user._id;
        log.resolution = resolution;
        await log.save();

        res.json({
            success: true,
            log: {
                _id: log._id,
                resolved: log.resolved,
                resolvedAt: log.resolvedAt,
                resolution: log.resolution
            }
        });
    } catch (error) {
        console.error('Log çözme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Log çözülürken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/system/settings:
 *   get:
 *     summary: Sistem ayarlarını getir
 *     description: Tüm sistem ayarlarını kategorilere göre getirir
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [general, security, notification, performance, maintenance]
 *         description: Ayar kategorisi filtresi
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
 *                 settings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       value:
 *                         type: object
 *                       category:
 *                         type: string
 *                       description:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       updatedBy:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 */
router.get('/system/settings', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { category } = req.query;
        const query = {};

        if (category) {
            query.category = category;
        }

        const settings = await SystemSetting.find(query)
            .populate('updatedBy', 'firstName lastName')
            .sort('category key');

        res.json({
            success: true,
            settings
        });
    } catch (error) {
        console.error('Sistem ayarları getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sistem ayarları getirilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/system/settings/{key}:
 *   patch:
 *     summary: Sistem ayarını güncelle
 *     description: Belirtilen sistem ayarının değerini günceller
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
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
 *               - value
 *             properties:
 *               value:
 *                 type: object
 *                 description: Ayarın yeni değeri
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
 *                 setting:
 *                   type: object
 *                   properties:
 *                     key:
 *                       type: string
 *                     value:
 *                       type: object
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 */
router.patch('/system/settings/:key', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { value } = req.body;

        if (value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Ayar değeri gereklidir'
            });
        }

        const setting = await SystemSetting.findOne({ key: req.params.key });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Ayar bulunamadı'
            });
        }

        setting.value = value;
        setting.updatedAt = new Date();
        setting.updatedBy = req.user._id;
        await setting.save();

        res.json({
            success: true,
            setting: {
                key: setting.key,
                value: setting.value,
                updatedAt: setting.updatedAt
            }
        });
    } catch (error) {
        console.error('Sistem ayarı güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sistem ayarı güncellenirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/metrics/system:
 *   get:
 *     summary: Sistem performans metriklerini getir
 *     description: Sistem performans metriklerini (CPU, bellek, MongoDB durumu) getirir
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
 *                 metrics:
 *                   type: object
 *       403:
 *         description: Yetkisiz erişim
 */
router.get('/metrics/system', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const metrics = await MetricsService.getSystemMetrics();
        res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Sistem metrikleri alma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sistem metrikleri alınırken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/metrics/application:
 *   get:
 *     summary: Uygulama metriklerini getir
 *     description: Uygulama metriklerini (kullanıcı, grup, mesaj istatistikleri) getirir
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
 *                 metrics:
 *                   type: object
 *       403:
 *         description: Yetkisiz erişim
 */
router.get('/metrics/application', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const metrics = await MetricsService.getApplicationMetrics();
        res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Uygulama metrikleri alma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Uygulama metrikleri alınırken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/metrics/errors:
 *   get:
 *     summary: Hata metriklerini getir
 *     description: Hata metriklerini (hata sayıları, türleri, sıklığı) getirir
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
 *                 metrics:
 *                   type: object
 *       403:
 *         description: Yetkisiz erişim
 */
router.get('/metrics/errors', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const metrics = await MetricsService.getErrorMetrics();
        res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Hata metrikleri alma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Hata metrikleri alınırken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/groups/{groupId}/stats:
 *   get:
 *     summary: Grup istatistiklerini getir
 *     description: Belirtilen grubun istatistiksel verilerini getirir (Sadece admin rolü için)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Grup ID'si
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
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalMembers:
 *                       type: integer
 *                     activeMembers:
 *                       type: integer
 *                     totalMessages:
 *                       type: integer
 *                     lastActivityDate:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Grup bulunamadı
 *       403:
 *         description: Yetkisiz erişim
 */
router.get('/groups/:groupId/stats', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await TourGroup.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Grup bulunamadı'
            });
        }

        // Grup istatistiklerini hesapla
        const totalMembers = group.members ? group.members.length : 0;
        const activeMembers = group.members ? group.members.filter(member => member.isActive).length : 0;
        
        // Son aktivite tarihini bul
        const lastMessage = await Message.findOne({ group: groupId })
            .sort('-createdAt')
            .select('createdAt');

        // Toplam mesaj sayısını bul
        const totalMessages = await Message.countDocuments({ group: groupId });

        res.json({
            success: true,
            stats: {
                totalMembers,
                activeMembers,
                totalMessages,
                lastActivityDate: lastMessage ? lastMessage.createdAt : group.createdAt
            }
        });
    } catch (error) {
        console.error('Grup istatistikleri getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Grup istatistikleri alınırken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/groups/{groupId}/members:
 *   get:
 *     summary: Grup üyelerini getir
 *     description: Belirtilen grubun üye listesini getirir (Sadece admin rolü için)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Grup ID'si
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: İsim veya telefon numarasına göre arama
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Durum filtreleme
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
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
 *                 members:
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
 *                       isActive:
 *                         type: boolean
 *                       joinDate:
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
 *       404:
 *         description: Grup bulunamadı
 *       403:
 *         description: Yetkisiz erişim
 */
router.get('/groups/:groupId/members', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { groupId } = req.params;
        const { search, status, page = 1, limit = 20 } = req.query;

        const group = await TourGroup.findById(groupId)
            .populate({
                path: 'members',
                select: 'firstName lastName phoneNumber email isActive createdAt'
            });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Grup bulunamadı'
            });
        }

        let members = group.members || [];

        // Arama filtresi
        if (search && search !== 'undefined') {
            const searchRegex = new RegExp(search, 'i');
            members = members.filter(member => 
                searchRegex.test(member.firstName) || 
                searchRegex.test(member.lastName) || 
                searchRegex.test(member.phoneNumber)
            );
        }

        // Durum filtresi
        if (status && status !== 'undefined') {
            const isActive = status === 'active';
            members = members.filter(member => member.isActive === isActive);
        }

        // Sayfalama
        const total = members.length;
        const skip = (page - 1) * limit;
        members = members.slice(skip, skip + parseInt(limit));

        const formattedMembers = members.map(member => ({
            _id: member._id,
            firstName: member.firstName,
            lastName: member.lastName,
            phoneNumber: member.phoneNumber,
            email: member.email,
            isActive: member.isActive,
            joinDate: member.createdAt
        }));

        res.json({
            success: true,
            members: formattedMembers,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Grup üyeleri getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Grup üyeleri alınırken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     summary: Dashboard istatistiklerini getir
 *     description: Admin paneli için genel istatistikleri ve büyüme oranlarını getirir
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Büyüme oranı periyodu
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
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                     activeGroups:
 *                       type: integer
 *                     dailyMessages:
 *                       type: integer
 *                     activeGuides:
 *                       type: integer
 *                     growth:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: number
 *                         groups:
 *                           type: number
 *                         messages:
 *                           type: number
 *                         guides:
 *                           type: number
 *       403:
 *         description: Yetkisiz erişim
 */
router.get('/dashboard/stats', verifyToken, authorize(['admin']), async (req, res) => {
    try {
        const { period = 'daily' } = req.query;

        // Tarih aralığını belirle
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'weekly':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default: // daily
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
        }

        // Genel istatistikler
        const totalUsers = await User.countDocuments({ status: { $ne: 'deleted' } });
        const activeGroups = await TourGroup.countDocuments({ isActive: true });
        const activeGuides = await User.countDocuments({ role: 'guide', status: 'active' });
        const dailyMessages = await Message.countDocuments({
            createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        });

        // Önceki dönem için tarih aralığı
        const previousStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));

        // Büyüme oranları için veri toplama
        const [currentPeriod, previousPeriod] = await Promise.all([
            // Mevcut dönem
            Promise.all([
                User.countDocuments({ createdAt: { $gte: startDate } }),
                TourGroup.countDocuments({ createdAt: { $gte: startDate } }),
                Message.countDocuments({ createdAt: { $gte: startDate } }),
                User.countDocuments({ role: 'guide', createdAt: { $gte: startDate } })
            ]),
            // Önceki dönem
            Promise.all([
                User.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } }),
                TourGroup.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } }),
                Message.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } }),
                User.countDocuments({ role: 'guide', createdAt: { $gte: previousStartDate, $lt: startDate } })
            ])
        ]);

        // Büyüme oranlarını hesapla
        const calculateGrowth = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const growth = {
            users: calculateGrowth(currentPeriod[0], previousPeriod[0]),
            groups: calculateGrowth(currentPeriod[1], previousPeriod[1]),
            messages: calculateGrowth(currentPeriod[2], previousPeriod[2]),
            guides: calculateGrowth(currentPeriod[3], previousPeriod[3])
        };

        res.json({
            success: true,
            stats: {
                totalUsers,
                activeGroups,
                dailyMessages,
                activeGuides,
                growth
            }
        });
    } catch (error) {
        console.error('Dashboard istatistikleri getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Dashboard istatistikleri alınırken bir hata oluştu',
            error: error.message
        });
    }
});

module.exports = router; 