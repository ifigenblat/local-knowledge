const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5006;

app.use((req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    req.user = {
      id: userId,
      email: req.headers['x-user-email'] || '',
    };
  }
  next();
});

app.use(cors());

app.get('/health', (req, res) => {
  res.json({
    service: 'upload-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/upload', uploadRoutes);

app.use((err, req, res, next) => {
  console.error('Upload Service Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    service: 'upload-service',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Upload Service running on port ${PORT}`);
});

module.exports = app;
