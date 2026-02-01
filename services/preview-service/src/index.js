require('dotenv').config();
const express = require('express');
const cors = require('cors');
const previewRoutes = require('./routes/previewRoutes');

const app = express();
const PORT = process.env.PORT || 5011;

app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'preview-service' });
});

app.get('/status', (req, res) => {
  const path = require('path');
  const uploadDir = process.env.UPLOAD_DIR || '../../server/uploads';
  const resolved = path.isAbsolute(uploadDir) ? uploadDir : path.resolve(process.cwd(), uploadDir);
  const fs = require('fs');
  const exists = fs.existsSync(resolved);
  res.json({
    configured: true,
    uploadDir: resolved,
    uploadDirExists: exists,
    message: exists ? 'Preview service ready' : 'Upload directory not found',
  });
});

app.use('/', previewRoutes);

app.listen(PORT, () => {
  const uploadDir = process.env.UPLOAD_DIR || '../../server/uploads';
  console.log(`Preview Service listening on port ${PORT}`);
  console.log(`Upload dir: ${uploadDir}`);
});
