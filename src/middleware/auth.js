const axios = require('axios');
const logger = require('../config/logger');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000');

/**
 * Auth Middleware - Validates JWT token by calling Auth Service
 * All protected endpoints must use this middleware
 */
const verifyToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: true,
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Call Auth Service to verify token
    const response = await axios.get(
      `${AUTH_SERVICE_URL}/auth/verify`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: REQUEST_TIMEOUT,
      }
    );

    // Token is valid, store user info in request
    req.user = response.data.user || response.data;
    req.token = token;
    
    logger.debug(`Token verified for user: ${req.user.id}`);
    next();
  } catch (error) {
    logger.error(`Token verification failed: ${error.message}`);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        error: true,
        message: 'Invalid or expired token',
      });
    }

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: true,
        message: 'Auth service unavailable',
      });
    }

    res.status(500).json({
      error: true,
      message: 'Token verification failed',
    });
  }
};

module.exports = verifyToken;
