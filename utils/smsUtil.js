const twilio = require('twilio');

// Twilio credentials - bunları .env dosyasından alacağız
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationSMS = async (phoneNumber) => {
    try {
        const verification = await client.verify.v2
            .services(process.env.TWILIO_SERVICE_SID)
            .verifications
            .create({ 
                to: phoneNumber, 
                channel: 'sms' 
            });
            
        return { 
            success: true, 
            status: verification.status,
            sid: verification.sid,
            valid: verification.valid,
            dateCreated: verification.dateCreated,
            dateUpdated: verification.dateUpdated
        };
    } catch (error) {
        console.error('SMS gönderme hatası:', error);
        throw new Error('SMS gönderilemedi: ' + error.message);
    }
};

const verifyCode = async (phoneNumber, code) => {
    try {
        const verificationCheck = await client.verify.v2
            .services(process.env.TWILIO_SERVICE_SID)
            .verificationChecks
            .create({ 
                to: phoneNumber, 
                code: code 
            });

        return {
            success: true,
            status: verificationCheck.status,
            valid: verificationCheck.valid,
            sid: verificationCheck.sid,
            dateCreated: verificationCheck.dateCreated,
            dateUpdated: verificationCheck.dateUpdated
        };
    } catch (error) {
        console.error('Kod doğrulama hatası:', error);
        throw new Error('Kod doğrulanamadı: ' + error.message);
    }
};

module.exports = {
    generateVerificationCode,
    sendVerificationSMS,
    verifyCode
};
