/**
 * PostgreSQL Card repository
 */

const { Op } = require('sequelize');

class PostgresCardRepository {
  constructor(Card, sequelize) {
    this.Card = Card;
    this.sequelize = sequelize;
  }

  _buildSearchWhere(term, sequelize) {
    const words = (term || '').split(/\s+/).filter(w => w.length > 0);
    const escaped = (w) => w.replace(/[%_\\]/g, '\\$&');
    const fieldList = ['title', 'content', 'source'];
    const buildOrForWord = (word) => {
      const pattern = `%${escaped(word)}%`;
      const conditions = fieldList.map((f) => ({ [f]: { [Op.iLike]: pattern } }));
      conditions.push(sequelize.where(sequelize.cast(sequelize.col('tags'), 'varchar'), { [Op.iLike]: pattern }));
      conditions.push(sequelize.where(sequelize.cast(sequelize.col('attachments'), 'varchar'), { [Op.iLike]: pattern }));
      conditions.push(sequelize.where(sequelize.cast(sequelize.col('provenance'), 'varchar'), { [Op.iLike]: pattern }));
      return { [Op.or]: conditions };
    };
    if (words.length > 1) {
      return { [Op.or]: words.map((w) => buildOrForWord(w)) };
    }
    return words.length ? buildOrForWord(words[0]) : {};
  }

  _buildSourceFileTypeWhere(ext) {
    const pattern = `%.${ext}`;
    return {
      [Op.or]: [
        { source: { [Op.iLike]: pattern } },
        this.sequelize.where(this.sequelize.cast(this.sequelize.col('attachments'), 'varchar'), { [Op.iLike]: pattern }),
        this.sequelize.where(this.sequelize.cast(this.sequelize.col('provenance'), 'varchar'), { [Op.iLike]: pattern }),
      ],
    };
  }

  async findByUser(userId, filtersOrQuery = {}, options = {}) {
    const where = { userId };
    const f = filtersOrQuery || {};
    if (f.type) where.type = f.type;
    if (f.category) where.category = f.category;
    const searchTerm = (f.search || f.source || '').trim();
    if (searchTerm) {
      Object.assign(where, this._buildSearchWhere(searchTerm, this.sequelize));
    }
    if (f.sourceFileType) {
      const ext = String(f.sourceFileType).toLowerCase().replace(/^\./, '');
      if (ext) Object.assign(where, this._buildSourceFileTypeWhere(ext));
    }
    if (f.dateFrom || f.dateTo) {
      const dateCond = {};
      if (f.dateFrom) dateCond[Op.gte] = new Date(f.dateFrom + 'T00:00:00.000Z');
      if (f.dateTo) dateCond[Op.lte] = new Date(f.dateTo + 'T23:59:59.999Z');
      where.created_at = dateCond;
    }

    const { limit = 0, skip = 0, sort, sortBy, sortOrder } = options;
    const sortColumnMap = { title: 'title', type: 'type', category: 'category', source: 'source', generatedBy: 'generated_by', createdAt: 'created_at' };
    let order = [['created_at', 'DESC']];
    if (sortBy && sortColumnMap[sortBy]) {
      const col = sortColumnMap[sortBy];
      const dir = (sortOrder && String(sortOrder).toLowerCase() === 'asc') ? 'ASC' : 'DESC';
      order = [[col, dir]];
    } else if (sort && typeof sort === 'object') {
      const entries = Object.entries(sort);
      if (entries.length) {
        order = entries.map(([col, dir]) => [
          col === 'createdAt' ? 'created_at' : (sortColumnMap[col] || col),
          dir === -1 ? 'DESC' : 'ASC'
        ]);
      }
    } else if (Array.isArray(sort)) {
      order = sort.map(([col, dir]) => [
        (col === 'createdAt' || col === 'created_at') ? 'created_at' : (sortColumnMap[col] || col),
        dir || 'DESC'
      ]);
    }
    const opts = { where, order, raw: true };
    if (limit > 0) opts.limit = limit;
    if (skip > 0) opts.offset = skip;

    const rows = await this.Card.findAll(opts);
    return rows.map((r) => ({ ...r, _id: r.id, user: r.userId }));
  }

