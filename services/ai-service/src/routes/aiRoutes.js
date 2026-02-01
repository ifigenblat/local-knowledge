const express = require('express');
const { regenerateCardWithAI, getOllamaStatus } = require('../aiProcessor');

const router = express.Router();

/**
 * GET /status
 * Ollama availability and configuration
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getOllamaStatus();
    res.json(status);
  } catch (error) {
    console.error('AI status error:', error);
    res.status(500).json({
      enabled: false,
      available: false,
      error: error.message || 'Error checking AI status',
    });
  }
});

/**
 * POST /regenerate
 * Body: { snippet, sourceFileName? }
 * Generate card data from snippet using Ollama
 */
router.post('/regenerate', async (req, res) => {
  try {
    const { snippet, sourceFileName } = req.body;
    if (!snippet || typeof snippet !== 'string') {
      return res.status(400).json({ error: 'snippet is required and must be a string' });
    }
    const result = await regenerateCardWithAI(snippet, sourceFileName || 'regenerated');
    res.json(result);
  } catch (error) {
    console.error('AI regenerate error:', error);
    res.status(500).json({
      error: 'AI regeneration failed',
      message: error.message || 'Error regenerating card with AI',
    });
  }
});

module.exports = router;
