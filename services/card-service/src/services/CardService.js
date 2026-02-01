const CardRepository = require('../repositories/CardRepository');
const Card = require('../models/Card');
const mongoose = require('mongoose');
const crypto = require('crypto');

function isValidObjectId(id) {
  if (id == null) return false;
  const str = String(id).trim();
  if (!str) return false;
  if (/^[a-fA-F0-9]{24}$/.test(str)) return true;
  try {
    return mongoose.Types.ObjectId.isValid(id);
  } catch {
    return false;
  }
}

function toObjectId(id) {
  if (id instanceof mongoose.Types.ObjectId) return id;
  const str = String(id).trim();
  if (/^[a-fA-F0-9]{24}$/.test(str)) return new mongoose.Types.ObjectId(str);
  throw new Error('Invalid user id');
}

class CardService {
  async getCards(userId, filters = {}, pagination = {}) {
    let uid;
    try {
      uid = toObjectId(userId);
    } catch (e) {
      const err = new Error('Invalid user id');
      err.status = 400;
      throw err;
    }
    const { type, category, search, source, sourceFileType, page = 1, limit = 20 } = filters;
    const query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    // Search across card content AND source/filename (combined) - partial match, any word matches
    const searchTerm = (search && typeof search === 'string' && search.trim()) ? search.trim() : null;
    const sourceTerm = (source && typeof source === 'string' && source.trim()) ? source.trim() : null;
    const term = searchTerm || sourceTerm;
    if (term) {
      const words = term.split(/\s+/).filter(w => w.length > 0);
      const fieldList = ['title', 'content', 'tags', 'source', 'attachments.originalName', 'attachments.filename', 'provenance.source_file_id', 'provenance.source_path'];
      const buildRegexOr = (word) => {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return { $or: fieldList.map(f => ({ [f]: { $regex: escaped, $options: 'i' } })) };
      };
      if (words.length > 1) {
        query.$or = words.map(w => buildRegexOr(w));
      } else {
        Object.assign(query, buildRegexOr(words[0]));
      }
    }
    // Filter by source file type (extension or mimetype: pdf, docx, txt, etc.)
    if (sourceFileType && typeof sourceFileType === 'string' && sourceFileType.trim()) {
      const ext = sourceFileType.trim().toLowerCase().replace(/^\./, '');
      if (ext) {
        const extRegex = new RegExp('\\.' + ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
        const mimeRegex = new RegExp(ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { source: extRegex },
            { 'attachments.0.filename': extRegex },
            { 'attachments.0.mimetype': mimeRegex },
            { 'provenance.source_file_id': extRegex }
          ]
        });
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 20));
    const options = {
      sort: { createdAt: -1 },
      limit: limitNum,
      skip: (pageNum - 1) * limitNum
    };

