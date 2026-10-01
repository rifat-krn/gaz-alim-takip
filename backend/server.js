const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const connectDB = require('./src/config/db');
const { seedDefaultAdminAndStationUsers } = require('./src/controllers/authController');
const { syncStationsFromJson } = require('./src/services/stationSyncService');
const Station = require('./src/models/Station');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB().then(async () => {
  // Auto-sync stations from istasyon_listesi.json if database has no stations
  const count = await Station.countDocuments();
  if (count === 0) {
    console.log('[Startup] İstasyon veritabanı boş, istasyon_listesi.json dosyasından yükleniyor...');
    await syncStationsFromJson();
  }

  // Seed Default Admin & Station Users
  await seedDefaultAdminAndStationUsers();
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/stations', require('./src/routes/stationRoutes'));
app.use('/api/readings', require('./src/routes/readingRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Sunucu içi hata meydana geldi'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Gaz Alım Takip Backend API Başlatıldı`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Ortam: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================`);
});
