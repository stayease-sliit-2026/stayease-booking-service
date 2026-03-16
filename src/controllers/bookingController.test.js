const bookingController = require('./bookingController');
const Booking = require('../models/Booking');
const HotelService = require('../services/hotelService');
const PaymentService = require('../services/paymentService');

jest.mock('../models/Booking');
jest.mock('../services/hotelService');
jest.mock('../services/paymentService');

describe('Booking Controller Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user123' },
      token: 'valid-token',
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    it('should create booking successfully with payment', async () => {
      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: new Date('2026-04-01'),
        checkOut: new Date('2026-04-05'),
        numberOfGuests: 2,
        totalPrice: 500,
        status: 'pending',
        paymentStatus: 'pending',
        save: jest.fn().mockResolvedValue(true),
      };

      req.body = {
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: '2026-04-01T00:00:00Z',
        checkOut: '2026-04-05T00:00:00Z',
        numberOfGuests: 2,
        totalPrice: 500,
      };

      HotelService.checkRoomAvailability.mockResolvedValue({ available: true });
      Booking.mockImplementation(() => mockBooking);
      PaymentService.processPayment.mockResolvedValue({ id: 'pay123', status: 'pending' });

      await bookingController.createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Booking created successfully',
        })
      );
    });

    it('should return 409 if room is not available', async () => {
      req.body = {
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: '2026-04-01T00:00:00Z',
        checkOut: '2026-04-05T00:00:00Z',
        numberOfGuests: 2,
        totalPrice: 500,
      };

      HotelService.checkRoomAvailability.mockResolvedValue({ available: false });

      await bookingController.createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: 'Room is not available for the selected dates',
        })
      );
    });

    it('should handle errors gracefully when creation fails', async () => {
      req.body = {
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: '2026-04-01T00:00:00Z',
        checkOut: '2026-04-05T00:00:00Z',
        numberOfGuests: 2,
        totalPrice: 500,
      };

      // Skip availability check and throw error at Booking creation
      HotelService.checkRoomAvailability.mockRejectedValue(
        new Error('Service unavailable')
      );
      
      // Let the code continue with graceful degradation
      const mockBooking = {
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      
      Booking.mockImplementation(() => mockBooking);

      await bookingController.createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: 'Failed to create booking',
        })
      );
    });
  });

  describe('getBooking', () => {
    it('should return booking if user is owner', async () => {
      req.params.id = 'booking123';

      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        hotelId: 'h1',
        roomId: 'r1',
      };

      Booking.findById.mockResolvedValue(mockBooking);

      await bookingController.getBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockBooking,
        })
      );
    });

    it('should return 404 if booking not found', async () => {
      req.params.id = 'nonexistent';

      Booking.findById.mockResolvedValue(null);

      await bookingController.getBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: 'Booking not found',
        })
      );
    });

    it('should return 403 if user is not owner', async () => {
      req.params.id = 'booking123';

      const mockBooking = {
        _id: 'booking123',
        userId: 'otheruser',
        hotelId: 'h1',
        roomId: 'r1',
      };

      Booking.findById.mockResolvedValue(mockBooking);

      await bookingController.getBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: 'Unauthorized to access this booking',
        })
      );
    });
  });

  describe('getUserBookings', () => {
    it('should return user bookings with pagination', async () => {
      req.query = { limit: 10, skip: 0 };

      const mockBookings = [
        {
          _id: 'booking1',
          userId: 'user123',
          hotelId: 'h1',
          status: 'confirmed',
        },
        {
          _id: 'booking2',
          userId: 'user123',
          hotelId: 'h2',
          status: 'pending',
        },
      ];

      Booking.find.mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockBookings),
      });

      Booking.countDocuments.mockResolvedValue(2);

      await bookingController.getUserBookings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockBookings,
        })
      );
    });

    it('should filter by status', async () => {
      req.query = { status: 'confirmed', limit: 10, skip: 0 };

      const mockBookings = [
        {
          _id: 'booking1',
          userId: 'user123',
          hotelId: 'h1',
          status: 'confirmed',
        },
      ];

      Booking.find.mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockBookings),
      });

      Booking.countDocuments.mockResolvedValue(1);

      await bookingController.getUserBookings(req, res);

      expect(Booking.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'confirmed' })
      );
    });
  });

  describe('confirmBooking', () => {
    it('should confirm booking successfully', async () => {
      req.params.id = 'booking123';

      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        status: 'pending',
        paymentStatus: 'success',
        save: jest.fn().mockResolvedValue(true),
      };

      Booking.findById.mockResolvedValue(mockBooking);
      PaymentService.sendNotification.mockResolvedValue({ success: true });

      await bookingController.confirmBooking(req, res);

      expect(mockBooking.status).toBe('confirmed');
      expect(mockBooking.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Booking confirmed successfully',
        })
      );
    });

    it('should return 400 if payment not successful', async () => {
      req.params.id = 'booking123';

      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        status: 'pending',
        paymentStatus: 'pending',
      };

      Booking.findById.mockResolvedValue(mockBooking);

      await bookingController.confirmBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: 'Cannot confirm booking without successful payment',
        })
      );
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking and process refund', async () => {
      req.params.id = 'booking123';
      req.body = { reason: 'Schedule conflict' };

      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        status: 'confirmed',
        paymentStatus: 'success',
        paymentId: 'pay123',
        totalPrice: 500,
        save: jest.fn().mockResolvedValue(true),
      };

      Booking.findById.mockResolvedValue(mockBooking);
      PaymentService.processRefund.mockResolvedValue({ success: true });
      PaymentService.sendNotification.mockResolvedValue({ success: true });

      await bookingController.cancelBooking(req, res);

      expect(mockBooking.status).toBe('cancelled');
      expect(mockBooking.cancellationReason).toBe('Schedule conflict');
      expect(PaymentService.processRefund).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if already cancelled', async () => {
      req.params.id = 'booking123';

      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        status: 'cancelled',
      };

      Booking.findById.mockResolvedValue(mockBooking);

      await bookingController.cancelBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: 'Booking is already cancelled',
        })
      );
    });
  });

  describe('checkAvailability', () => {
    it('should check room availability', async () => {
      req.query = {
        hotelId: 'h1',
        roomId: 'r1',
        checkIn: '2026-04-01T00:00:00Z',
        checkOut: '2026-04-05T00:00:00Z',
      };

      HotelService.checkRoomAvailability.mockResolvedValue({
        available: true,
        roomId: 'r1',
        pricePerNight: 100,
      });

      await bookingController.checkAvailability(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ available: true }),
        })
      );
    });
  });

  describe('getBookingStats', () => {
    it('should return booking statistics', async () => {
      const mockStats = [
        { _id: 'confirmed', count: 5, totalSpent: 2500 },
        { _id: 'pending', count: 2, totalSpent: 1000 },
      ];

      Booking.aggregate.mockResolvedValue(mockStats);

      await bookingController.getBookingStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockStats,
        })
      );
    });
  });
});
