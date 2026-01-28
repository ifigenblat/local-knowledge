const RoleRepository = require('../repositories/RoleRepository');

class RoleService {
  async getAllRoles() {
    return await RoleRepository.find();
  }

  async getRoleById(id) {
    const role = await RoleRepository.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }
    return role;
  }

  async getRoleByName(name) {
    return await RoleRepository.findByName(name);
  }

  async createRole(roleData) {
    // Check if role already exists
    const existing = await RoleRepository.findByName(roleData.name);
    if (existing) {
      throw new Error('Role with this name already exists');
    }

    return await RoleRepository.create(roleData);
  }

  async updateRole(id, roleData) {
    const role = await RoleRepository.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isImmutable) {
      throw new Error('Cannot modify an immutable role');
    }

    return await RoleRepository.update(id, roleData);
  }

  async deleteRole(id) {
    const role = await RoleRepository.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isImmutable) {
      throw new Error('Cannot delete an immutable role');
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system role');
    }

    return await RoleRepository.delete(id);
  }
}

module.exports = new RoleService();
