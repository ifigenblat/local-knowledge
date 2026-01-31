const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const path = require('path');
// Register Role model for populate() to work (uses this service's mongoose)
require('./models/Role');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'user-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/users', userRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('User Service Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    service: 'user-service'
  });
});

// Start server
const startServer = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/local-knowledge';

    // IMPORTANT: Use this service's local mongoose instance
    await mongoose.connect(mongoURI);
    console.log(
      '✅ User Service MongoDB connected (readyState:',
      mongoose.connection.readyState,
      ')'
    );

    app.listen(PORT, () => {
      console.log(`🚀 User Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start User Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
