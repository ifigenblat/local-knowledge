const express = require('express');
const router = express.Router();
const CardService = require('../services/CardService');

const BACKEND_URL = process.env.BACKEND_SERVICE_URL || 'http://localhost:5010';

// Always get a string from any thrown value (Error, string, or other)
function getErrorMessage(err) {
  if (err == null) return 'Server error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  if (err.code) return `Error: ${err.code}`;
  try { return String(err); } catch (_) { return 'Server error'; }
}

// Middleware: req.user.id must be set by index.js from X-User-Id (gateway sets this after JWT)
function requireUser(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: 'No token provided',
      message: 'Call via API Gateway (port 8000) with Authorization: Bearer <token>. Direct calls to card service must send X-User-Id and X-User-Email headers.'
    });
  }
  next();
}

router.use(requireUser);

// Get all cards for user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const { type, category, search, source, sourceFileType, page, limit } = req.query;
    const result = await CardService.getCards(userId, { type, category, search, source, sourceFileType, page, limit }, {});
    res.json(result);
  } catch (error) {
    const msg = error?.name === 'CastError' && error?.kind === 'ObjectId'
      ? 'Invalid id format'
      : getErrorMessage(error);
    console.error('Card service GET / error:', msg, error?.stack || '');
    res.status(error?.status || 500).json({
      error: msg,
      message: msg,
      service: 'card-service'
    });
  }
});

// Get cards by category (before /:id)
router.get('/category/:category', async (req, res) => {
  try {
    const cards = await CardService.getCards(req.user.id, { category: req.params.category }, { limit: 1000 });
    res.json(cards.cards);
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Card service GET /category error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'card-service' });
  }
});

// Get cards by type (before /:id)
router.get('/type/:type', async (req, res) => {
  try {
    const cards = await CardService.getCards(req.user.id, { type: req.params.type }, { limit: 1000 });
    res.json(cards.cards);
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Card service GET /type error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'card-service' });
  }
});

// Regenerate card: proxy to backend (content + AI processing live there)
router.post('/:id/regenerate', async (req, res) => {
  try {
    const url = `${BACKEND_URL}/api/cards/${req.params.id}/regenerate`;
    const headers = {
      'Content-Type': 'application/json',
      ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
    };
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (error) {
    console.error('Card regenerate proxy error:', error);
    res.status(502).json({ error: 'Regenerate service unavailable' });
  }
});

// Get single card by ID or cardId
router.get('/:id', async (req, res) => {
  try {
    const card = await CardService.getCardByIdOrCardId(req.params.id, req.user.id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Card service GET /:id error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'card-service' });
  }
});

// Create card
router.post('/', async (req, res) => {
  try {
    const { title, content, type, category, tags, source, isPublic, provenance, generatedBy } = req.body;
    if (!title || !content || !category) {
      return res.status(400).json({ error: 'Title, content, and category are required' });
    }
    const card = await CardService.createCard(req.user.id, {
      title,
      content,
      type: type || 'concept',
      category,
      tags,
      source,
      isPublic,
      provenance,
      generatedBy,
    });
    res.status(201).json(card);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    const msg = getErrorMessage(error);
    console.error('Card service POST / error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'card-service' });
  }
});

// Update card
router.put('/:id', async (req, res) => {
  try {
    const card = await CardService.updateCard(req.params.id, req.user.id, req.body);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    const msg = getErrorMessage(error);
    console.error('Card service PUT /:id error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'card-service' });
  }
});

// Delete card
router.delete('/:id', async (req, res) => {
  try {
    const card = await CardService.deleteCard(req.params.id, req.user.id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Card service DELETE /:id error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'card-service' });
  }
});

// Update review
router.patch('/:id/review', async (req, res) => {
  try {
    const card = await CardService.updateReview(req.params.id, req.user.id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Card service PATCH /:id/review error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'card-service' });
  }
});

// Rate card
router.patch('/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    const card = await CardService.updateRating(req.params.id, req.user.id, rating);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Card service PATCH /:id/rate error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'card-service' });
  }
});

module.exports = router;
