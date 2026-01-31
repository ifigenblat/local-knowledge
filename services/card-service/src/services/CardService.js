const CardRepository = require('../repositories/CardRepository');
const mongoose = require('mongoose');

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
    // Use regex instead of $text so we don't require a text index on the collection
    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: term, $options: 'i' } },
        { content: { $regex: term, $options: 'i' } },
        { tags: { $regex: term, $options: 'i' } }
      ];
    }
    // Filter by source (partial match on card.source)
    if (source && typeof source === 'string' && source.trim()) {
      const escaped = source.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.source = { $regex: escaped, $options: 'i' };
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
    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: term, $options: 'i' } },
        { content: { $regex: term, $options: 'i' } },
        { tags: { $regex: term, $options: 'i' } }
      ];
    }
    if (source && typeof source === 'string' && source.trim()) {
      const escaped = source.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.source = { $regex: escaped, $options: 'i' };
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
}

module.exports = new CardService();
