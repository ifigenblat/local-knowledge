const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Card = require('../models/Card');
const Collection = require('../models/Collection');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// List uploaded files for the current user (derived from cards) with pagination and search
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = (req.query.search || '').trim().toLowerCase();

    // Find all cards belonging to user and extract unique source files
    const cards = await Card.find({ user: userId })
      .select('attachments provenance source')
      .lean();

    const fileMap = new Map(); // filename -> { originalName, cardCount, cardIds }
    for (const card of cards) {
      const filenames = new Set();
      if (card.attachments && card.attachments.length > 0) {
        for (const att of card.attachments) {
          if (att.filename) filenames.add(att.filename);
        }
      }
      if (card.provenance?.source_file_id) {
        filenames.add(card.provenance.source_file_id);
      }
      for (const fn of filenames) {
        if (!fileMap.has(fn)) {
          const att = card.attachments?.find(a => a.filename === fn);
          fileMap.set(fn, {
            filename: fn,
            originalName: att?.originalName || fn,
            cardCount: 0,
            cardIds: [],
          });
        }
        const entry = fileMap.get(fn);
        entry.cardCount += 1;
        if (card._id && !entry.cardIds.includes(card._id.toString())) {
          entry.cardIds.push(card._id.toString());
        }
      }
    }

    let files = Array.from(fileMap.values()).map(f => ({
      filename: f.filename,
      originalName: f.originalName,
      cardCount: f.cardCount,
    }));

    // Apply search filter
    if (search) {
      files = files.filter(
        f =>
          f.originalName.toLowerCase().includes(search) ||
          f.filename.toLowerCase().includes(search)
      );
    }

    const total = files.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    files = files.slice(offset, offset + limit);

    res.json({
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Error listing files', message: error.message });
  }
});

// Delete an uploaded file and all associated cards
router.delete('/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user.id;

    // Validate filename (prevent path traversal)
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Find all cards that reference this file and belong to the user
    const cards = await Card.find({
      user: userId,
      $or: [
        { 'attachments.filename': filename },
        { 'provenance.source_file_id': filename },
      ],
    });

    const cardIds = cards.map(c => c._id);

    // Remove cards from collections before deleting
    await Collection.updateMany(
      { cards: { $in: cardIds } },
      { $pullAll: { cards: cardIds } }
    );

    // Delete the cards
    const deleteResult = await Card.deleteMany({
      _id: { $in: cardIds },
      user: userId,
    });

    // Delete the physical file
    const filePath = path.join(UPLOAD_DIR, filename);
    let fileDeleted = false;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      fileDeleted = true;
    }

    res.json({
      message: `Deleted file and ${deleteResult.deletedCount} associated card(s)`,
      deletedCards: deleteResult.deletedCount,
      fileDeleted,
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Error deleting file', message: error.message });
  }
});

module.exports = router;
