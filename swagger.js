const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SA-RA Tour Guide API',
            version: '1.0.0',
            description: 'SA-RA Tur Rehberi Uygulaması API Dokümantasyonu',
            contact: {
                name: 'API Desteği',
                email: 'support@sara-tour.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development Server'
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
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        phoneNumber: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        role: { type: 'string', enum: ['user', 'guide', 'admin'] },
                        isVerified: { type: 'boolean' },
                        status: { type: 'string', enum: ['active', 'inactive', 'blocked'] },
                        avatar: { type: 'string' },
                        birthDate: { type: 'string', format: 'date' },
                        gender: { type: 'string', enum: ['male', 'female', 'other'] },
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