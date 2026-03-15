const Booking = require('../models/Booking');
const HotelService = require('../services/hotelService');
const PaymentService = require('../services/paymentService');
const logger = require('../config/logger');

/**
 * Create a new booking
 * Flow:
 * 1. Check room availability with Hotel Service
 * 2. Create booking with pending status
 * 3. Trigger payment processing with Payment Service
 * 4. Update booking status based on payment result
 */
exports.createBooking = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { hotelId, roomId, checkIn, checkOut, numberOfGuests, totalPrice, roomType, specialRequests } = req.body;

    logger.info(`Creating booking for user ${userId} at hotel ${hotelId}`);

    // Step 1: Check room availability with Hotel Service
    let availabilityCheck;
    try {
      availabilityCheck = await HotelService.checkRoomAvailability(
        hotelId,
        roomId,
        checkIn,
        checkOut
      );

      if (!availabilityCheck.available) {
        return res.status(409).json({
          error: true,
          message: 'Room is not available for the selected dates',
        });
      }
    } catch (error) {
      logger.warn(`Room availability check failed, proceeding with caution: ${error.message}`);
      // Continue with booking if availability service is down (graceful degradation)
    }

    // Step 2: Create booking with pending status
    const booking = new Booking({
      userId,
      hotelId,
      roomId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      numberOfGuests,
      totalPrice,
      roomType: roomType || 'standard',
      specialRequests: specialRequests || '',
      status: 'pending',
      paymentStatus: 'pending',
    });

    await booking.save();
    logger.info(`Booking created with ID: ${booking._id}`);

    // Step 3: Trigger payment processing
    try {
      const paymentData = {
        bookingId: booking._id.toString(),
        userId,
        amount: totalPrice,
        currency: 'USD',
      };

      const paymentResult = await PaymentService.processPayment(paymentData, req.token);
      
      // Update booking with payment information
      booking.paymentId = paymentResult.id || paymentResult._id;
      booking.paymentStatus = paymentResult.status || 'pending';
      await booking.save();

      logger.info(`Payment initiated for booking ${booking._id}`);
    } catch (paymentError) {
      logger.error(`Payment processing failed: ${paymentError.message}`);
      // Payment failure - booking remains in pending state
      // Still return success since booking was created
      // Payment status will need manual intervention or retry
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking,
    });
  } catch (error) {
    logger.error(`Error creating booking: ${error.message}`);
    res.status(500).json({
      error: true,
      message: 'Failed to create booking',
      details: error.message,
    });
  }
};

/**
 * Get booking by ID
 */
exports.getBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        error: true,
        message: 'Booking not found',
      });
    }

    // Ensure user can only access their own bookings
    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized to access this booking',
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    logger.error(`Error retrieving booking: ${error.message}`);
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve booking',
      details: error.message,
    });
  }
};

/**
 * Get all bookings for a user
 */
exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { status, hotelId, limit = 10, skip = 0 } = req.query;

    let query = { userId };

    if (status) {
      query.status = status;
    }

    if (hotelId) {
      query.hotelId = hotelId;
    }

    const bookings = await Booking.find(query)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 })
      .exec();

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + bookings.length < total,
      },
    });
  } catch (error) {
    logger.error(`Error retrieving user bookings: ${error.message}`);
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve bookings',
      details: error.message,
    });
  }
};

/**
 * Confirm a booking
 * This updates the booking status to 'confirmed' after successful payment
 */
exports.confirmBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        error: true,
        message: 'Booking not found',
      });
    }

    // Verify ownership
    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized to confirm this booking',
      });
    }

    // Check if already confirmed
    if (booking.status === 'confirmed') {
      return res.status(400).json({
        error: true,
        message: 'Booking is already confirmed',
      });
    }

    // Check payment status
    if (booking.paymentStatus !== 'success') {
      return res.status(400).json({
        error: true,
        message: 'Cannot confirm booking without successful payment',
      });
    }

    booking.status = 'confirmed';
    await booking.save();

    // Send confirmation notification (non-blocking)
    try {
      await PaymentService.sendNotification(
        {
          userId,
          type: 'booking-confirmation',
          subject: 'Booking Confirmed',
          message: `Your booking #${booking._id} has been confirmed`,
        },
        req.token
      );
    } catch (notifError) {
      logger.warn(`Failed to send confirmation notification: ${notifError.message}`);
    }

    logger.info(`Booking ${id} confirmed`);

    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: booking,
    });
  } catch (error) {
    logger.error(`Error confirming booking: ${error.message}`);
    res.status(500).json({
      error: true,
      message: 'Failed to confirm booking',
      details: error.message,
    });
  }
};

/**
 * Cancel a booking
 */
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        error: true,
        message: 'Booking not found',
      });
    }

    // Verify ownership
    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized to cancel this booking',
      });
    }

    // Check if already cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        error: true,
        message: 'Booking is already cancelled',
      });
    }

    // Update cancellation details
    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'No reason provided';
    booking.cancellationDate = new Date();
    await booking.save();

    // Process refund if payment was successful
    if (booking.paymentStatus === 'success' && booking.paymentId) {
      try {
        await PaymentService.processRefund(
          {
            bookingId: id,
            amount: booking.totalPrice,
            reason: booking.cancellationReason,
          },
          req.token
        );

        booking.paymentStatus = 'refunded';
        await booking.save();

        logger.info(`Refund processed for booking ${id}`);
      } catch (refundError) {
        logger.error(`Failed to process refund: ${refundError.message}`);
        // Continue with cancellation even if refund fails
      }
    }

    // Send cancellation notification (non-blocking)
    try {
      await PaymentService.sendNotification(
        {
          userId,
          type: 'booking-cancellation',
          subject: 'Booking Cancelled',
          message: `Your booking #${booking._id} has been cancelled. Reason: ${booking.cancellationReason}`,
        },
        req.token
      );
    } catch (notifError) {
      logger.warn(`Failed to send cancellation notification: ${notifError.message}`);
    }

    logger.info(`Booking ${id} cancelled`);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking,
    });
  } catch (error) {
    logger.error(`Error cancelling booking: ${error.message}`);
    res.status(500).json({
      error: true,
      message: 'Failed to cancel booking',
      details: error.message,
    });
  }
};

/**
 * Check room availability
 * Public endpoint - no authentication required
 */
exports.checkAvailability = async (req, res) => {
  try {
    const { hotelId, roomId, checkIn, checkOut } = req.query;

    logger.debug(`Checking availability for room ${roomId} at hotel ${hotelId}`);

    // Call Hotel Service to check availability
    const availability = await HotelService.checkRoomAvailability(
      hotelId,
      roomId,
      checkIn,
      checkOut
    );

    res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    logger.error(`Error checking availability: ${error.message}`);
    res.status(500).json({
      error: true,
      message: 'Failed to check availability',
      details: error.message,
    });
  }
};

/**
 * Get booking statistics (admin endpoint)
 */
exports.getBookingStats = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    const stats = await Booking.aggregate([
      {
        $match: { userId },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSpent: { $sum: '$totalPrice' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error(`Error getting booking stats: ${error.message}`);
    res.status(500).json({
      error: true,
      message: 'Failed to get booking statistics',
      details: error.message,
    });
  }
};
