const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation error handler middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

/**
 * Validation rules for creating a booking
 */
const validateCreateBooking = [
  body('hotelId')
    .notEmpty()
    .withMessage('hotelId is required')
    .isString()
    .withMessage('hotelId must be a string'),
  body('roomId')
    .notEmpty()
    .withMessage('roomId is required')
    .isString()
    .withMessage('roomId must be a string'),
  body('checkIn')
    .notEmpty()
    .withMessage('checkIn is required')
    .isISO8601()
    .withMessage('checkIn must be a valid ISO8601 date')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('checkIn date cannot be in the past');
      }
      return true;
    }),
  body('checkOut')
    .notEmpty()
    .withMessage('checkOut is required')
    .isISO8601()
    .withMessage('checkOut must be a valid ISO8601 date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.checkIn)) {
        throw new Error('checkOut date must be after checkIn date');
      }
      return true;
    }),
  body('numberOfGuests')
    .notEmpty()
    .withMessage('numberOfGuests is required')
    .isInt({ min: 1 })
    .withMessage('numberOfGuests must be at least 1'),
  body('totalPrice')
    .notEmpty()
    .withMessage('totalPrice is required')
    .isFloat({ min: 0 })
    .withMessage('totalPrice must be a positive number'),
  body('roomType')
    .optional()
    .isString()
    .withMessage('roomType must be a string'),
  body('specialRequests')
    .optional()
    .isString()
    .withMessage('specialRequests must be a string'),
  handleValidationErrors,
];

/**
 * Validation rules for confirm booking
 */
const validateConfirmBooking = [
  param('id')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Booking ID must be a valid MongoDB ID'),
  handleValidationErrors,
];

/**
 * Validation rules for cancel booking
 */
const validateCancelBooking = [
  param('id')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Booking ID must be a valid MongoDB ID'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string'),
  handleValidationErrors,
];

/**
 * Validation rules for get booking by ID
 */
const validateGetBooking = [
  param('id')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Booking ID must be a valid MongoDB ID'),
  handleValidationErrors,
];

/**
 * Validation rules for checking availability
 */
const validateCheckAvailability = [
  query('hotelId')
    .notEmpty()
    .withMessage('hotelId is required')
    .isString()
    .withMessage('hotelId must be a string'),
  query('roomId')
    .notEmpty()
    .withMessage('roomId is required')
    .isString()
    .withMessage('roomId must be a string'),
  query('checkIn')
    .notEmpty()
    .withMessage('checkIn is required')
    .isISO8601()
    .withMessage('checkIn must be a valid ISO8601 date'),
  query('checkOut')
    .notEmpty()
    .withMessage('checkOut is required')
    .isISO8601()
    .withMessage('checkOut must be a valid ISO8601 date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.query.checkIn)) {
        throw new Error('checkOut date must be after checkIn date');
      }
      return true;
    }),
  handleValidationErrors,
];

module.exports = {
  validateCreateBooking,
  validateConfirmBooking,
  validateCancelBooking,
  validateGetBooking,
  validateCheckAvailability,
};
