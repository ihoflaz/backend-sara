require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

// CORS ayarları
app.use(cors({
    origin: 'http://localhost:3002', // Frontend'inizin adresi
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // İzin verilen HTTP metotları
    allowedHeaders: ['Content-Type', 'Authorization'] // İzin verilen header'lar
  }));

// Mongoose deprecation warning'i kaldır
mongoose.set('strictQuery', false);

// Middleware
app.use(bodyParser.json());

// MongoDB Atlas bağlantısı
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/messagingApp';

// Eğer connection string'de veritabanı adı yoksa ekle
// if (!MONGODB_URI.includes('/messagingApp') && !MONGODB_URI.includes('localhost')) {
//     MONGODB_URI += '/messagingApp';
// }

mongoose.connect(MONGODB_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Define routes
app.use('/api/users', require('./routes/users'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
