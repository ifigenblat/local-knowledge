const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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
    database: 'postgresql',
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

const startServer = async () => {
  try {
    const { connectDB } = require(path.join(__dirname, '../../shared/postgres/database'));
    const { initModels } = require(path.join(__dirname, '../../shared/postgres/models'));
    await connectDB();
    initModels();

    app.listen(PORT, () => {
      console.log(`🚀 Role Service running on port ${PORT} (PostgreSQL)`);
    });
  } catch (error) {
    console.error('Failed to start Role Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
