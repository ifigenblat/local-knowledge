const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const cardRoutes = require('./routes/cardRoutes');

const app = express();
const PORT = process.env.PORT || 5004;

app.use((req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    req.user = { id: userId, email: req.headers['x-user-email'] || '' };
  }
  next();
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({
    service: 'card-service',
    status: 'healthy',
    database: 'postgresql',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/cards/count', async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({
      error: 'No token provided',
      message: 'Call via API Gateway with Authorization: Bearer <token>.',
    });
  }
  try {
    const CardService = require('./services/CardService');
    const { type, category, search, source, sourceFileType, dateFrom, dateTo } = req.query;
    const count = await CardService.getCardsCount(req.user.id, { type, category, search, source, sourceFileType, dateFrom, dateTo });
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

app.use('/api/cards', cardRoutes);

app.use((err, req, res, next) => {
  console.error('Card Service Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    service: 'card-service',
  });
});

const startServer = async () => {
  try {
    const { initPostgres } = require(path.join(__dirname, '../../shared/postgres'));
    await initPostgres();
    app.listen(PORT, () => {
      console.log(`🚀 Card Service running on port ${PORT} (PostgreSQL)`);
    });
  } catch (error) {
    console.error('Failed to start Card Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
