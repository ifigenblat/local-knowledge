const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { getSequelize } = require(path.join(__dirname, '../../../shared/postgres/database'));

let Card, Collection;

async function getModels() {
  if (!Card) {
    const { initPostgres } = require(path.join(__dirname, '../../../shared/postgres'));
    const models = await initPostgres();
    Card = models.Card;
    Collection = models.Collection;
  }
  return { Card, Collection };
}

function getUploadDir() {
  const dir = process.env.UPLOAD_DIR;
  if (dir && path.isAbsolute(dir)) return dir;
  if (dir) return path.resolve(process.cwd(), dir);
  return path.resolve(process.cwd(), '../uploads');
}

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
    const { Card } = await getModels();
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = (req.query.search || '').trim().toLowerCase();
    const typeFilter = (req.query.typeFilter || '').trim().toLowerCase();
    const sortBy = (req.query.sortBy || 'name').toLowerCase();
    const sortOrder = (req.query.sortOrder || 'asc').toLowerCase();

    const sequelize = getSequelize();
    const rows = await Card.findAll({
      where: { userId },
      attributes: ['id', 'attachments', 'provenance', 'source', [sequelize.col('created_at'), 'createdAt']],
      raw: true,
    });

    const fileMap = new Map();
    for (const card of rows) {
      const filenames = new Set();
      const attachments = card.attachments || [];
      for (const att of attachments) {
        if (att && att.filename) filenames.add(att.filename);
      }
      const prov = card.provenance || {};
      if (prov.source_file_id) filenames.add(prov.source_file_id);
      const cardCreated = card.createdAt ? new Date(card.createdAt).getTime() : null;
      for (const fn of filenames) {
        if (!fileMap.has(fn)) {
          const att = attachments.find((a) => a && a.filename === fn);
          fileMap.set(fn, {
            filename: fn,
            originalName: (att && att.originalName) || fn,
            cardCount: 0,
            cardIds: [],
            earliestCardAt: cardCreated,
          });
        }
        const entry = fileMap.get(fn);
        entry.cardCount += 1;
        const cid = card.id;
        if (cid && !entry.cardIds.includes(String(cid))) {
          entry.cardIds.push(String(cid));
        }
        if (cardCreated != null && (entry.earliestCardAt == null || cardCreated < entry.earliestCardAt)) {
          entry.earliestCardAt = cardCreated;
        }
      }
    }

    const uploadDir = getUploadDir();
    const fileList = Array.from(fileMap.values());
    let files = fileList.map((f) => {
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
          /* ignore */
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

    if (search) {
      files = files.filter(
        (f) =>
          (f.originalName || '').toLowerCase().includes(search) ||
          (f.filename || '').toLowerCase().includes(search)
      );
    }
    if (typeFilter) {
      files = files.filter((f) => (f.fileType || '').toLowerCase() === typeFilter);
    }

    const order = sortOrder === 'desc' ? -1 : 1;
    if (sortBy === 'type') {
      files.sort((a, b) => (a.fileType || '').localeCompare(b.fileType || '') * order);
    } else if (sortBy === 'date') {
      files.sort((a, b) => (a.uploadedAt || '').localeCompare(b.uploadedAt || '') * order);
    } else {
      files.sort((a, b) =>
        (a.originalName || a.filename || '').localeCompare(b.originalName || b.filename || '', undefined, {
          sensitivity: 'base',
        }) * order
      );
    }

    const total = files.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    files = files.slice(offset, offset + limit);

    res.json({
      files,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
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

    const { Card, Collection } = await getModels();

    const rows = await Card.findAll({
      where: { userId },
      attributes: ['id', 'attachments', 'provenance'],
      raw: true,
    });

    const cardIds = rows
      .filter((c) => {
        const att = c.attachments || [];
        if (att.some((a) => a && a.filename === filename)) return true;
        if ((c.provenance || {}).source_file_id === filename) return true;
        return false;
      })
      .map((c) => c.id);

    if (cardIds.length) {
      const { getSequelize } = require(path.join(__dirname, '../../../shared/postgres/database'));
      const sequelize = getSequelize();
      if (sequelize) {
        const placeholders = cardIds.map(() => '?').join(',');
        await sequelize.query(`DELETE FROM collection_cards WHERE card_id IN (${placeholders})`, {
          replacements: cardIds,
        });
      }
      await Card.destroy({ where: { id: cardIds, userId } });
    }

    const uploadDir = getUploadDir();
    const filePath = path.join(uploadDir, filename);
    let fileDeleted = false;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      fileDeleted = true;
    }

    res.json({
      message: `Deleted file and ${cardIds.length} associated card(s)`,
      deletedCards: cardIds.length,
      fileDeleted,
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Error deleting file', message: error.message });
  }
});

module.exports = router;
