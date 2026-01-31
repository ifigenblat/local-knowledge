/**
 * Shared Database Connection Module
 * Minimal, reliable MongoDB connector for all microservices
 */

const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  // If already connected, just return the existing connection
  if (mongoose.connection.readyState === 1 && isConnected) {
    return mongoose.connection;
  }

  const mongoURI =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/local-knowledge';

  try {
    // Let Mongoose handle buffering and reconnection with its defaults
    await mongoose.connect(mongoURI);
    isConnected = true;
    console.log('✅ MongoDB connected (readyState:', mongoose.connection.readyState, ')');
    return mongoose.connection;
  } catch (err) {
    isConnected = false;
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB disconnected');
  }
};

module.exports = { connectDB, disconnectDB };
