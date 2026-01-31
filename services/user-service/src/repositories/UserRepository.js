const path = require('path');
const BaseRepository = require(path.join(__dirname, '../../../shared/repository-pattern'));
const User = require('../models/User');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    return await this.findOne({ email: email.toLowerCase().trim() });
  }

  async findByIdWithRole(id) {
    return await this.model.findById(id).populate('role').select('-password');
  }

  async findAllWithRole(query = {}, options = {}) {
    const { sort, limit, skip } = options;
    let queryBuilder = this.model.find(query).populate('role').select('-password');

    if (sort) {
      queryBuilder = queryBuilder.sort(sort);
    }
    if (limit) {
      queryBuilder = queryBuilder.limit(limit);
    }
    if (skip) {
      queryBuilder = queryBuilder.skip(skip);
    }

    return await queryBuilder.exec();
  }

  async createUser(userData) {
    const user = new this.model(userData);
    return await user.save();
  }

  async updateUser(id, userData) {
    return await this.model.findByIdAndUpdate(id, userData, { new: true }).populate('role').select('-password');
  }
}

module.exports = new UserRepository();
