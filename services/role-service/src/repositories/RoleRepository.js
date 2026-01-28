const BaseRepository = require('../../../shared/repository-pattern');
const Role = require('../models/Role');

class RoleRepository extends BaseRepository {
  constructor() {
    super(Role);
  }

  async findByName(name) {
    return await this.findOne({ name: name.toLowerCase() });
  }

  async findActive() {
    return await this.find({ isActive: true });
  }

  async findByIdWithUsers(id) {
    // This would need User model or call User Service
    return await this.model.findById(id);
  }
}

module.exports = new RoleRepository();
