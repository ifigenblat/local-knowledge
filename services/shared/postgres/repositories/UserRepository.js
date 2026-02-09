const { Op } = require('sequelize');

class PostgresUserRepository {
  constructor(User, Role) {
    this.User = User;
    this.Role = Role;
  }

  async findByEmail(email) {
    return this.User.findOne({
      where: { email: (email || '').toLowerCase().trim() },
      include: [{ model: this.Role, as: 'Role', required: false }],
    });
  }

  async findById(id) {
    return this.User.findByPk(id, {
      include: [{ model: this.Role, as: 'Role', required: false }],
      attributes: { exclude: ['password'] },
    });
  }

  async findByIdWithRole(id) {
    const user = await this.User.findByPk(id, {
      include: [{ model: this.Role, as: 'Role', required: false }],
    });
    if (user) user.dataValues._id = user.id;
    return user;
  }

  async findByEmailWithRole(email) {
    const user = await this.User.findOne({
      where: { email: (email || '').toLowerCase().trim() },
      include: [{ model: this.Role, as: 'Role', required: false }],
    });
    if (user) user.dataValues._id = user.id;
    return user;
  }

  async findAllWithRole(query = {}, options = {}) {
    const { limit, skip, sort } = options;
    let order = [['created_at', 'DESC']];
    if (sort && typeof sort === 'object') {
      const entries = Array.isArray(sort) ? sort : Object.entries(sort);
      if (entries.length) {
        order = entries.map(([col, dir]) => [
          col === 'createdAt' ? 'created_at' : (typeof col === 'string' ? col : 'created_at'),
          dir === -1 || dir === 'DESC' ? 'DESC' : 'ASC'
        ]);
      }
    } else if (sort && typeof sort === 'string') {
      order = [[sort === 'createdAt' ? 'created_at' : sort, 'DESC']];
    }
    const where = this._buildWhere(query);
    const opts = {
      where,
      include: [{ model: this.Role, as: 'Role', required: false }],
      attributes: { exclude: ['password'] },
      order,
    };
    if (limit) opts.limit = limit;
    if (skip) opts.offset = skip;
    const users = await this.User.findAll(opts);
    return users.map((u) => {
      const j = u.toJSON();
      j._id = j.id;
      return j;
    });
  }

  async count(query = {}) {
    const where = this._buildWhere(query);
    return this.User.count({ where });
  }

  _buildWhere(query = {}) {
    const where = {};
    if (!query || typeof query !== 'object') return where;
    const q = { ...query };
    delete q.$or;
    delete q.role;
    if (query.$or && Array.isArray(query.$or) && query.$or.length) {
      const orClauses = query.$or
        .filter((c) => c && typeof c === 'object')
        .map((c) => {
          const clause = {};
          if (c.name && typeof c.name === 'object' && c.name.$regex != null) {
            const val = typeof c.name.$regex === 'string' ? c.name.$regex : (c.name.$regex && c.name.$regex.source) || '';
            clause.name = { [Op.iLike]: `%${String(val).replace(/[%_\\]/g, '\\$&')}%` };
          }
          if (c.email && typeof c.email === 'object' && c.email.$regex != null) {
            const val = typeof c.email.$regex === 'string' ? c.email.$regex : (c.email.$regex && c.email.$regex.source) || '';
            clause.email = { [Op.iLike]: `%${String(val).replace(/[%_\\]/g, '\\$&')}%` };
          }
          return clause;
        })
        .filter((c) => Object.keys(c).length);
      if (orClauses.length) where[Op.or] = orClauses;
    }
    if (query.role) where.roleId = query.role;
    Object.keys(q).forEach((k) => {
      if (q[k] !== undefined && k !== '$or' && k !== 'role' && !k.startsWith('$')) {
        where[k] = q[k];
      }
    });
    return Object.keys(where).length ? where : undefined;
  }

  async createUser(userData) {
    const user = await this.User.create({
      name: (userData.name || '').trim(),
      email: (userData.email || '').toLowerCase().trim(),
      password: userData.password,
      roleId: userData.roleId || userData.role || null,
      mustChangePassword: userData.mustChangePassword || false,
      preferences: userData.preferences || {},
    });
    user.dataValues._id = user.id;
    return user;
  }

  async updateUser(id, userData) {
    const user = await this.User.findByPk(id);
    if (!user) return null;
    const updatable = ['name', 'email', 'password', 'roleId', 'mustChangePassword', 'preferences'];
    for (const key of updatable) {
      if (userData[key] !== undefined) user[key] = userData[key];
      if (userData.role !== undefined) user.roleId = userData.role;
    }
    await user.save();
    const updated = await this.User.findByPk(id, {
      include: [{ model: this.Role, as: 'Role', required: false }],
      attributes: { exclude: ['password'] },
    });
    if (updated) updated.dataValues._id = updated.id;
    return updated;
  }

  async updatePasswordResetToken(id, token, expires) {
    const user = await this.User.findByPk(id);
    if (!user) return null;
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(expires);
    await user.save();
    return user;
  }

  async clearPasswordResetToken(id) {
    return this.updatePasswordResetToken(id, null, null);
  }

  async updatePassword(id, hashedPassword) {
    const user = await this.User.findByPk(id);
    if (!user) return null;
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.mustChangePassword = false;
    await user.save();
    return user;
  }

  async delete(id) {
    const user = await this.User.findByPk(id);
    if (!user) return null;
    await user.destroy();
    return user;
  }

  async findByResetToken(tokenHash) {
    const user = await this.User.findOne({
      where: {
        resetPasswordToken: tokenHash,
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });
    if (user) user.dataValues._id = user.id;
    return user;
  }
}

module.exports = PostgresUserRepository;
