const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLogLevel = logLevels[process.env.LOG_LEVEL || 'info'];

const logger = {
  error: (message) => {
    if (currentLogLevel >= logLevels.error) {
      console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);
    }
  },
  warn: (message) => {
    if (currentLogLevel >= logLevels.warn) {
      console.warn(`[${new Date().toISOString()}] [WARN] ${message}`);
    }
  },
  info: (message) => {
    if (currentLogLevel >= logLevels.info) {
      console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
    }
  },
  debug: (message) => {
    if (currentLogLevel >= logLevels.debug) {
      console.log(`[${new Date().toISOString()}] [DEBUG] ${message}`);
    }
  },
};

module.exports = logger;
