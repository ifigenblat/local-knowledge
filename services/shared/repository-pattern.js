/**
 * Repository Pattern Base Class
 * Provides common repository methods that can be extended
 * 
 * Note: Database connection must be established before using repository methods.
 * Services should call connectDB() during startup.
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
    const { sort, limit, skip, populate, lean = false } = options;
    let queryBuilder = this.model.find(query);

    if (sort) {
      queryBuilder = queryBuilder.sort(sort);
    }
    const limitNum = typeof limit === 'number' && !isNaN(limit) && limit > 0 ? limit : 0;
    if (limitNum > 0) {
      queryBuilder = queryBuilder.limit(limitNum);
    }
    const skipNum = typeof skip === 'number' && !isNaN(skip) && skip >= 0 ? skip : 0;
    if (skipNum > 0) {
      queryBuilder = queryBuilder.skip(skipNum);
    }
    if (populate) {
      queryBuilder = queryBuilder.populate(populate);
    }
    if (lean) {
      queryBuilder = queryBuilder.lean();
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
