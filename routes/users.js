const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendVerificationSMS, verifyCode } = require('../utils/smsUtil');

// Create a user
router.post('/', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).send(user);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.send(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Telefon numarası kontrolü ve SMS gönderimi
router.post('/check-phone', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Telefon numarası gereklidir'
            });
        }

        const existingUser = await User.findOne({ phoneNumber });
        const exists = !!existingUser;

        // SMS gönder
        const verificationResult = await sendVerificationSMS(phoneNumber);
        
        if (!verificationResult.success) {
            return res.status(400).json({
                success: false,
                message: 'SMS gönderilemedi'
            });
        }

        res.json({
            success: true,
            exists,
            verificationSid: verificationResult.sid,
            status: verificationResult.status,
            message: 'Doğrulama kodu gönderildi'
        });

    } catch (error) {
        console.error('Telefon kontrolü hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Telefon numarası kontrol edilirken bir hata oluştu',
            error: error.message
        });
    }
});

// Doğrulama kodu kontrolü
router.post('/verify-code', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;

        if (!phoneNumber || !code) {
            return res.status(400).json({
                success: false,
                message: 'Telefon numarası ve doğrulama kodu gereklidir'
            });
        }

        const verificationResult = await verifyCode(phoneNumber, code);
        
        if (!verificationResult.success || !verificationResult.valid || verificationResult.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz doğrulama kodu',
                status: verificationResult.status
            });
        }

        let user = await User.findOne({ phoneNumber });
        
        if (!user) {
            // Yeni kullanıcı oluştur
            user = new User({
                phoneNumber,
                isVerified: true
            });
            await user.save();
        } else {
            user.isVerified = true;
            await user.save();
        }

        res.json({
            success: true,
            isRegistered: user.isRegistrationComplete,
            verificationSid: verificationResult.sid,
            status: verificationResult.status,
            message: 'Doğrulama başarılı'
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

// Kullanıcı kaydı tamamlama
router.post('/complete-registration', async (req, res) => {
    try {
        const { phoneNumber, firstName, lastName, email, birthDate, gender } = req.body;

        if (!phoneNumber || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'Telefon numarası, isim ve soyisim zorunludur'
            });
        }

        const user = await User.findOne({ phoneNumber });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        if (!user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Telefon numarası doğrulanmamış'
            });
        }

        user.firstName = firstName;
        user.lastName = lastName;
        user.isRegistrationComplete = true;
        if (email) user.email = email;
        if (birthDate) user.birthDate = new Date(birthDate);
        if (gender) user.gender = gender;

        await user.save();

        res.json({
            success: true,
            user: {
                phoneNumber: user.phoneNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                birthDate: user.birthDate,
                gender: user.gender,
                isVerified: user.isVerified,
                isRegistrationComplete: user.isRegistrationComplete
            },
            message: 'Kayıt başarıyla tamamlandı'
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

module.exports = router;
