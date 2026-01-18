const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const auth = require('../middleware/auth');

// Get all cards for a user
router.get('/', auth, async (req, res) => {
  try {
    const { type, category, search, page = 1, limit = 20 } = req.query;
    const query = { user: req.user.id };

    // Add filters
    if (type) query.type = type;
    if (category) query.category = category;
    if (search) {
      query.$text = { $search: search };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const cards = await Card.find(query)
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit);

    const total = await Card.countDocuments(query);

    res.json({
      cards,
      pagination: {
        current: options.page,
        total: Math.ceil(total / options.limit),
        hasNext: options.page * options.limit < total,
        hasPrev: options.page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single card
router.get('/:id', auth, async (req, res) => {
  try {
    const card = await Card.findOne({ _id: req.params.id, user: req.user.id });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new card
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, type, category, tags, source, isPublic, provenance } = req.body;

    const cardData = {
      title,
      content,
      type,
      category,
      tags: tags || [],
      source: source || '',
      isPublic: isPublic || false,
      user: req.user.id
    };
    
    // Only include provenance if it's provided and not empty
    if (provenance && Object.keys(provenance).length > 0) {
      cardData.provenance = provenance;
    }
    
    const card = new Card(cardData);

    await card.save();
    res.status(201).json(card);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a card
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, type, category, tags, source, isPublic, provenance } = req.body;

    const card = await Card.findOne({ _id: req.params.id, user: req.user.id });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Update fields
    if (title) card.title = title;
    if (content) card.content = content;
    if (type) card.type = type;
    if (category) card.category = category;
    if (tags) card.tags = tags;
    if (source !== undefined) card.source = source;
    if (isPublic !== undefined) card.isPublic = isPublic;
    if (provenance) {
      // Merge provenance fields instead of replacing entirely
      card.provenance = { ...card.provenance, ...provenance };
    }

    await card.save();
    res.json(card);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a card
router.delete('/:id', auth, async (req, res) => {
  try {
    const card = await Card.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update card review
router.patch('/:id/review', auth, async (req, res) => {
  try {
    const card = await Card.findOne({ _id: req.params.id, user: req.user.id });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    await card.updateReview();
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Rate a card
router.patch('/:id/rate', auth, async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const card = await Card.findOne({ _id: req.params.id, user: req.user.id });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    card.metadata.rating = rating;
    await card.save();
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get cards by category
router.get('/category/:category', auth, async (req, res) => {
  try {
    const cards = await Card.findByCategory(req.params.category, req.user.id);
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get cards by type
router.get('/type/:type', auth, async (req, res) => {
  try {
    const cards = await Card.findByType(req.params.type, req.user.id);
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

