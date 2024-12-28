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
 *       - in: query
 *         name: lastSyncTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Son senkronizasyon zamanı
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
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       localMessageId:
 *                         type: string
 *                       groupId:
 *                         type: string
 *                       sender:
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
 *                       content:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [text, image, location, file]
 *                       status:
 *                         type: string
 *                         enum: [sent, delivered, read, failed]
 *                       sentAt:
 *                         type: string
 *                         format: date-time
 *                       syncedAt:
 *                         type: string
 *                         format: date-time
 *                       metadata:
 *                         type: object
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
 *                     groupId:
 *                       type: string
 *                     content:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [text, image, location, file]
 *                     sentAt:
 *                       type: string
 *                       format: date-time
 *                     metadata:
 *                       type: object
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
 *                 syncedMessages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       localMessageId:
 *                         type: string
 *                       groupId:
 *                         type: string
 *                       sender:
 *                         type: object
 *                       content:
 *                         type: string
 *                       type:
 *                         type: string
 *                       status:
 *                         type: string
 *                       sentAt:
 *                         type: string
 *                         format: date-time
 *                       syncedAt:
 *                         type: string
 *                         format: date-time
 *                       metadata:
 *                         type: object
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
 *               - groupId
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               groupId:
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
 *                 readAt:
 *                   type: string
 *                   format: date-time
 */
router.post('/read', verifyToken, async (req, res) => {
    try {
        const { messageIds, groupId } = req.body;

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

        const readAt = new Date();

        // Mesajları okundu olarak işaretle
        await Message.updateMany(
            {
                _id: { $in: messageIds },
                groupId,
                sender: { $ne: req.user.id } // Kendi mesajlarını okundu olarak işaretleyemez
            },
            {
                $set: {
                    status: 'read',
                    readAt
                }
            }
        );

        res.json({
            success: true,
            readAt
        });
    } catch (error) {
        console.error('Mesaj okundu işaretleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Mesajlar okundu olarak işaretlenirken bir hata oluştu',
            error: error.message
        });
    }
});

module.exports = router; 