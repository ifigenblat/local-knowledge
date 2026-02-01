const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const CONTENT_SERVICE_URL = process.env.CONTENT_SERVICE_URL || 'http://localhost:5007';
const CARD_SERVICE_URL = process.env.CARD_SERVICE_URL || 'http://localhost:5004';

// Upload directory: backend must be able to read (default: repo/server/uploads)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), '..', '..', 'server', 'uploads');

function requireUser(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: 'No token provided',
      message: 'Call via API Gateway (port 8000) with Authorization: Bearer <token>.',
    });
  }
  next();
}

router.use(requireUser);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.isAbsolute(UPLOAD_DIR) ? UPLOAD_DIR : path.resolve(UPLOAD_DIR);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/json',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Single file: save, extract via content-service, create cards via card-service
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const file = req.file;
    const userId = req.user.id;
    const filePath = path.resolve(file.path);

    // 1. Extract content via content-processing-service
    let processedContent;
    try {
      const contentRes = await fetch(`${CONTENT_SERVICE_URL.replace(/\/$/, '')}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          originalName: file.originalname,
          filename: file.filename,
          mimetype: file.mimetype,
        }),
      });
      const contentData = await contentRes.json().catch(() => ({}));
      if (!contentRes.ok) {
        throw new Error(contentData.message || contentData.error || `Content service ${contentRes.status}`);
      }
      processedContent = contentData.items || [];
    } catch (err) {
      if (fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (_) {}
      }
      return res.status(502).json({
        error: 'Content extraction failed',
        message: err.message,
        service: 'upload-service',
      });
    }

    if (!processedContent || processedContent.length === 0) {
      if (fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (_) {}
      }
      return res.status(400).json({ error: 'No content could be extracted from the file' });
    }

    // 2. Create cards via card-service
    const cardBody = {
      filePath,
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      items: processedContent,
      category: req.body.category,
      tags: req.body.tags,
      model_name: req.body.model_name,
      prompt_version: req.body.prompt_version,
      confidence_score: req.body.confidence_score,
    };
    const cardRes = await fetch(`${CARD_SERVICE_URL.replace(/\/$/, '')}/api/cards/from-processed-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-User-Email': req.user.email || '',
      },
      body: JSON.stringify(cardBody),
    });
    const data = await cardRes.json().catch(() => ({}));
    if (!cardRes.ok) {
      if (fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (_) {}
      }
      return res.status(cardRes.status).json(data);
    }
    res.status(cardRes.status).json(data);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    console.error('Upload service POST / error:', error);
    res.status(500).json({
      error: error.message || 'Error processing file',
      service: 'upload-service',
    });
  }
});

// Multiple files: save each, extract, create cards
router.post('/multiple', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const userId = req.user.id;
    const results = [];
    for (const file of req.files) {
      try {
        const filePath = path.resolve(file.path);
        const contentRes = await fetch(`${CONTENT_SERVICE_URL.replace(/\/$/, '')}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath,
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
          }),
        });
        const contentData = await contentRes.json().catch(() => ({}));
        const processedContent = contentRes.ok ? (contentData.items || []) : [];

        if (processedContent.length === 0) {
          if (fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (_) {}
          }
          results.push({ file: file.originalname, success: false, error: 'No content extracted' });
          continue;
        }

        const cardRes = await fetch(`${CARD_SERVICE_URL.replace(/\/$/, '')}/api/cards/from-processed-file`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
            'X-User-Email': req.user.email || '',
          },
          body: JSON.stringify({
            filePath,
            originalName: file.originalname,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
            items: processedContent,
            category: req.body.category,
            tags: req.body.tags,
            model_name: req.body.model_name,
            prompt_version: req.body.prompt_version,
            confidence_score: req.body.confidence_score,
          }),
        });
        const data = await cardRes.json().catch(() => ({}));
        if (cardRes.ok) {
          results.push({
            file: file.originalname,
            success: true,
            created: data.details?.created ?? 0,
            updated: data.details?.updated ?? 0,
            total: (data.details?.created ?? 0) + (data.details?.updated ?? 0),
            cards: data.cards || [],
          });
        } else {
          if (fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (_) {}
          }
          results.push({
            file: file.originalname,
            success: false,
            error: data.error || data.message || cardRes.statusText,
          });
        }
      } catch (err) {
        if (fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch (_) {}
        }
        results.push({ file: file.originalname, success: false, error: err.message });
      }
    }
    res.status(201).json({
      message: 'Batch upload completed',
      results,
    });
  } catch (error) {
    console.error('Upload service POST /multiple error:', error);
    res.status(500).json({
      error: error.message || 'Error processing files',
      service: 'upload-service',
    });
  }
});

// Progress (stub)
router.get('/progress/:id', (req, res) => {
  res.json({ progress: 0, status: 'not implemented' });
});

module.exports = router;
