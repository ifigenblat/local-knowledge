const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const collectionRoutes = require('./routes/collectionRoutes');

const app = express();
const PORT = process.env.PORT || 5005;

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

app.get('/health', (req, res) => {
  res.json({
    service: 'collection-service',
    status: 'healthy',
    database: 'postgresql',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/collections', collectionRoutes);

app.use((err, req, res, next) => {
  console.error('Collection Service Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    service: 'collection-service',
  });
});

const startServer = async () => {
  try {
    const { initPostgres } = require(path.join(__dirname, '../../shared/postgres'));
    await initPostgres();
    app.listen(PORT, () => {
      console.log(`🚀 Collection Service running on port ${PORT} (PostgreSQL)`);
    });
  } catch (error) {
    console.error('Failed to start Collection Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