    const cards = await CardRepository.findByUser(uid, query, options);
    const total = await CardRepository.countByUser(uid, query);
    const totalPages = limitNum > 0 ? Math.ceil(total / limitNum) : 0;
    return {
      cards,
      pagination: {
        current: pageNum,
        total: totalPages,
        totalCount: total,
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      }
    };
  }

  /** Get total card count for user with optional filters (type, category, search). Same query as getCards. */
  async getCardsCount(userId, filters = {}) {
    let uid;
    try {
      uid = toObjectId(userId);
    } catch (e) {
      const err = new Error('Invalid user id');
      err.status = 400;
      throw err;
    }
    const { type, category, search, source, sourceFileType } = filters;
    const query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    const searchTerm = (search && typeof search === 'string' && search.trim()) ? search.trim() : null;
    const sourceTerm = (source && typeof source === 'string' && source.trim()) ? source.trim() : null;
    const term = searchTerm || sourceTerm;
    if (term) {
      const words = term.split(/\s+/).filter(w => w.length > 0);
      const fieldList = ['title', 'content', 'tags', 'source', 'attachments.originalName', 'attachments.filename', 'provenance.source_file_id', 'provenance.source_path'];
      const buildRegexOr = (word) => {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return { $or: fieldList.map(f => ({ [f]: { $regex: escaped, $options: 'i' } })) };
      };
      if (words.length > 1) {
        query.$or = words.map(w => buildRegexOr(w));
      } else {
        Object.assign(query, buildRegexOr(words[0]));
      }
    }
    if (sourceFileType && typeof sourceFileType === 'string' && sourceFileType.trim()) {
      const ext = sourceFileType.trim().toLowerCase().replace(/^\./, '');
      if (ext) {
        const extRegex = new RegExp('\\.' + ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
        const mimeRegex = new RegExp(ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { source: extRegex },
            { 'attachments.0.filename': extRegex },
            { 'attachments.0.mimetype': mimeRegex },
            { 'provenance.source_file_id': extRegex }
          ]
        });
      }
    }
    return await CardRepository.countByUser(uid, query);
  }

  /** Total number of cards in the database (all users). Queries the DB. */
  async getTotalCardsCount() {
    return await CardRepository.countAll();
  }

  async getCardByIdOrCardId(id, userId) {
    if (id.length === 6 && /^[A-Z0-9]+$/i.test(id)) {
      const card = await CardRepository.findByCardId(id.toUpperCase());
      if (!card) return null;
      if (card.user.toString() !== userId && !card.isPublic) return null;
      return card;
    }
    return await CardRepository.findOneByUser(id, userId);
  }

  async createCard(userId, data) {
    const cardData = {
      ...data,
      tags: data.tags || [],
      source: data.source || '',
      isPublic: data.isPublic || false,
      user: userId,
      generatedBy: data.generatedBy === 'ai' ? 'ai' : 'rule-based'
    };
    if (data.provenance && Object.keys(data.provenance).length > 0) {
      cardData.provenance = data.provenance;
    }
    return await CardRepository.create(cardData);
  }

  async updateCard(cardId, userId, data) {
    const card = await CardRepository.findOneByUser(cardId, userId);
    if (!card) return null;
    const { title, content, type, category, tags, source, isPublic, provenance } = data;
    if (title !== undefined) card.title = title;
    if (content !== undefined) card.content = content;
    if (type !== undefined) card.type = type;
    if (category !== undefined) card.category = category;
    if (tags !== undefined) card.tags = tags;
    if (source !== undefined) card.source = source;
    if (isPublic !== undefined) card.isPublic = isPublic;
    if (provenance) {
      card.provenance = { ...card.provenance, ...provenance };
    }
    await card.save();
    return card;
  }

  async deleteCard(cardId, userId) {
    return await CardRepository.deleteByUser(cardId, userId);
  }

  async updateReview(cardId, userId) {
    const card = await CardRepository.findOneByUser(cardId, userId);
    if (!card) return null;
    await card.updateReview();
    return card;
  }

  async updateRating(cardId, userId, rating) {
    const card = await CardRepository.findOneByUser(cardId, userId);
    if (!card) return null;
    if (!card.metadata) card.metadata = {};
    card.metadata.rating = rating;
    await card.save();
    return card;
  }

  /** Generate content hash for duplicate detection */
  generateContentHash(title, content) {
    const s = `${(title || '').toLowerCase().trim()}-${(content || '').toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(s).digest('hex');
  }

  /** Create or update card from processed upload item (called by upload-service) */
  async createOrUpdateFromProcessedItem(cardData, userId, file, fileHash, fileId) {
    const contentHash = this.generateContentHash(cardData.title, cardData.content);
    const existingCard = contentHash ? await Card.findDuplicate(contentHash, userId) : null;

    const provenance = {
      source_file_id: fileId || file.filename,
      source_path: file.path,
      file_hash: fileHash,
      location: cardData.provenance?.location || null,
      snippet: cardData.provenance?.snippet || null,
      model_name: cardData.provenance?.model_name || null,
      prompt_version: cardData.provenance?.prompt_version || '1.0',
      confidence_score: cardData.provenance?.confidence_score || null,
    };

    if (existingCard) {
      existingCard.attachments = existingCard.attachments || [];
      existingCard.attachments.push({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
      });
      if (!existingCard.source?.includes(file.originalname)) {
        existingCard.source = existingCard.source ? `${existingCard.source}, ${file.originalname}` : file.originalname;
      }
      if (!existingCard.provenance?.source_file_id) {
        existingCard.provenance = provenance;
      }
      await existingCard.save();
      return { card: existingCard, isDuplicate: true };
    }

    const card = new Card({
      title: cardData.title,
      content: cardData.content,
      contentHash,
      type: cardData.type || 'concept',
      category: cardData.category || 'General',
      tags: cardData.tags || [],
      source: file.originalname,
      user: userId,
      generatedBy: cardData.generatedBy || 'rule-based',
      attachments: [{
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
      }],
      provenance,
    });
    await card.save();
    return { card, isDuplicate: false };
  }
}

module.exports = new CardService();