  async countByUser(userId, filtersOrQuery = {}) {
    const where = { userId };
    const f = filtersOrQuery || {};
    if (f.type) where.type = f.type;
    if (f.category) where.category = f.category;
    const searchTerm = (f.search || f.source || '').trim();
    if (searchTerm) Object.assign(where, this._buildSearchWhere(searchTerm, this.sequelize));
    if (f.sourceFileType) {
      const ext = String(f.sourceFileType).toLowerCase().replace(/^\./, '');
      if (ext) Object.assign(where, this._buildSourceFileTypeWhere(ext));
    }
    if (f.dateFrom || f.dateTo) {
      const dateCond = {};
      if (f.dateFrom) dateCond[Op.gte] = new Date(f.dateFrom + 'T00:00:00.000Z');
      if (f.dateTo) dateCond[Op.lte] = new Date(f.dateTo + 'T23:59:59.999Z');
      where.created_at = dateCond;
    }
    return this.Card.count({ where });
  }

  async countAll() {
    return this.Card.count();
  }

  async findOneByUser(cardId, userId) {
    const card = await this.Card.findOne({ where: { id: cardId, userId } });
    if (card) {
      card.dataValues._id = card.id;
      card.dataValues.user = card.userId;
    }
    return card;
  }

  async findByCardId(cardId) {
    return this.Card.findOne({ where: { cardId: (cardId || '').toUpperCase() } });
  }

  async findByCategory(category, userId) {
    const rows = await this.Card.findAll({
      where: { category, userId },
      order: [['created_at', 'DESC']],
      raw: true,
    });
    return rows.map((r) => ({ ...r, _id: r.id, user: r.userId }));
  }

  async findByType(type, userId) {
    const rows = await this.Card.findAll({
      where: { type, userId },
      order: [['created_at', 'DESC']],
      raw: true,
    });
    return rows.map((r) => ({ ...r, _id: r.id, user: r.userId }));
  }

  async create(data) {
    let cardId = data.cardId;
    if (!cardId) cardId = await this.generateCardId();
    const card = await this.Card.create({
      cardId,
      title: data.title,
      content: data.content,
      contentHash: data.contentHash,
      type: data.type || 'concept',
      category: data.category,
      tags: data.tags || [],
      source: data.source || '',
      userId: data.user || data.userId,
      metadata: data.metadata || {},
      isPublic: data.isPublic || false,
      generatedBy: data.generatedBy || 'rule-based',
      attachments: data.attachments || [],
      provenance: data.provenance || {},
    });
    card.dataValues._id = card.id;
    card.dataValues.user = card.userId;
    return card;
  }

  async deleteByUser(cardId, userId) {
    const card = await this.Card.findOne({ where: { id: cardId, userId } });
    if (!card) return null;
    await card.destroy();
    return card;
  }

  async findDuplicate(contentHash, userId) {
    return this.Card.findOne({ where: { contentHash, userId } });
  }

  async updateCard(card, updates) {
    const cardId = card?.id || card?._id;
    if (!cardId) return null;
    const c = await this.Card.findByPk(cardId);
    if (!c) return null;
    const { attachments, source, provenance, metadata } = updates;
    if (attachments && Array.isArray(attachments)) {
      c.attachments = [...(c.attachments || []), ...attachments];
    }
    if (source !== undefined) c.source = source;
    if (provenance) c.provenance = { ...(c.provenance || {}), ...provenance };
    if (metadata) c.metadata = { ...(c.metadata || {}), ...metadata };
    await c.save();
    c.dataValues._id = c.id;
    c.dataValues.user = c.userId;
    return c;
  }

  async generateCardId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempts = 0; attempts < 10; attempts++) {
      let cardId = '';
      for (let i = 0; i < 6; i++) {
        cardId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.Card.findOne({ where: { cardId } });
      if (!existing) return cardId;
    }
    return Date.now().toString(36).toUpperCase().slice(-4) + Math.random().toString(36).toUpperCase().slice(-2);
  }
}

module.exports = PostgresCardRepository;
