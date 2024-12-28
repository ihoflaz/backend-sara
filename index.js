require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');
const app = express();

// CORS ayarları
const allowedOrigins = [
    'http://localhost:3002',
    'https://backend-sara.vercel.app',
    'https://sara-tour.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = 'CORS policy için izin verilmeyen origin: ' + origin;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', "PATCH", "OPTIONS", "HEAD"],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 saat
}));

// Mongoose deprecation warning'i kaldır
mongoose.set('strictQuery', false);

// Middleware
app.use(bodyParser.json());

// Serve static files from public directory
app.use(express.static('public'));

// Swagger UI static files
app.use('/api-docs', express.static('public/swagger-ui', {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Swagger UI options
const swaggerOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "SA-RA Tour Guide API",
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        defaultModelsExpandDepth: 3,
        defaultModelExpandDepth: 3,
        tryItOutEnabled: true
    }
};

// Serve swagger.json
app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpecs);
});

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
