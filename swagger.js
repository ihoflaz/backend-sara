const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SA-RA Tour Guide API',
            version: '1.0.0',
            description: 'SA-RA Tur Rehberi Uygulaması API Dokümantasyonu'
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production' 
                    ? 'https://backend-sara.vercel.app'
                    : 'http://localhost:3000',
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
            }
        },
        security: [{
            bearerAuth: []
        }]
    },
    apis: ['./routes/*.js']
};

const swaggerSpecs = swaggerJsdoc(options);

module.exports = swaggerSpecs; 