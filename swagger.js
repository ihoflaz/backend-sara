const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SA-RA Tour Guide API',
            version: '2.0.0',
            description: 'SA-RA Tur Rehberi Uygulaması API Dokümantasyonu',
            contact: {
                name: 'API Desteği',
                email: 'support@sara-tour.com'
            }
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production' 
                    ? 'https://backend-sara.vercel.app'
                    : 'http://localhost:5001',
                description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Development Server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                        errors: {
                            type: 'object',
                            additionalProperties: { type: 'string' }
                        }
                    }
                },
                PhoneCheckRequest: {
                    type: 'object',
                    required: ['phoneNumber'],
                    properties: {
                        phoneNumber: {
                            type: 'string',
                            pattern: '^\\+90[0-9]{10}$',
                            example: '+905551234567'
                        }
                    }
                },
                PhoneCheckResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        exists: { type: 'boolean' },
                        verificationSid: { type: 'string', example: 'VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
                        status: { type: 'string', example: 'pending' },
                        message: { type: 'string', example: 'Doğrulama kodu gönderildi' }
                    }
                },
                VerifyCodeRequest: {
                    type: 'object',
                    required: ['phoneNumber', 'code'],
                    properties: {
                        phoneNumber: {
                            type: 'string',
                            pattern: '^\\+90[0-9]{10}$',
                            example: '+905551234567'
                        },
                        code: {
                            type: 'string',
                            pattern: '^[0-9]{6}$',
                            example: '123456'
                        }
                    }
                },
                VerifyCodeResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        isRegistered: { type: 'boolean' },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        user: { $ref: '#/components/schemas/User' }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        phoneNumber: { type: 'string', pattern: '^\\+90[0-9]{10}$' },
                        firstName: { type: 'string', minLength: 2, maxLength: 50 },
                        lastName: { type: 'string', minLength: 2, maxLength: 50 },
                        email: { type: 'string', format: 'email' },
                        role: { type: 'string', enum: ['user', 'guide', 'admin'] },
                        isVerified: { type: 'boolean' },
                        status: { type: 'string', enum: ['active', 'inactive', 'blocked'] },
                        avatar: { type: 'string', format: 'uri' },
                        birthDate: { type: 'string', format: 'date' },
                        gender: { type: 'string', enum: ['Erkek', 'Kadın', 'Diğer'] },
                        deviceTokens: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    token: { type: 'string' },
                                    platform: { type: 'string', enum: ['ios', 'android'] }
                                }
                            }
                        }
                    }
                },
                CompleteRegistrationRequest: {
                    type: 'object',
                    required: ['firstName', 'lastName'],
                    properties: {
                        firstName: { type: 'string', minLength: 2, maxLength: 50 },
                        lastName: { type: 'string', minLength: 2, maxLength: 50 },
                        email: { type: 'string', format: 'email' },
                        birthDate: { type: 'string', format: 'date' },
                        gender: { type: 'string', enum: ['Erkek', 'Kadın', 'Diğer'] },
                        avatar: { type: 'string', format: 'uri' }
                    }
                },
                TourGroup: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        guide: { type: 'string', description: 'Guide user ID' },
                        members: {
                            type: 'array',
                            items: { type: 'string', description: 'User ID' }
                        },
                        invitations: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    user: { type: 'string', description: 'User ID' },
                                    status: { type: 'string', enum: ['pending', 'accepted', 'rejected'] }
                                }
                            }
                        },
                        startDate: { type: 'string', format: 'date-time' },
                        endDate: { type: 'string', format: 'date-time' },
                        isActive: { type: 'boolean' }
                    }
                },
                Message: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        sender: { type: 'string', description: 'User ID' },
                        groupId: { type: 'string', description: 'Tour Group ID' },
                        content: { type: 'string' },
                        type: { type: 'string', enum: ['text', 'image', 'location'] },
                        localMessageId: { type: 'string' },
                        status: { type: 'string', enum: ['sent', 'delivered', 'read'] },
                        sentAt: { type: 'string', format: 'date-time' },
                        syncedAt: { type: 'string', format: 'date-time' },
                        readBy: {
                            type: 'array',
                            items: { type: 'string', description: 'User ID' }
                        }
                    }
                }
            }
        },
        security: [{
            bearerAuth: []
        }],
        tags: [
            { name: 'Auth', description: 'Kimlik doğrulama işlemleri' },
            { name: 'Users', description: 'Kullanıcı işlemleri' },
            { name: 'Groups', description: 'Grup işlemleri' },
            { name: 'Messages', description: 'Mesajlaşma işlemleri' },
            { name: 'Admin', description: 'Yönetici işlemleri' }
        ]
    },
    apis: ['./routes/*.js']
};

const swaggerSpecs = swaggerJsdoc(options);

module.exports = swaggerSpecs; 