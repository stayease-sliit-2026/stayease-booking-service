const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const options = {};
    if (process.env.MONGODB_DB_NAME) {
      options.dbName = process.env.MONGODB_DB_NAME;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
