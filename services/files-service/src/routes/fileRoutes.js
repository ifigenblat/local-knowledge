const express = require('express');
const path = require('path');
const fs = require('fs');
const Card = require('../models/Card');
const Collection = require('../models/Collection');

const router = express.Router();

const getUploadDir = () => {
  const dir = process.env.UPLOAD_DIR;
  if (dir && path.isAbsolute(dir)) return dir;
  if (dir) return path.resolve(process.cwd(), dir);
  return path.resolve(process.cwd(), '../../server/uploads');
};

function requireUser(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: 'No token provided',
      message: 'Call via API Gateway with Authorization header.',
    });
  }
  next();
}

router.use(requireUser);

function getFileType(filename) {
  const ext = path.extname(filename || '').toLowerCase().replace(/^\./, '');
  return ext || 'unknown';
}

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = (req.query.search || '').trim().toLowerCase();
    const typeFilter = (req.query.typeFilter || '').trim().toLowerCase();
    const sortBy = (req.query.sortBy || 'name').toLowerCase();
    const sortOrder = (req.query.sortOrder || 'asc').toLowerCase();

    const cards = await Card.find({ user: userId })
      .select('attachments provenance source createdAt')
      .lean();

    const fileMap = new Map();
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
      const cardCreated = card.createdAt ? new Date(card.createdAt).getTime() : null;
      for (const fn of filenames) {
        if (!fileMap.has(fn)) {
          const att = card.attachments?.find(a => a.filename === fn);
          fileMap.set(fn, {
            filename: fn,
            originalName: att?.originalName || fn,
            cardCount: 0,
            cardIds: [],
            earliestCardAt: cardCreated,
          });
        }
        const entry = fileMap.get(fn);
        entry.cardCount += 1;
        if (card._id && !entry.cardIds.includes(card._id.toString())) {
          entry.cardIds.push(card._id.toString());
        }
        if (cardCreated != null && (entry.earliestCardAt == null || cardCreated < entry.earliestCardAt)) {
          entry.earliestCardAt = cardCreated;
        }
      }
    }

    const uploadDir = getUploadDir();
    const fileList = Array.from(fileMap.values());
    const filesWithStats = fileList.map((f) => {
      let uploadedAt = null;
      if (f.earliestCardAt != null) {
        uploadedAt = new Date(f.earliestCardAt).toISOString();
      }
      if (!uploadedAt) {
        const filePath = path.join(uploadDir, f.filename);
        try {
          const stat = fs.statSync(filePath);
          uploadedAt = stat.mtime ? stat.mtime.toISOString() : null;
        } catch {
          /* file may not exist on disk */
        }
      }
      return {
        filename: f.filename,
        originalName: f.originalName,
        cardCount: f.cardCount,
        fileType: getFileType(f.originalName || f.filename),
        uploadedAt,
      };
    });
    let files = filesWithStats;

    if (search) {
      files = files.filter(
        f =>
          f.originalName.toLowerCase().includes(search) ||
          f.filename.toLowerCase().includes(search)
      );
    }

    if (typeFilter) {
      files = files.filter((f) => (f.fileType || '').toLowerCase() === typeFilter);
    }

    // Sort
    const order = sortOrder === 'desc' ? -1 : 1;
    if (sortBy === 'type') {
      files.sort((a, b) => {
        const cmp = (a.fileType || '').localeCompare(b.fileType || '');
        return cmp * order;
      });
    } else if (sortBy === 'date') {
      files.sort((a, b) => {
        const aDate = a.uploadedAt || '';
        const bDate = b.uploadedAt || '';
        const cmp = aDate.localeCompare(bDate);
        return cmp * order;
      });
    } else {
      files.sort((a, b) => {
        const cmp = (a.originalName || a.filename || '').localeCompare(b.originalName || b.filename || '', undefined, { sensitivity: 'base' });
        return cmp * order;
      });
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

router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user.id;

    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const cards = await Card.find({
      user: userId,
      $or: [
        { 'attachments.filename': filename },
        { 'provenance.source_file_id': filename },
      ],
    });

    const cardIds = cards.map(c => c._id);

    await Collection.updateMany(
      { cards: { $in: cardIds } },
      { $pullAll: { cards: cardIds } }
    );

    const deleteResult = await Card.deleteMany({
      _id: { $in: cardIds },
      user: userId,
    });

    const uploadDir = getUploadDir();
    const filePath = path.join(uploadDir, filename);
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
