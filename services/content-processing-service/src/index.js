require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const processRoutes = require('./routes/processRoutes');
const rulesRoutes = require('./routes/rulesRoutes');

const app = express();
const PORT = process.env.PORT || 5007;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/', processRoutes);
app.use('/rules', rulesRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'content-processing-service' });
});

const startServer = async () => {
  try {
    const { initPostgres } = require(path.join(__dirname, '../../shared/postgres'));
    await initPostgres();
    app.listen(PORT, () => {
      console.log(`Content Processing Service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Content Processing Service:', error?.message || error);
    // Run without DB - rules will use defaults, but rules API PUT/reset will fail
    app.listen(PORT, () => {
      console.log(`Content Processing Service listening on port ${PORT} (rules from defaults, DB optional)`);
    });
  }
};

startServer();
