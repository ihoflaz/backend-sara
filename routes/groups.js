const express = require('express');
const router = express.Router();
const TourGroup = require('../models/TourGroup');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Yeni grup oluştur
 *     description: Admin veya rehber rolüne sahip kullanıcılar için yeni tur grubu oluşturur
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 formatında başlangıç tarihi
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 formatında bitiş tarihi
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
 *                   example: true
 *                 group:
 *                   $ref: '#/components/schemas/TourGroup'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Kimlik doğrulama hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Yetkilendirme hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', verifyToken, authorize(['guide', 'admin']), async (req, res) => {
    try {
        const { name, description, startDate, endDate } = req.body;

        const group = new TourGroup({
            name,
            description,
            startDate,
            endDate,
            guide: req.user.id
        });

        await group.save();

        res.json({
            success: true,
            group
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Grup oluşturulurken bir hata oluştu'
        });
    }
});

/**
 * @swagger
 * /api/groups/{groupId}/invite:
 *   post:
 *     summary: Gruba üye davet et
 *     description: Rehber rolüne sahip kullanıcılar için grup davetiyesi gönderir
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Grup ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - users
 *             properties:
 *               users:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: Davet edilecek kullanıcıların ID'leri
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
 *                   example: true
 *                 invitations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user:
 *                         type: string
 *                         description: Davet edilen kullanıcı ID'si
 *                       status:
 *                         type: string
 *                         enum: [pending, accepted, rejected, expired]
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Kimlik doğrulama hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Yetkilendirme hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Grup bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:groupId/invite', verifyToken, authorize(['guide', 'admin']), async (req, res) => {
    try {
        const { users } = req.body;
        const group = await TourGroup.findOne({
            _id: req.params.groupId,
            guide: req.user.id
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Grup bulunamadı'
            });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1); // 1 gün geçerli

        const newInvitations = users.map(userId => ({
            user: userId,
            expiresAt
        }));

        group.invitations.push(...newInvitations);
        await group.save();

        res.json({
            success: true,
            invitations: group.invitations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Davet gönderilirken bir hata oluştu'
        });
    }
});

/**
 * @swagger
 * /api/groups/invitations/{groupId}/accept:
 *   post:
 *     summary: Grup davetini kabul et
 *     description: Kullanıcı için gönderilen grup davetini kabul eder
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Grup ID
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Gruba başarıyla katıldınız
 *       400:
 *         description: Geçersiz istek veya davet süresi dolmuş
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Kimlik doğrulama hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Grup veya davet bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/invitations/:groupId/accept', verifyToken, async (req, res) => {
    try {
        const group = await TourGroup.findById(req.params.groupId);
        
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Grup bulunamadı'
            });
        }

        const invitation = group.invitations.find(
            inv => inv.user.toString() === req.user.id && inv.status === 'pending'
        );

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: 'Geçerli bir davet bulunamadı'
            });
        }

        if (invitation.expiresAt < new Date()) {
            invitation.status = 'expired';
            await group.save();
            return res.status(400).json({
                success: false,
                message: 'Davet süresi dolmuş'
            });
        }

        invitation.status = 'accepted';
        group.members.push({
            user: req.user.id
        });

        await group.save();

        res.json({
            success: true,
            message: 'Gruba başarıyla katıldınız'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Davet kabul edilirken bir hata oluştu'
        });
    }
});

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Grup listesi
 *     description: Kullanıcının üye olduğu veya rehberi olduğu grupları listeler
 *     tags: [Groups]
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
 *                   example: true
 *                 groups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TourGroup'
 *       401:
 *         description: Kimlik doğrulama hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        const groups = await TourGroup.find({
            $or: [
                { guide: req.user.id },
                { 'members.user': req.user.id }
            ],
            isActive: true
        })
        .populate('guide', 'firstName lastName phoneNumber')
        .populate('members.user', 'firstName lastName phoneNumber')
        .sort('-createdAt');

        res.json({
            success: true,
            groups
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Gruplar listelenirken bir hata oluştu'
        });
    }
});

/**
 * @swagger
 * /api/groups/{groupId}:
 *   get:
 *     summary: Grup detayı
 *     description: Belirtilen grubun detay bilgilerini getirir
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
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
 *                 group:
 *                   $ref: '#/components/schemas/TourGroup'
 */
