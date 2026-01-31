const path = require('path');
const BaseRepository = require(path.join(__dirname, '../../../shared/repository-pattern'));
const Card = require('../models/Card');

class CardRepository extends BaseRepository {
  constructor() {
    super(Card);
  }

  async findByUser(userId, query = {}, options = {}) {
    const q = { user: userId, ...query };
    return await this.find(q, { ...options, lean: true });
  }

  async countByUser(userId, query = {}) {
    return await this.count({ user: userId, ...query });
  }

  /** Total number of cards in the database (all users). */
  async countAll() {
    return await this.count({});
  }

  async findOneByUser(cardId, userId) {
    return await this.findOne({ _id: cardId, user: userId });
  }

  async findByCardId(cardId) {
    return await this.model.findByCardId(cardId);
  }

  async findByCategory(category, userId) {
    return await this.model.findByCategory(category, userId);
  }

  async findByType(type, userId) {
    return await this.model.findByType(type, userId);
  }

  async deleteByUser(cardId, userId) {
    return await this.model.findOneAndDelete({ _id: cardId, user: userId });
  }
}

module.exports = new CardRepository();
