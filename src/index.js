require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/database');
const logger = require('./config/logger');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();
const PORT = process.env.PORT || 3003;

/**
 * Security Middleware
 */
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || '*').split(','),
  credentials: true,
}));

/**
 * Request logging
 */
app.use(morgan('combined'));

/**
 * Body Parser Middleware
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: process.env.SERVICE_NAME || 'booking-service',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Routes
 */
app.use('/bookings', bookingRoutes);

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'StayEase Booking Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      bookings: '/bookings',
      availability: '/bookings/availability',
    },
  });
});

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: 'Endpoint not found',
    path: req.path,
  });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

/**
 * Database Connection and Server Start
 */
const startServer = async () => {
  try {
    // Start Express server first (health check should work)
    app.listen(PORT, () => {
      logger.info(`🚀 Booking Service running on port ${PORT}`);
    });

    // Connect to MongoDB asynchronously (non-blocking)
    if (process.env.MONGODB_URI) {
      connectDB().catch(err => {
        logger.warn(`Database not available: ${err.message}. Service will continue without DB.`);
      });
    } else {
      logger.warn('MONGODB_URI not set. Database features unavailable.');
    }
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Start the server only outside of test runs.
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
