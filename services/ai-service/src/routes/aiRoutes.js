const express = require('express');
const { regenerateCardWithAI, generateCardsFromDocument, getOllamaStatus, invalidateSettingsCache } = require('../aiProcessor');

const router = express.Router();

const MAX_TEXT_LENGTH = 500000; // Safety cap; cloud processes by paragraph so no truncation

/** Wrap async handler so Express 4 catches promise rejections and passes to next(err) */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

/**
 * POST /generate-cards
 * Body: { text, sourceFileName? }
 * Generate multiple cards from full document text using AI
 */
router.post('/generate-cards', asyncHandler(async (req, res) => {
  let { text, sourceFileName } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required and must be a string' });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.substring(0, MAX_TEXT_LENGTH);
    console.warn(`generate-cards: text truncated to ${MAX_TEXT_LENGTH} chars`);
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
