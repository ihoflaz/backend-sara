const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SA-RA Tour Guide API',
            version: '2.0.0',
            description: 'Bluetooth mesajlaşma ve grup yönetimi için RESTful API',
            contact: {
                name: 'API Desteği',
                email: 'your-email@example.com'
            }
        },
        servers: [
            {
                url: 'https://backend-sara.vercel.app',
                description: 'Production Server'
            },
            {
                url: 'http://localhost:5001',
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
            }
        },
        security: [{
            bearerAuth: []
        }]
    },
    apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs; 