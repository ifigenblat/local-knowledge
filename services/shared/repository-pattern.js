/**
 * Repository Pattern Base Class
 * Provides common repository methods that can be extended
 */

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findById(id) {
    return await this.model.findById(id);
  }

  async findOne(query) {
    return await this.model.findOne(query);
  }

  async find(query = {}, options = {}) {
    const { sort, limit, skip, populate } = options;
    let queryBuilder = this.model.find(query);

    if (sort) {
      queryBuilder = queryBuilder.sort(sort);
    }
    if (limit) {
      queryBuilder = queryBuilder.limit(limit);
    }
    if (skip) {
      queryBuilder = queryBuilder.skip(skip);
    }
    if (populate) {
      queryBuilder = queryBuilder.populate(populate);
    }

    return await queryBuilder.exec();
  }

  async count(query = {}) {
    return await this.model.countDocuments(query);
  }

  async create(data) {
    const instance = new this.model(data);
    return await instance.save();
  }

  async update(id, data) {
    return await this.model.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await this.model.findByIdAndDelete(id);
  }

  async deleteMany(query) {
    return await this.model.deleteMany(query);
  }
}

module.exports = BaseRepository;
