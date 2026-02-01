require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fileRoutes = require('./routes/fileRoutes');

require('./models/Card');
require('./models/Collection');

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
  res.json({ status: 'healthy', service: 'files-service' });
});

app.use('/', fileRoutes);

const startServer = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/local-knowledge';
    await mongoose.connect(mongoURI);
    console.log('Files Service MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Files Service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Files Service:', error);
    process.exit(1);
  }
};

startServer();
