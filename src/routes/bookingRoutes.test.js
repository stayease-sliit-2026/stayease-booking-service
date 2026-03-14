const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const Booking = require('../models/Booking');

// Mock the external services
jest.mock('../services/authService');
jest.mock('../services/hotelService');
jest.mock('../services/paymentService');

const AuthService = require('../services/authService');
const HotelService = require('../services/hotelService');
const PaymentService = require('../services/paymentService');

describe('Booking Routes - Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database if needed
    // For now we'll skip DB connection in tests
  });

  afterAll(async () => {
    // Clean up
    await mongoose.connection.close();
  });

  afterEach(async () => {
    // Clear all collections
    await Booking.deleteMany({});
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('service', 'booking-service');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /', () => {
    it('should return service information', async () => {
      const response = await request(app)
        .get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'StayEase Booking Service');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('GET /bookings/availability', () => {
    it('should check room availability with valid parameters', async () => {
      HotelService.checkRoomAvailability.mockResolvedValue({
        available: true,
        roomId: 'r1',
        pricePerNight: 100,
      });

      const response = await request(app)
        .get('/bookings/availability')
        .query({
          hotelId: 'h1',
          roomId: 'r1',
          checkIn: '2026-04-01T00:00:00Z',
          checkOut: '2026-04-05T00:00:00Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.available).toBe(true);
    });

    it('should return 400 if hotelId is missing', async () => {
      const response = await request(app)
        .get('/bookings/availability')
        .query({
          roomId: 'r1',
          checkIn: '2026-04-01T00:00:00Z',
          checkOut: '2026-04-05T00:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(true);
    });

    it('should return 400 if checkOut is before checkIn', async () => {
      const response = await request(app)
        .get('/bookings/availability')
        .query({
          hotelId: 'h1',
          roomId: 'r1',
          checkIn: '2026-04-05T00:00:00Z',
          checkOut: '2026-04-01T00:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(true);
    });
  });

  describe('POST /bookings', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .post('/bookings')
        .send({
          hotelId: 'h1',
          roomId: 'r1',
          checkIn: '2026-04-01T00:00:00Z',
          checkOut: '2026-04-05T00:00:00Z',
          numberOfGuests: 2,
          totalPrice: 500,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(true);
      expect(response.body.message).toContain('authorization');
    });

    it('should create booking with valid JWT token', async () => {
      const mockUser = { id: 'user123', name: 'John Doe' };
      AuthService.verifyToken.mockResolvedValue(mockUser);
      HotelService.checkRoomAvailability.mockResolvedValue({ available: true });
      PaymentService.processPayment.mockResolvedValue({ id: 'pay123', status: 'pending' });

      const response = await request(app)
        .post('/bookings')
        .set('Authorization', 'Bearer valid-token')
        .send({
          hotelId: 'h1',
          roomId: 'r1',
          checkIn: '2026-04-01T00:00:00Z',
          checkOut: '2026-04-05T00:00:00Z',
          numberOfGuests: 2,
          totalPrice: 500,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.totalPrice).toBe(500);
    });

    it('should return 400 if required fields are missing', async () => {
      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .post('/bookings')
        .set('Authorization', 'Bearer valid-token')
        .send({
          hotelId: 'h1',
          // Missing roomId, checkIn, checkOut, numberOfGuests, totalPrice
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(true);
    });

    it('should return 400 if checkOut is before checkIn', async () => {
      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .post('/bookings')
        .set('Authorization', 'Bearer valid-token')
        .send({
          hotelId: 'h1',
          roomId: 'r1',
          checkIn: '2026-04-05T00:00:00Z',
          checkOut: '2026-04-01T00:00:00Z',
          numberOfGuests: 2,
          totalPrice: 500,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(true);
    });

    it('should return 409 if room is not available', async () => {
      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });
      HotelService.checkRoomAvailability.mockResolvedValue({ available: false });

      const response = await request(app)
        .post('/bookings')
        .set('Authorization', 'Bearer valid-token')
        .send({
          hotelId: 'h1',
          roomId: 'r1',
          checkIn: '2026-04-01T00:00:00Z',
          checkOut: '2026-04-05T00:00:00Z',
          numberOfGuests: 2,
          totalPrice: 500,
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe(true);
    });
  });

  describe('GET /bookings/:id', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .get('/bookings/60d5ec49c1234567890abcde');

      expect(response.status).toBe(401);
    });

    it('should return 404 if booking does not exist', async () => {
      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .get('/bookings/60d5ec49c1234567890abcde')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(true);
      expect(response.body.message).toContain('not found');
    });

    it('should return 403 if user is not booking owner', async () => {
      // Create a booking with a different user
      const booking = await Booking.create({
        userId: 'otheruser123',
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: new Date('2026-04-01'),
        checkOut: new Date('2026-04-05'),
        numberOfGuests: 2,
        totalPrice: 500,
      });

      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .get(`/bookings/${booking._id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe(true);
    });

    it('should return booking if user is owner', async () => {
      const booking = await Booking.create({
        userId: 'user123',
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: new Date('2026-04-01'),
        checkOut: new Date('2026-04-05'),
        numberOfGuests: 2,
        totalPrice: 500,
      });

      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .get(`/bookings/${booking._id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(booking._id.toString());
    });
  });

  describe('GET /bookings/user/', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app).get('/bookings/user/');

      expect(response.status).toBe(401);
    });

    it('should return empty array if user has no bookings', async () => {
      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .get('/bookings/user/')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should return user bookings with pagination', async () => {
      const booking1 = await Booking.create({
        userId: 'user123',
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: new Date('2026-04-01'),
        checkOut: new Date('2026-04-05'),
        numberOfGuests: 2,
        totalPrice: 500,
      });

      const booking2 = await Booking.create({
        userId: 'user123',
        hotelId: 'h2',
        roomId: 'r2',
        checkIn: new Date('2026-05-01'),
        checkOut: new Date('2026-05-05'),
        numberOfGuests: 3,
        totalPrice: 600,
      });

      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .get('/bookings/user/?limit=10&skip=0')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter bookings by status', async () => {
      await Booking.create({
        userId: 'user123',
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: new Date('2026-04-01'),
        checkOut: new Date('2026-04-05'),
        numberOfGuests: 2,
        totalPrice: 500,
        status: 'confirmed',
      });

      await Booking.create({
        userId: 'user123',
        hotelId: 'h2',
        roomId: 'r2',
        checkIn: new Date('2026-05-01'),
        checkOut: new Date('2026-05-05'),
        numberOfGuests: 3,
        totalPrice: 600,
        status: 'pending',
      });

      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .get('/bookings/user/?status=confirmed')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('confirmed');
    });
  });

  describe('PUT /bookings/:id/confirm', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .put('/bookings/60d5ec49c1234567890abcde/confirm');

      expect(response.status).toBe(401);
    });

    it('should return 404 if booking does not exist', async () => {
      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .put('/bookings/60d5ec49c1234567890abcde/confirm')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
    });

    it('should return 403 if user is not booking owner', async () => {
      const booking = await Booking.create({
        userId: 'otheruser',
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: new Date('2026-04-01'),
        checkOut: new Date('2026-04-05'),
        numberOfGuests: 2,
        totalPrice: 500,
      });

      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .put(`/bookings/${booking._id}/confirm`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
    });

    it('should return 400 if payment not successful', async () => {
      const booking = await Booking.create({
        userId: 'user123',
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: new Date('2026-04-01'),
        checkOut: new Date('2026-04-05'),
        numberOfGuests: 2,
        totalPrice: 500,
        paymentStatus: 'pending',
      });

      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .put(`/bookings/${booking._id}/confirm`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(true);
    });

    it('should confirm booking with successful payment', async () => {
      const booking = await Booking.create({
        userId: 'user123',
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: new Date('2026-04-01'),
        checkOut: new Date('2026-04-05'),
        numberOfGuests: 2,
        totalPrice: 500,
        paymentStatus: 'success',
      });

      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });
      PaymentService.sendNotification.mockResolvedValue({ success: true });

      const response = await request(app)
        .put(`/bookings/${booking._id}/confirm`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('confirmed');
    });

    it('should return 400 if booking already confirmed', async () => {
      const booking = await Booking.create({
        userId: 'user123',
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: new Date('2026-04-01'),
        checkOut: new Date('2026-04-05'),
        numberOfGuests: 2,
        totalPrice: 500,
        status: 'confirmed',
        paymentStatus: 'success',
      });

      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .put(`/bookings/${booking._id}/confirm`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(true);
    });
  });

  describe('PUT /bookings/:id/cancel', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .put('/bookings/60d5ec49c1234567890abcde/cancel');

      expect(response.status).toBe(401);
    });

    it('should cancel booking with refund', async () => {
      const booking = await Booking.create({
        userId: 'user123',
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: new Date('2026-04-01'),
        checkOut: new Date('2026-04-05'),
        numberOfGuests: 2,
        totalPrice: 500,
        paymentStatus: 'success',
        paymentId: 'pay123',
      });

      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });
      PaymentService.processRefund.mockResolvedValue({ success: true });
      PaymentService.sendNotification.mockResolvedValue({ success: true });

      const response = await request(app)
        .put(`/bookings/${booking._id}/cancel`)
        .set('Authorization', 'Bearer valid-token')
        .send({ reason: 'Schedule conflict' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
      expect(response.body.data.cancellationReason).toBe('Schedule conflict');
    });

    it('should return 400 if booking already cancelled', async () => {
      const booking = await Booking.create({
        userId: 'user123',
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: new Date('2026-04-01'),
        checkOut: new Date('2026-04-05'),
        numberOfGuests: 2,
        totalPrice: 500,
        status: 'cancelled',
      });

      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .put(`/bookings/${booking._id}/cancel`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(true);
    });
  });

  describe('GET /bookings/user/stats', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app).get('/bookings/user/stats');

      expect(response.status).toBe(401);
    });

    it('should return booking statistics', async () => {
      await Booking.create({
        userId: 'user123',
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: new Date('2026-04-01'),
        checkOut: new Date('2026-04-05'),
        numberOfGuests: 2,
        totalPrice: 500,
        status: 'confirmed',
      });

      await Booking.create({
        userId: 'user123',
        hotelId: 'h2',
        roomId: 'r2',
        checkIn: new Date('2026-05-01'),
        checkOut: new Date('2026-05-05'),
        numberOfGuests: 3,
        totalPrice: 600,
        status: 'pending',
      });

      AuthService.verifyToken.mockResolvedValue({ id: 'user123' });

      const response = await request(app)
        .get('/bookings/user/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for non-existent endpoint', async () => {
      const response = await request(app).get('/non-existent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(true);
      expect(response.body.message).toContain('not found');
    });
  });
});
