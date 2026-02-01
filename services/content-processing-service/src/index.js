require('dotenv').config();
const express = require('express');
const cors = require('cors');
const processRoutes = require('./routes/processRoutes');

const app = express();
const PORT = process.env.PORT || 5007;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/', processRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'content-processing-service' });
});

app.listen(PORT, () => {
  console.log(`Content Processing Service listening on port ${PORT}`);
});
