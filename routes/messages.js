const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const TourGroup = require('../models/TourGroup');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         localMessageId:
 *           type: string
 *           description: İstemci tarafında oluşturulan benzersiz mesaj ID'si
 *         groupId:
 *           type: string
 *           description: Mesajın ait olduğu grup ID'si
 *         sender:
 *           $ref: '#/components/schemas/User'
 *         content:
 *           type: string
 *           description: Mesaj içeriği
 *         type:
 *           type: string
 *           enum: [text, image, location, file]
 *           description: Mesaj tipi
 *         status:
 *           type: string
 *           enum: [sent, delivered, read, failed]
 *           description: Mesaj durumu
 *         sentAt:
 *           type: string
 *           format: date-time
 *           description: Mesajın gönderilme zamanı (istemci saati)
 *         syncedAt:
 *           type: string
 *           format: date-time
 *           description: Mesajın sunucuya senkronize edilme zamanı
 *         metadata:
 *           type: object
 *           description: Mesaj tipine göre ek bilgiler
 */

/**
 * @swagger
 * /api/messages/groups/{groupId}/messages:
 *   get:
 *     summary: Grup mesajlarını getir
 *     description: Belirtilen grubun mesajlarını getirir
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Grup ID
 *       - in: query
 *         name: lastSyncTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Son senkronizasyon zamanı (ISO 8601 formatında)
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
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
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
router.get('/groups/:groupId/messages', verifyToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { lastSyncTime } = req.query;

        // Grup üyeliği kontrolü
        const group = await TourGroup.findOne({
            _id: groupId,
            $or: [
                { guide: req.user.id },
                { 'members.user': req.user.id, 'members.status': 'active' }
            ]
        });

        if (!group) {
            return res.status(403).json({
                success: false,
                message: 'Bu grubun mesajlarına erişim yetkiniz yok'
            });
        }

        // Mesajları getir
        const query = { groupId };
        if (lastSyncTime) {
            query.sentAt = { $gt: new Date(lastSyncTime) };
        }

        const messages = await Message.find(query)
            .populate('sender', 'firstName lastName phoneNumber')
            .sort('sentAt');

        res.json({
            success: true,
            messages: messages.map(msg => ({
                _id: msg._id,
                localMessageId: msg.localMessageId,
                groupId: msg.groupId,
                sender: msg.sender,
                content: msg.content,
                type: msg.type,
                status: msg.status,
                sentAt: msg.sentAt,
                syncedAt: msg.syncedAt,
                metadata: msg.metadata
            }))
        });
    } catch (error) {
        console.error('Grup mesajları getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Mesajlar getirilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/messages/sync:
 *   post:
 *     summary: Mesajları senkronize et
 *     description: Yerel mesajları sunucu ile senkronize eder
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - localMessageId
 *                     - groupId
 *                     - content
 *                     - type
 *                     - sentAt
 *                   properties:
 *                     localMessageId:
 *                       type: string
 *                       description: İstemci tarafında oluşturulan benzersiz mesaj ID'si
 *                     groupId:
 *                       type: string
 *                       description: Mesajın ait olduğu grup ID'si
 *                     content:
 *                       type: string
 *                       description: Mesaj içeriği
 *                     type:
 *                       type: string
 *                       enum: [text, image, location]
 *                       description: Mesaj tipi
 *                     sentAt:
 *                       type: string
 *                       format: date-time
 *                       description: Mesajın gönderilme zamanı (ISO 8601 formatında)
 *                     metadata:
 *                       type: object
 *                       description: Mesaj tipine göre ek bilgiler (konum için lat/lng, resim için URL gibi)
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
 *                 syncedMessages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
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
router.post('/sync', verifyToken, async (req, res) => {
    try {
        const { messages } = req.body;

        // Mesajları doğrula ve kaydet
        const syncedMessages = await Promise.all(messages.map(async (msg) => {
            // Grup üyeliği kontrolü
            const group = await TourGroup.findOne({
                _id: msg.groupId,
                $or: [
                    { guide: req.user.id },
                    { 'members.user': req.user.id, 'members.status': 'active' }
                ]
            });

            if (!group) {
                throw new Error(`Grup bulunamadı veya erişim yetkiniz yok: ${msg.groupId}`);
            }

            const message = new Message({
                localMessageId: msg.localMessageId,
                groupId: msg.groupId,
                sender: req.user.id,
                content: msg.content,
                type: msg.type,
                status: 'sent',
                sentAt: msg.sentAt,
                syncedAt: new Date(),
                metadata: msg.metadata
            });

            await message.save();
            return message;
        }));

        res.json({
            success: true,
            syncedMessages: await Message.populate(syncedMessages, {
                path: 'sender',
                select: 'firstName lastName phoneNumber'
            })
        });
    } catch (error) {
        console.error('Mesaj senkronizasyon hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Mesajlar senkronize edilirken bir hata oluştu',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/messages/read:
 *   post:
 *     summary: Mesajları okundu olarak işaretle
 *     description: Belirtilen mesajları okundu olarak işaretler
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageIds
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Okundu olarak işaretlenecek mesaj ID'leri
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
 *                   example: Mesajlar okundu olarak işaretlendi
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
router.post('/read', verifyToken, async (req, res) => {
    try {
        const { messageIds } = req.body;

        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz mesaj ID listesi'
            });
        }

        // Mesajları bul ve grup üyeliği kontrolü yap
        const messages = await Message.find({ _id: { $in: messageIds } });
        
        // Grup ID'lerini topla
        const groupIds = [...new Set(messages.map(msg => msg.groupId.toString()))];
        
        // Kullanıcının bu gruplara üye olup olmadığını kontrol et
        const groups = await TourGroup.find({
            _id: { $in: groupIds },
            $or: [
                { guide: req.user.id },
                { 'members.user': req.user.id, 'members.status': 'active' }
            ]
        });

        const allowedGroupIds = groups.map(g => g._id.toString());

        // Sadece erişim yetkisi olan gruplardaki mesajları güncelle
        const messagesToUpdate = messages.filter(msg => 
            allowedGroupIds.includes(msg.groupId.toString())
        );

        if (messagesToUpdate.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Bu mesajları okuma yetkiniz yok'
            });
        }

        // Mesajları okundu olarak işaretle
        await Message.updateMany(
            { _id: { $in: messagesToUpdate.map(m => m._id) } },
            { 
                $set: { status: 'read' },
                $addToSet: { readBy: req.user.id }
            }
        );

        res.json({
            success: true,
            message: 'Mesajlar okundu olarak işaretlendi'
        });
    } catch (error) {
        console.error('Mesaj okuma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Mesajlar okundu olarak işaretlenirken bir hata oluştu',
            error: error.message
        });
    }
});

module.exports = router; 