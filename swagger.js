const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SA-RA API',
            version: '2.0.0',
            description: 'Bluetooth mesajlaşma ve grup yönetimi için RESTful API',
            contact: {
                name: 'API Desteği',
                email: 'your-email@example.com'
            }
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production' 
                    ? 'https://backend-sara.vercel.app'
                    : 'http://localhost:5001',
                description: process.env.NODE_ENV === 'production' 
                    ? 'Production Server' 
                    : 'Development Server'
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