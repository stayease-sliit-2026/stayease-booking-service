const axios = require('axios');
const logger = require('../config/logger');

const HOTEL_SERVICE_URL = process.env.HOTEL_SERVICE_URL;
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000');

/**
 * Service for communicating with Hotel Listing Service
 */
class HotelService {
  /**
   * Check if a room is available for the specified dates
   * @param {string} hotelId - Hotel ID
   * @param {string} roomId - Room ID
   * @param {string} checkIn - Check-in date (ISO8601)
   * @param {string} checkOut - Check-out date (ISO8601)
   * @returns {Promise<Object>} - Room availability status
   */
  static async checkRoomAvailability(hotelId, roomId, checkIn, checkOut) {
    try {
      const response = await axios.get(
        `${HOTEL_SERVICE_URL}/hotels/${hotelId}/rooms/${roomId}/availability`,
        {
          params: {
            checkIn,
            checkOut,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to check room availability: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get room details from Hotel Service
   * @param {string} hotelId - Hotel ID
   * @param {string} roomId - Room ID
   * @returns {Promise<Object>} - Room details
   */
  static async getRoom(hotelId, roomId) {
    try {
      const response = await axios.get(
        `${HOTEL_SERVICE_URL}/hotels/${hotelId}/rooms/${roomId}`,
        {
          timeout: REQUEST_TIMEOUT,
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get room details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get hotel details from Hotel Service
   * @param {string} hotelId - Hotel ID
   * @returns {Promise<Object>} - Hotel details
   */
  static async getHotel(hotelId) {
    try {
      const response = await axios.get(
        `${HOTEL_SERVICE_URL}/hotels/${hotelId}`,
        {
          timeout: REQUEST_TIMEOUT,
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get hotel details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reserve a room (decrease availability)
   * @param {string} hotelId - Hotel ID
   * @param {string} roomId - Room ID
   * @param {string} checkIn - Check-in date
   * @param {string} checkOut - Check-out date
   * @param {string} token - JWT token for authorization
   * @returns {Promise<Object>} - Reservation confirmation
   */
  static async reserveRoom(hotelId, roomId, checkIn, checkOut, token) {
    try {
      const response = await axios.post(
        `${HOTEL_SERVICE_URL}/hotels/${hotelId}/rooms/${roomId}/reserve`,
        {
          checkIn,
          checkOut,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to reserve room: ${error.message}`);
      throw error;
    }
  }
}

module.exports = HotelService;
