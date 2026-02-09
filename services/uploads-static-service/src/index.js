require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5013;

const getUploadDir = () => {
  const dir = process.env.UPLOAD_DIR;
  if (dir && path.isAbsolute(dir)) return dir;
  if (dir) return path.resolve(process.cwd(), dir);
  return path.resolve(process.cwd(), '../uploads');
};

const uploadDir = getUploadDir();

app.use(cors());
app.use('/uploads', express.static(uploadDir));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'uploads-static-service' });
});

app.listen(PORT, () => {
  console.log(`Uploads Static Service on port ${PORT}, serving: ${uploadDir}`);
});
