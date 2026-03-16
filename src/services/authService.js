const axios = require('axios');
const logger = require('../config/logger');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000');

/**
 * Service for communicating with Auth Service
 */
class AuthService {
  /**
   * Verify authentication token with Auth Service
   * @param {string} token - JWT token to verify
   * @returns {Promise<Object>} - User data from token
   */
  static async verifyToken(token) {
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: REQUEST_TIMEOUT,
      });

      return response.data.user || response.data;
    } catch (error) {
      logger.error(`Failed to verify token with Auth Service: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user profile from Auth Service
   * @param {string} userId - User ID to fetch
   * @param {string} token - JWT token for authorization
   * @returns {Promise<Object>} - User profile data
   */
  static async getUserProfile(userId, token) {
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/auth/profile/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: REQUEST_TIMEOUT,
      });

      return response.data;
    } catch (error) {
      logger.error(`Failed to get user profile from Auth Service: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AuthService;
