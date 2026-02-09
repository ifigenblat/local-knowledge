/**
 * PostgreSQL Role repository - Sequelize implementation
 */

class PostgresRoleRepository {
  constructor(Role) {
    this.Role = Role;
  }

  async find(query = {}) {
    const where = {};
    if (query.isActive !== undefined) where.isActive = query.isActive;
    return this.Role.findAll({ where, order: [['name', 'ASC']] });
  }

  async findById(id) {
    return this.Role.findByPk(id);
  }

  async findOne(query) {
    const where = {};
    if (query.name) where.name = query.name.toLowerCase();
    return this.Role.findOne({ where });
  }

  async findByName(name) {
    return this.findOne({ name: name.toLowerCase() });
  }

  async count(query = {}) {
    const where = {};
    if (query.isActive !== undefined) where.isActive = query.isActive;
    return this.Role.count({ where });
  }

  async create(data) {
    const payload = {
      name: (data.name || '').toLowerCase().trim(),
      displayName: (data.displayName || data.name || '').trim(),
      description: (data.description || '').trim() || null,
      permissions: data.permissions || {},
      isSystem: data.isSystem || false,
      isImmutable: data.isImmutable || false,
      isActive: data.isActive !== false,
      createdById: data.createdBy || null,
    };
    return this.Role.create(payload);
  }

  async update(id, data) {
    const role = await this.Role.findByPk(id);
    if (!role) return null;
    const updatable = ['displayName', 'description', 'permissions', 'isActive'];
    for (const key of updatable) {
      if (data[key] !== undefined) role[key] = data[key];
    }
    await role.save();
    return role;
  }

  async delete(id) {
    const role = await this.Role.findByPk(id);
    if (!role) return null;
    await role.destroy();
    return role;
  }
}

module.exports = PostgresRoleRepository;
