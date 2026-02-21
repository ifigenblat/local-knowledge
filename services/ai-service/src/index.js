require('dotenv').config();
const express = require('express');
const cors = require('cors');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 5008;

// Prevent process exit on unhandled errors (log and keep running)
process.on('uncaughtException', (err) => {
  console.error('[ai-service] uncaughtException:', err && err.message ? err.message : err);
  if (err && err.stack) console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ai-service] unhandledRejection:', reason);
});

app.use(cors());
// Body limit: clients send one chunk per request (e.g. 6k chars); 500k allows margin
app.use(express.json({ limit: '1mb' }));
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    if (!res.headersSent) res.status(413).json({ error: 'Payload too large', message: 'Request body must be under 2MB' });
    return;
  }
  next(err);
});

app.use('/', aiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ai-service' });
});

// Catch any errors that escape route handlers (including async rejections via asyncHandler)
app.use((err, req, res, next) => {
  const msg = err && typeof err.message === 'string' ? err.message : String(err);
  console.error('[ai-service] Express error:', msg);
  if (err && err.stack) console.error(err.stack);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'AI service error',
      message: msg,
    });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`AI Service listening on port ${PORT}`);
  });
}

module.exports = app;
