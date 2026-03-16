const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    hotelId: {
      type: String,
      required: true,
      index: true,
    },
    roomId: {
      type: String,
      required: true,
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    numberOfGuests: {
      type: Number,
      required: true,
      min: 1,
    },
    roomType: {
      type: String,
      required: false,
    },
    specialRequests: {
      type: String,
      required: false,
    },
    paymentId: {
      type: String,
      required: false,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
    },
    cancellationReason: {
      type: String,
      required: false,
    },
    cancellationDate: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ hotelId: 1, checkIn: 1, checkOut: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
