const express = require('express');
const { regenerateCardWithAI, generateCardsFromDocument, getOllamaStatus, getAIMaxTextLength, invalidateSettingsCache } = require('../aiProcessor');

const router = express.Router();

/** Wrap async handler so Express 4 catches promise rejections and passes to next(err) */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

/**
 * POST /generate-cards
 * Body: { text, sourceFileName? }
 * Generate cards from one chunk of text. For long documents, caller must chunk and call per chunk.
 */
router.post('/generate-cards', asyncHandler(async (req, res) => {
  let { text, sourceFileName } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required and must be a string' });
  }
  const maxLength = getAIMaxTextLength();
  if (text.length > maxLength) {
    return res.status(413).json({
      error: 'Payload too large',
      message: `text must be at most ${maxLength} characters; send document in chunks`,
    });
  }
  const cards = await generateCardsFromDocument(text.trim(), sourceFileName || 'document');
  if (!res.headersSent) res.json({ items: cards });
}));

/**
 * GET /status
 * Ollama availability and configuration
 */
router.get('/status', asyncHandler(async (req, res) => {
  invalidateSettingsCache();
  const status = await getOllamaStatus();
  if (!res.headersSent) res.json(status);
}));

/**
 * POST /regenerate
 * Body: { snippet, sourceFileName? }
 * Generate card data from snippet using Ollama
 */
router.post('/regenerate', asyncHandler(async (req, res) => {
  const { snippet, sourceFileName } = req.body || {};
  if (!snippet || typeof snippet !== 'string') {
    return res.status(400).json({ error: 'snippet is required and must be a string' });
  }
  const result = await regenerateCardWithAI(snippet, sourceFileName || 'regenerated');
  if (!res.headersSent) res.json(result);
}));

module.exports = router;
