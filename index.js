require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');
const app = express();

// CORS ayarları
app.use(cors({
    origin: ['http://localhost:3002', 'https://backend-sa-ra.vercel.app'], // Frontend ve Vercel adresleri
    methods: ['GET', 'POST', 'PUT', 'DELETE', "PATCH", "OPTIONS", "HEAD", "CONNECT", "TRACE"],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Mongoose deprecation warning'i kaldır
mongoose.set('strictQuery', false);

// Middleware
app.use(bodyParser.json());

// Swagger UI options
const swaggerOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "SA-RA Tour Guide API",
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        tryItOutEnabled: true
    }
};

// Serve swagger docs
app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpecs);
});

// Serve Swagger UI static files
app.use('/api-docs', express.static(require('swagger-ui-dist').getAbsoluteFSPath()));

// Swagger UI
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpecs, swaggerOptions));

// MongoDB Atlas bağlantısı
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/messagingApp';

const connectWithRetry = () => {
    console.log('MongoDB bağlantısı deneniyor...');
    mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000, // Timeout süresini artır
        socketTimeoutMS: 45000,
        family: 4,
        retryWrites: true,
        w: 'majority'
    })
        .then(() => {
            console.log('MongoDB connected successfully');
            console.log('Database Name:', mongoose.connection.name);
        })
        .catch(err => {
            console.error('MongoDB connection error:', err);
            console.error('Connection string:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
            console.log('5 saniye sonra tekrar denenecek...');
            setTimeout(connectWithRetry, 5000); // 5 saniye sonra tekrar dene
        });
};

// İlk bağlantıyı başlat
connectWithRetry();

// Bağlantı koptuğunda tekrar bağlan
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB bağlantısı koptu. Tekrar bağlanılıyor...');
    connectWithRetry();
});

// Define routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/groups', require('./routes/groups'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
