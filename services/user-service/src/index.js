const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
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
    database: 'postgresql',
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
    const { initPostgres } = require(path.join(__dirname, '../../shared/postgres'));
    await initPostgres();
    app.listen(PORT, () => {
      console.log(`🚀 User Service running on port ${PORT} (PostgreSQL)`);
    });
  } catch (error) {
    console.error('Failed to start User Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
