/**
 * PostgreSQL Collection repository
 */

class PostgresCollectionRepository {
  constructor(Collection, Card) {
    this.Collection = Collection;
    this.Card = Card;
  }

  async findByUser(userId) {
    const collections = await this.Collection.findAll({
      where: { userId },
      order: [['created_at', 'DESC']],
      include: [{
        model: this.Card,
        as: 'Cards',
        through: { attributes: [] },
        attributes: ['id', 'title', 'type', 'category'],
        required: false,
      }],
    });
    return collections.map((c) => {
      const j = c.toJSON ? c.toJSON() : c.get();
      j._id = j.id;
      j.user = j.userId;
      j.cards = (j.Cards || []).map((card) => card.id || card._id);
      delete j.Cards;
      return j;
    });
  }

  async findById(id, userId) {
    const collection = await this.Collection.findOne({
      where: { id, userId },
      include: [{
        model: this.Card,
        as: 'Cards',
        through: { attributes: [] },
        required: false,
      }],
    });
    if (!collection) return null;
    const j = collection.toJSON ? collection.toJSON() : collection.get();
    j._id = j.id;
    j.user = j.userId;
    j.cards = (j.Cards || []).map((c) => (c.toJSON ? c.toJSON() : c));
    delete j.Cards;
    return j;
  }

  async create(data) {
    const collection = await this.Collection.create({
      name: (data.name || '').trim(),
      description: (data.description || '').trim() || '',
      isPublic: data.isPublic || false,
      userId: data.user || data.userId,
    });
    if (data.cards && data.cards.length) {
      await collection.setCards(data.cards);
    }
    collection.dataValues._id = collection.id;
    collection.dataValues.user = collection.userId;
    return collection;
  }

  async update(id, userId, data) {
    const collection = await this.Collection.findOne({ where: { id, userId } });
    if (!collection) return null;
    if (data.name !== undefined) collection.name = data.name.trim();
    if (data.description !== undefined) collection.description = data.description.trim();
    if (data.isPublic !== undefined) collection.isPublic = data.isPublic;
    if (data.cards && Array.isArray(data.cards)) {
      await collection.setCards(data.cards);
    }
    await collection.save();
    collection.dataValues._id = collection.id;
    return collection;
  }

  async delete(id, userId) {
    const collection = await this.Collection.findOne({ where: { id, userId } });
    if (!collection) return null;
    await collection.setCards([]);
    await collection.destroy();
    return collection;
  }

  async addCard(collectionId, userId, cardId) {
    const collection = await this.Collection.findOne({ where: { id: collectionId, userId } });
    if (!collection) return null;
    await collection.addCard(cardId);
    return this.findById(collectionId, userId);
  }

  async removeCard(collectionId, userId, cardId) {
    const collection = await this.Collection.findOne({ where: { id: collectionId, userId } });
    if (!collection) return null;
    await collection.removeCard(cardId);
    return this.findById(collectionId, userId);
  }
}

module.exports = PostgresCollectionRepository;
