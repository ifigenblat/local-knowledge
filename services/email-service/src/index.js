require('dotenv').config();
const express = require('express');
const cors = require('cors');
const emailRoutes = require('./routes/emailRoutes');

const app = express();
const PORT = process.env.PORT || 5009;

app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.use('/', emailRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'email-service' });
});

app.listen(PORT, () => {
  console.log(`Email Service listening on port ${PORT}`);
});
