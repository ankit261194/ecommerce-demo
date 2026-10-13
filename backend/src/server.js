require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const uiRoutes = require('./routes/uiRoutes');

const app = express();

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  const { getDbStatus } = require('./config/db');
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'Amazon-Style Multi-Vendor E-Commerce API Gateway',
    database: getDbStatus(),
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/ui', uiRoutes);

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server if executed directly (e.g., node src/server.js or npm start)
if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Multi-Vendor API Gateway running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🎨 Design Theme: Obsidian Slate & Electric Amber`);
      console.log(`====================================================`);
    });
  }).catch(err => {
    console.error('Fatal initialization error:', err.message);
    process.exit(1);
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`[Unhandled Error]: ${err.message}`);
});

module.exports = app;
