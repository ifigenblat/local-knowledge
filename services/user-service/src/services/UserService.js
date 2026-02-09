const bcrypt = require('bcryptjs');
const axios = require('axios');
const { getUserRepository } = require('../repositories/UserRepositoryFactory');

class UserService {
  constructor() {
    this.roleServiceUrl = process.env.ROLE_SERVICE_URL || 'http://localhost:5003';
  }

  async getAllUsers(query = {}, options = {}) {
    const UserRepository = await getUserRepository();
    const users = await UserRepository.findAllWithRole(query, options);
    const total = await UserRepository.count(query);
    return { users, total };
  }

  async getUserById(id) {
    const UserRepository = await getUserRepository();
    const user = await UserRepository.findByIdWithRole(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async createUser(userData) {
    const UserRepository = await getUserRepository();
    const { name, email, password, roleId } = userData;

    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    // Validate role if provided
    if (roleId) {
      try {
        await axios.get(`${this.roleServiceUrl}/api/roles/${roleId}`);
      } catch (error) {
        throw new Error('Invalid role ID');
      }
    }

    // Hash password if provided
    let hashedPassword = password;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const user = await UserRepository.createUser({
      name,
      email,
      password: hashedPassword,
      role: roleId || null
    });

    return await UserRepository.findByIdWithRole(user.id || user._id);
  }

  async updateUser(id, userData) {
    const UserRepository = await getUserRepository();
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate role if provided
    if (userData.roleId) {
      try {
        await axios.get(`${this.roleServiceUrl}/api/roles/${userData.roleId}`);
      } catch (error) {
        throw new Error('Invalid role ID');
      }
    }

    const updateData = {};
    if (userData.name) updateData.name = userData.name;
    if (userData.email) {
      // Check if email is already taken
      const existing = await UserRepository.findByEmail(userData.email);
      if (existing && String(existing.id || existing._id) !== id) {
        throw new Error('Email already in use');
      }
      updateData.email = userData.email.toLowerCase().trim();
    }
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(userData.password, salt);
    }
    if (userData.roleId !== undefined) {
      updateData.role = userData.roleId || null;
    }
    if (userData.mustChangePassword !== undefined) {
      updateData.mustChangePassword = userData.mustChangePassword;
    }

    return await UserRepository.updateUser(id, updateData);
  }

  async deleteUser(id) {
    const UserRepository = await getUserRepository();
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    return await UserRepository.delete(id);
  }

  async assignRoleToUser(userId, roleId, currentUserRole) {
    const UserRepository = await getUserRepository();

    if (!roleId) {
      throw new Error('Role ID is required');
    }

    // Validate role exists and is active via role-service
    try {
      const roleRes = await axios.get(`${this.roleServiceUrl}/api/roles/${roleId}`);
      const role = roleRes.data;
      if (!role) {
        throw new Error('Role not found');
      }
      if (role.isActive === false) {
        throw new Error('Cannot assign inactive role');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Role not found');
      }
      if (error.message === 'Role not found' || error.message === 'Cannot assign inactive role') {
        throw error;
      }
      throw new Error('Invalid role ID');
    }

    const user = await UserRepository.findByIdWithRole(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Prevent non-superadmin from modifying superadmin user's role
    const targetUserRole = user.Role || user.role;
    if (targetUserRole && targetUserRole.name === 'superadmin') {
      const currentRole = (currentUserRole || '').toLowerCase();
      if (currentRole !== 'superadmin') {
        throw new Error('Cannot modify superadmin user role');
      }
    }

    return await UserRepository.updateUser(userId, { roleId });
  }
}

module.exports = new UserService();
