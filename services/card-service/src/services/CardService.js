const { getCardRepository } = require('../repositories/CardRepositoryFactory');
const crypto = require('crypto');

class CardService {
  async getCards(userId, filters = {}, pagination = {}) {
    if (!userId) {
      const err = new Error('Invalid user id');
      err.status = 400;
      throw err;
    }
    const CardRepository = await getCardRepository();
    const { type, category, search, source, sourceFileType, dateFrom, dateTo, sortBy, sortOrder, page = 1, limit = 20 } = filters;
    const filterParams = { type, category, search, source, sourceFileType, dateFrom, dateTo };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 20));
    const options = {
      sortBy: sortBy || 'createdAt',
      sortOrder: (sortOrder && String(sortOrder).toLowerCase() === 'asc') ? 'asc' : 'desc',
      limit: limitNum,
      skip: (pageNum - 1) * limitNum
    };

    const cards = await CardRepository.findByUser(userId, filterParams, options);
    const total = await CardRepository.countByUser(userId, filterParams);
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
    if (!userId) {
      const err = new Error('Invalid user id');
      err.status = 400;
      throw err;
    }
    const CardRepository = await getCardRepository();
    const { type, category, search, source, sourceFileType, dateFrom, dateTo } = filters;
    const filterParams = { type, category, search, source, sourceFileType, dateFrom, dateTo };
    return await CardRepository.countByUser(userId, filterParams);
  }

  /** Total number of cards in the database (all users). Queries the DB. */
  async getTotalCardsCount() {
    const CardRepository = await getCardRepository();
    return await CardRepository.countAll();
  }

  async getCardByIdOrCardId(id, userId) {
    const CardRepository = await getCardRepository();
    if (id.length === 6 && /^[A-Z0-9]+$/i.test(id)) {
      const card = await CardRepository.findByCardId(id.toUpperCase());
      if (!card) return null;
      const ownerId = (card.userId || card.user || '').toString();
      if (ownerId !== userId && !card.isPublic) return null;
      return card;
    }
    return await CardRepository.findOneByUser(id, userId);
  }

  async createCard(userId, data) {
    const CardRepository = await getCardRepository();
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
    return await CardRepository.create({
      ...cardData,
      user: userId,
      userId,
    });
  }

  async updateCard(cardId, userId, data) {
    const CardRepository = await getCardRepository();
    const card = await CardRepository.findOneByUser(cardId, userId);
    if (!card) return null;
    const { title, content, type, category, tags, source, isPublic, provenance, generatedBy } = data;
    if (title !== undefined) card.title = title;
    if (content !== undefined) card.content = content;
    if (type !== undefined) card.type = type;
    if (category !== undefined) card.category = category;
    if (tags !== undefined) card.tags = tags;
    if (source !== undefined) card.source = source;
    if (isPublic !== undefined) card.isPublic = isPublic;
    if (generatedBy !== undefined) card.generatedBy = generatedBy;
    if (provenance) {
      card.provenance = { ...card.provenance, ...provenance };
    }
    await card.save();
    const c = card.toJSON ? card.toJSON() : card;
    if (c) c._id = c.id || card.id;
    return card;
  }

  async deleteCard(cardId, userId) {
    const CardRepository = await getCardRepository();
    return await CardRepository.deleteByUser(cardId, userId);
  }

  async updateReview(cardId, userId) {
    const CardRepository = await getCardRepository();
    const card = await CardRepository.findOneByUser(cardId, userId);
    if (!card) return null;
    card.metadata = card.metadata || {};
    card.metadata.lastReviewed = new Date();
    card.metadata.reviewCount = (card.metadata.reviewCount || 0) + 1;
    await card.save();
    return card;
  }

  async updateRating(cardId, userId, rating) {
    const CardRepository = await getCardRepository();
    const card = await CardRepository.findOneByUser(cardId, userId);
    if (!card) return null;
    card.metadata = card.metadata || {};
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
    const CardRepository = await getCardRepository();
    const contentHash = this.generateContentHash(cardData.title, cardData.content);
    const existingCard = contentHash ? await CardRepository.findDuplicate(contentHash, userId) : null;

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

    const newAttachment = {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    };

    if (existingCard) {
      let source = existingCard.source || '';
      if (!source.includes(file.originalname)) {
        source = source ? `${source}, ${file.originalname}` : file.originalname;
      }
      const prov = !existingCard.provenance?.source_file_id ? provenance : undefined;
      const card = await CardRepository.updateCard(existingCard, {
        attachments: [newAttachment],
        source,
        provenance: prov,
      });
      return { card, isDuplicate: true };
    }

    const card = await CardRepository.create({
      title: cardData.title,
      content: cardData.content,
      contentHash,
      type: cardData.type || 'concept',
      category: cardData.category || 'General',
      tags: cardData.tags || [],
      source: file.originalname,
      user: userId,
      userId,
      generatedBy: cardData.generatedBy || 'rule-based',
      attachments: [newAttachment],
      provenance,
    });
    return { card, isDuplicate: false };
  }
}

module.exports = new CardService();
