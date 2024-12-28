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
                url: 'http://localhost:5001',
                description: 'Geliştirme sunucusu'
            },
            {
                url: 'https://backend-sa-ra.vercel.app',
                description: 'Production sunucusu'
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
    apis: ['./routes/*.js'] // Tüm route dosyalarını tara
};

const specs = swaggerJsdoc(options);

module.exports = specs; 