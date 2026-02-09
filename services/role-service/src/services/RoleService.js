const { getRoleRepository } = require('../repositories/RoleRepositoryFactory');

class RoleService {
  async getAllRoles() {
    const repo = await getRoleRepository();
    return repo.find();
  }

  async getRoleById(id) {
    const repo = await getRoleRepository();
    const role = await repo.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }
    return role;
  }

  async getRoleByName(name) {
    const repo = await getRoleRepository();
    return repo.findByName(name);
  }

  async createRole(roleData) {
    const repo = await getRoleRepository();
    const existing = await repo.findByName(roleData.name);
    if (existing) {
      throw new Error('Role with this name already exists');
    }
    return repo.create(roleData);
  }

  async updateRole(id, roleData) {
    const repo = await getRoleRepository();
    const role = await repo.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }
    if (role.isImmutable) {
      throw new Error('Cannot modify an immutable role');
    }
    return repo.update(id, roleData);
  }

  async deleteRole(id) {
    const repo = await getRoleRepository();
    const role = await repo.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }
    if (role.isImmutable) {
      throw new Error('Cannot delete an immutable role');
    }
    if (role.isSystem) {
      throw new Error('Cannot delete system role');
    }
    return repo.delete(id);
  }
}

module.exports = new RoleService();
