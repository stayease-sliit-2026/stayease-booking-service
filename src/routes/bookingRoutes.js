const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const {
  validateCreateBooking,
  validateConfirmBooking,
  validateCancelBooking,
  validateGetBooking,
  validateCheckAvailability,
} = require('../middleware/validation');
const bookingController = require('../controllers/bookingController');

/**
 * Public Routes (No Authentication Required)
 */

/**
 * GET /bookings/availability
 * Check room availability for specified dates
 */
router.get('/availability', validateCheckAvailability, bookingController.checkAvailability);

/**
 * Protected Routes (Authentication Required)
 */

/**
 * POST /bookings
 * Create a new booking
 */
router.post('/', verifyToken, validateCreateBooking, bookingController.createBooking);

/**
 * GET /bookings/user/
 * Get all bookings for the current user
 */
router.get('/user/', verifyToken, bookingController.getUserBookings);

/**
 * GET /bookings/user/stats
 * Get booking statistics for the current user
 */
router.get('/user/stats', verifyToken, bookingController.getBookingStats);

/**
 * GET /bookings/:id
 * Get a specific booking by ID
 */
router.get('/:id', verifyToken, validateGetBooking, bookingController.getBooking);

/**
 * PUT /bookings/:id/confirm
 * Confirm a booking
 */
router.put('/:id/confirm', verifyToken, validateConfirmBooking, bookingController.confirmBooking);

/**
 * PUT /bookings/:id/cancel
 * Cancel a booking
 */
router.put('/:id/cancel', verifyToken, validateCancelBooking, bookingController.cancelBooking);

module.exports = router;
