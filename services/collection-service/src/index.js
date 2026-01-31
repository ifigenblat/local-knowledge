const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Register Card model so Collection.populate('cards') works (ref: 'Card')
require('./models/Card');
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
    const mongoURI =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/local-knowledge';
    await mongoose.connect(mongoURI);
    console.log(
      '✅ Collection Service MongoDB connected (readyState:',
      mongoose.connection.readyState,
      ')'
    );
    app.listen(PORT, () => {
      console.log(`🚀 Collection Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Collection Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
