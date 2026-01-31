const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const cardRoutes = require('./routes/cardRoutes');
const CardService = require('./services/CardService');

const app = express();
const PORT = process.env.PORT || 5004;

// Middleware: gateway sends X-User-Id and X-User-Email after JWT validation
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'card-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// GET /api/cards/count — count for the logged-in user only (optional: type, category, search)
app.get('/api/cards/count', async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({
      error: 'No token provided',
      message: 'Call via API Gateway with Authorization: Bearer <token>.',
    });
  }
  try {
    const { type, category, search, source, sourceFileType } = req.query;
    const count = await CardService.getCardsCount(req.user.id, { type, category, search, source, sourceFileType });
    res.json({ count });
  } catch (error) {
    console.error('Card service GET /api/cards/count error:', error?.message || error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Server error',
      message: error?.message || 'Server error',
      service: 'card-service',
    });
  }
});

// Routes
app.use('/api/cards', cardRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Card Service Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    service: 'card-service',
  });
});

const startServer = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/local-knowledge';

    await mongoose.connect(mongoURI);
    console.log(
      '✅ Card Service MongoDB connected (readyState:',
      mongoose.connection.readyState,
      ')'
    );

    app.listen(PORT, () => {
      console.log(`🚀 Card Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Card Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
