const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const auth = require('../middleware/auth');
const { createCardFromSection } = require('../utils/contentProcessor');
const { regenerateCardHybrid, regenerateCardComparison, regenerateCardWithAI } = require('../utils/aiProcessor');

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

// Get a single card by ID or cardId (for sharing)
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if it's a cardId (6 character alphanumeric) or MongoDB ObjectId (24 chars)
    let card;
    if (id.length === 6 && /^[A-Z0-9]+$/.test(id.toUpperCase())) {
      // It's a cardId - allow access if card is public or belongs to user
      card = await Card.findByCardId(id.toUpperCase());
      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }
      // Check if user owns the card or if it's public
      if (card.user.toString() !== req.user.id && !card.isPublic) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else {
      // It's a MongoDB ObjectId - require ownership
      card = await Card.findOne({ _id: id, user: req.user.id });
      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }
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

// Regenerate card from provenance snippet
router.post('/:id/regenerate', auth, async (req, res) => {
  try {
    const card = await Card.findOne({ _id: req.params.id, user: req.user.id });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Check if card has a provenance snippet
    if (!card.provenance || !card.provenance.snippet) {
      return res.status(400).json({ error: 'Card does not have a provenance snippet to regenerate from' });
    }

    // Use the snippet as the source text for regeneration
    const snippet = card.provenance.snippet;
    const sourceFileName = card.source || card.provenance.source_path || 'regenerated';
    const filePath = card.provenance.source_path || null;

    // Get mode from request body (default to rule-based: false)
    const useAI = req.body.useAI === true;
    const comparisonMode = req.body.comparisonMode === true;
    const selectedVersion = req.body.selectedVersion;

    // If user selected a version from comparison, apply it FIRST (before comparison check)
    if (selectedVersion) {
      const versionToUse = selectedVersion; // 'ruleBased' or 'ai'
      const comparisonData = req.body.comparisonData; // Use the exact comparison data from frontend
      
      let regeneratedCardData;
      
      // If comparison data is provided, use the exact values that were already shown to the user
      if (comparisonData && comparisonData[versionToUse]) {
        regeneratedCardData = comparisonData[versionToUse];
      } else {
        // Fallback: regenerate if comparison data not provided (shouldn't happen in normal flow)
        console.warn('Comparison data not provided, regenerating...');
        if (versionToUse === 'ai') {
          try {
            regeneratedCardData = await regenerateCardWithAI(snippet, sourceFileName);
          } catch (aiError) {
            console.warn('AI regeneration failed when applying selected version, falling back to rule-based:', aiError.message);
            regeneratedCardData = await createCardFromSection(snippet, sourceFileName, filePath, 1, 1);
          }
        } else {
          regeneratedCardData = await createCardFromSection(snippet, sourceFileName, filePath, 1, 1);
        }
      }
      
      if (!regeneratedCardData) {
        return res.status(400).json({ error: 'Failed to regenerate card from snippet' });
      }

      // Update the existing card with selected version
      card.title = regeneratedCardData.title;
      card.content = regeneratedCardData.content;
      card.type = regeneratedCardData.type;
      card.category = regeneratedCardData.category;
      card.tags = regeneratedCardData.tags;

      // Preserve existing provenance but update snippet if it changed
      if (regeneratedCardData.provenance) {
        card.provenance = {
          ...card.provenance,
          ...regeneratedCardData.provenance,
          location: card.provenance.location || regeneratedCardData.provenance.location,
        };
      }

      // Update prompt version to indicate regeneration
      if (card.provenance) {
        const currentVersion = card.provenance.prompt_version || '1.0';
        const versionParts = currentVersion.split('.');
        const majorVersion = parseInt(versionParts[0]) || 1;
        const minorVersion = parseInt(versionParts[1]) || 0;
        card.provenance.prompt_version = `${majorVersion}.${minorVersion + 1}`;
      }

      await card.save();
      return res.json(card);
    }

    // If comparison mode is requested and AI is enabled, return both versions
    if (comparisonMode && useAI) {
      const comparison = await regenerateCardComparison(snippet, sourceFileName, filePath);
      
      if (!comparison.ruleBased) {
        return res.status(400).json({ error: 'Failed to regenerate card from snippet' });
      }

      // Return both versions for comparison (don't save yet)
      return res.json({
        comparison: true,
        ruleBased: comparison.ruleBased,
        ai: comparison.ai,
        aiError: comparison.aiError,
        originalCard: {
          title: card.title,
          content: card.content,
          type: card.type,
          category: card.category,
          tags: card.tags,
        },
      });
    }

    // Standard regeneration (no comparison)
    const regeneratedCardData = await regenerateCardHybrid(
      snippet,
      sourceFileName,
      filePath,
      useAI
    );

    if (!regeneratedCardData) {
      return res.status(400).json({ error: 'Failed to regenerate card from snippet' });
    }

    // Update the existing card with regenerated data while preserving provenance
    card.title = regeneratedCardData.title;
    card.content = regeneratedCardData.content;
    card.type = regeneratedCardData.type;
    card.category = regeneratedCardData.category;
    card.tags = regeneratedCardData.tags;

    // Preserve existing provenance but update snippet if it changed
    if (regeneratedCardData.provenance) {
      card.provenance = {
        ...card.provenance,
        ...regeneratedCardData.provenance,
        // Keep original snippet location info
        location: card.provenance.location || regeneratedCardData.provenance.location,
      };
    }

    // Update prompt version to indicate regeneration
    if (card.provenance) {
      const currentVersion = card.provenance.prompt_version || '1.0';
      const versionParts = currentVersion.split('.');
      const majorVersion = parseInt(versionParts[0]) || 1;
      const minorVersion = parseInt(versionParts[1]) || 0;
      card.provenance.prompt_version = `${majorVersion}.${minorVersion + 1}`;
    }

    await card.save();
    res.json(card);
  } catch (error) {
    console.error('Regenerate card error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