router.get('/:groupId', verifyToken, async (req, res) => {
    try {
        const group = await TourGroup.findById(req.params.groupId)
            .populate('guide', 'firstName lastName phoneNumber')
            .populate('members.user', 'firstName lastName phoneNumber');

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Grup bulunamadı'
            });
        }

        // Kullanıcının yetkisi kontrol edilir
        const isGuide = group.guide._id.toString() === req.user.id;
        const isMember = group.members.some(m => m.user._id.toString() === req.user.id && m.status === 'active');

        if (!isGuide && !isMember) {
            return res.status(403).json({
                success: false,
                message: 'Bu gruba erişim yetkiniz yok'
            });
        }

        res.json({
            success: true,
            group
        });
    } catch (error) {
        console.error('Grup detayı getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Grup detayı getirilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/groups/{groupId}/members:
 *   get:
 *     summary: Grup üyelerini listele
 *     description: Belirtilen grubun üyelerini ve davet durumlarını listeler
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
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
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           phoneNumber:
 *                             type: string
 *                       status:
 *                         type: string
 *                         enum: [active, inactive, left]
 *                       joinedAt:
 *                         type: string
 *                         format: date-time
 *                 invitations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user:
 *                         type: object
 *                       status:
 *                         type: string
 *                         enum: [pending, accepted, rejected, expired]
 *                       invitedAt:
 *                         type: string
 *                         format: date-time
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 */
router.get('/:groupId/members', verifyToken, async (req, res) => {
    try {
        const group = await TourGroup.findById(req.params.groupId)
            .populate('members.user', 'firstName lastName phoneNumber')
            .populate('invitations.user', 'firstName lastName phoneNumber');

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Grup bulunamadı'
            });
        }

        // Kullanıcının yetkisi kontrol edilir
        const isGuide = group.guide.toString() === req.user.id;
        const isMember = group.members.some(m => m.user._id.toString() === req.user.id && m.status === 'active');

        if (!isGuide && !isMember) {
            return res.status(403).json({
                success: false,
                message: 'Bu gruba erişim yetkiniz yok'
            });
        }

        res.json({
            success: true,
            members: group.members,
            invitations: group.invitations
        });
    } catch (error) {
        console.error('Grup üyeleri listeleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Grup üyeleri listelenirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/groups/{groupId}/leave:
 *   post:
 *     summary: Gruptan ayrıl
 *     description: Kullanıcının gruptan ayrılmasını sağlar (Rehberler ayrılamaz)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
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
 *                 message:
 *                   type: string
 */
router.post('/:groupId/leave', verifyToken, async (req, res) => {
    try {
        const group = await TourGroup.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Grup bulunamadı'
            });
        }

        // Rehber kontrolü
        if (group.guide.toString() === req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Rehberler gruptan ayrılamaz'
            });
        }

        const memberIndex = group.members.findIndex(
            m => m.user.toString() === req.user.id && m.status === 'active'
        );

        if (memberIndex === -1) {
            return res.status(400).json({
                success: false,
                message: 'Bu grubun aktif üyesi değilsiniz'
            });
        }

        group.members[memberIndex].status = 'left';
        await group.save();

        res.json({
            success: true,
            message: 'Gruptan başarıyla ayrıldınız'
        });
    } catch (error) {
        console.error('Gruptan ayrılma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Gruptan ayrılırken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/groups/{groupId}:
 *   delete:
 *     summary: Grup sil
 *     description: Belirtilen grubu siler (Sadece rehber veya admin)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
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
 *                 message:
 *                   type: string
 */
router.delete('/:groupId', verifyToken, authorize(['guide', 'admin']), async (req, res) => {
    try {
        const group = await TourGroup.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Grup bulunamadı'
            });
        }

        // Rehber veya admin kontrolü
        if (req.user.role !== 'admin' && group.guide.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Bu grubu silme yetkiniz yok'
            });
        }

        // Aktif üye kontrolü
        const hasActiveMembers = group.members.some(m => m.status === 'active');
        if (hasActiveMembers) {
            return res.status(400).json({
                success: false,
                message: 'Aktif üyeleri olan gruplar silinemez'
            });
        }

        group.isActive = false;
        await group.save();

        res.json({
            success: true,
            message: 'Grup başarıyla silindi'
        });
    } catch (error) {
        console.error('Grup silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Grup silinirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     TourGroup:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         guide:
 *           $ref: '#/components/schemas/User'
 *         members:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 $ref: '#/components/schemas/User'
 *               joinedAt:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [active, inactive, left]
 *         invitations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Invitation'
 *         isActive:
 *           type: boolean
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 *         description:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Invitation:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/User'
 *         status:
 *           type: string
 *           enum: [pending, accepted, rejected, expired]
 *         invitedAt:
 *           type: string
 *           format: date-time
 *         expiresAt:
 *           type: string
 *           format: date-time
 */

module.exports = router; 