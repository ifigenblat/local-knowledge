const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const os = require('os');
const { processContent, extractTextOnly, createCardFromSection } = require('../processor/contentProcessor');

const router = express.Router();

/**
 * POST /regenerate-rule-based
 * Body: { snippet, sourceFileName?, filePath? }
 * Returns rule-based regenerated card data from a text snippet (for card regeneration).
 */
router.post('/regenerate-rule-based', async (req, res) => {
  try {
    const { snippet, sourceFileName = 'regenerated', filePath = null } = req.body;
    if (!snippet || typeof snippet !== 'string') {
      return res.status(400).json({
        error: 'snippet is required and must be a string',
      });
    }
    const result = await createCardFromSection(snippet, sourceFileName, filePath, 1, 1);
    if (!result) {
      return res.status(400).json({
        error: 'Could not generate card from snippet',
        message: 'Snippet may lack meaningful content',
      });
    }
    res.json(result);
  } catch (error) {
    console.error('Regenerate rule-based error:', error);
    res.status(500).json({
      error: 'Rule-based regeneration failed',
      message: error.message || 'Error regenerating from snippet',
    });
  }
});

// Optional: restrict filePath to this directory (security)
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : null;

/**
 * POST /process
 * Body: { filePath, originalName, filename, mimetype? }
 * Used by backend when processing uploaded files. filePath must be absolute and readable.
 */
router.post('/process', async (req, res) => {
  try {
    const { filePath, originalName, filename, mimetype } = req.body;
    if (!filePath || !originalName || !filename) {
      return res.status(400).json({
        error: 'filePath, originalName, and filename are required',
      });
    }
    const resolvedPath = path.resolve(filePath);
    if (UPLOAD_DIR && !resolvedPath.startsWith(UPLOAD_DIR)) {
      return res.status(403).json({
        error: 'File path not allowed',
        message: 'filePath must be under the configured upload directory',
      });
    }
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        error: 'File not found',
        message: 'File not found at path',
      });
    }
    const file = {
      path: resolvedPath,
      originalname: originalName,
      filename,
      size: fs.statSync(resolvedPath).size,
      mimetype: mimetype || 'application/octet-stream',
    };
    const items = await processContent(file);
    res.json({ items });
  } catch (error) {
    console.error('Process error:', error);
    res.status(500).json({
      error: 'Content processing failed',
      message: error.message || 'Error processing file',
    });
  }
});

/**
 * POST /extract-text
 * Body: { filePath, originalName, filename, mimetype? }
 * Extracts raw text from file for AI processing (no card creation).
 */
router.post('/extract-text', async (req, res) => {
  try {
    const { filePath, originalName, filename, mimetype } = req.body;
    if (!filePath || !originalName || !filename) {
      return res.status(400).json({
        error: 'filePath, originalName, and filename are required',
      });
    }
    const resolvedPath = path.resolve(filePath);
    if (UPLOAD_DIR && !resolvedPath.startsWith(UPLOAD_DIR)) {
      return res.status(403).json({
        error: 'File path not allowed',
        message: 'filePath must be under the configured upload directory',
      });
    }
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        error: 'File not found',
        message: 'File not found at path',
      });
    }
    const file = {
      path: resolvedPath,
      originalname: originalName,
      filename,
      size: fs.statSync(resolvedPath).size,
      mimetype: mimetype || 'application/octet-stream',
    };
    const text = await extractTextOnly(file);
    res.json({ text: text || '' });
  } catch (error) {
    console.error('Extract-text error:', error);
    res.status(500).json({
      error: 'Content processing failed',
      message: error.message || 'Error processing file',
    });
  }
});

/**
 * POST /extract
 * Multipart: file
 * For testing and direct use. Saves file to temp, processes, returns items, deletes temp.
 */
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
router.post('/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const file = {
      path: req.file.path,
      originalname: req.file.originalname || req.file.filename || 'upload',
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype || 'application/octet-stream',
    };
    let items;
    try {
      items = await processContent(file);
    } finally {
      if (fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      }
    }
    res.json({ items });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    console.error('Extract error:', error);
    res.status(500).json({
      error: 'Content extraction failed',
      message: error.message || 'Error processing file',
    });
  }
});

module.exports = router;
