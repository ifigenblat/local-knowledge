require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fileRoutes = require('./routes/fileRoutes');

const app = express();
const PORT = process.env.PORT || 5012;

app.use((req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    req.user = { id: userId, email: req.headers['x-user-email'] || '' };
  }
  next();
});

app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'files-service', database: 'postgresql' });
});

app.use('/', fileRoutes);

const startServer = async () => {
  try {
    const { initPostgres } = require(path.join(__dirname, '../../shared/postgres'));
    await initPostgres();
    console.log('Files Service PostgreSQL connected');
    app.listen(PORT, () => {
      console.log(`Files Service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Files Service:', error);
    process.exit(1);
  }
};

startServer();
