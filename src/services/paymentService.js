const axios = require('axios');
const logger = require('../config/logger');

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL;
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000');

/**
 * Service for communicating with Payment & Notification Service
 */
class PaymentService {
  /**
   * Trigger payment processing for a booking
   * @param {Object} paymentData - Payment details
   * @param {string} paymentData.bookingId - Booking ID
   * @param {string} paymentData.userId - User ID
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.currency - Currency code
   * @param {string} token - JWT token for authorization
   * @returns {Promise<Object>} - Payment response
   */
  static async processPayment(paymentData, token) {
    try {
      const response = await axios.post(
        `${PAYMENT_SERVICE_URL}/payments`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to process payment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get payment status for a booking
   * @param {string} bookingId - Booking ID
   * @param {string} token - JWT token for authorization
   * @returns {Promise<Object>} - Payment status
   */
  static async getPaymentStatus(bookingId, token) {
    try {
      const response = await axios.get(
        `${PAYMENT_SERVICE_URL}/payments/${bookingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get payment status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process refund for a booking
   * @param {Object} refundData - Refund details
   * @param {string} refundData.bookingId - Booking ID
   * @param {string} refundData.amount - Refund amount
   * @param {string} refundData.reason - Reason for refund
   * @param {string} token - JWT token for authorization
   * @returns {Promise<Object>} - Refund response
   */
  static async processRefund(refundData, token) {
    try {
      const response = await axios.post(
        `${PAYMENT_SERVICE_URL}/payments/refund`,
        refundData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to process refund: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send notification for a booking
   * @param {Object} notificationData - Notification details
   * @param {string} notificationData.userId - User ID
   * @param {string} notificationData.type - Notification type
   * @param {string} notificationData.subject - Email subject
   * @param {string} notificationData.message - Notification message
   * @param {string} token - JWT token for authorization
   * @returns {Promise<Object>} - Notification response
   */
  static async sendNotification(notificationData, token) {
    try {
      const response = await axios.post(
        `${PAYMENT_SERVICE_URL}/notifications/send`,
        notificationData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to send notification: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PaymentService;
