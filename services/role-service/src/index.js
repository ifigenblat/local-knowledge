const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('../../shared/database');
const roleRoutes = require('./routes/roleRoutes');

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'role-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/roles', roleRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Role Service Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    service: 'role-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Role Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Role Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
