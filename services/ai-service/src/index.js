require('dotenv').config();
const express = require('express');
const cors = require('cors');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 5008;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/', aiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ai-service' });
});

app.listen(PORT, () => {
  console.log(`AI Service listening on port ${PORT}`);
});
