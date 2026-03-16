// Set environment variables for tests
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/stayease_booking_test';
process.env.MONGODB_DB_NAME = 'stayease_booking_test';
process.env.AUTH_SERVICE_URL = 'http://localhost:3001';
process.env.HOTEL_SERVICE_URL = 'http://localhost:3002';
process.env.PAYMENT_SERVICE_URL = 'http://localhost:3004';
process.env.JWT_SECRET = 'test-secret-key';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Mock logger to reduce test output
jest.mock('./src/config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

// Increase test timeout
jest.setTimeout(10000);
