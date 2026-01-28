const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { isAdmin, authorize } = require('../middleware/authorize');

// Get all roles (admin only)
router.get('/', auth, authorize('roles.view'), async (req, res) => {
  try {
    const roles = await Role.find({ isActive: true }).sort({ name: 1 });
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single role (admin only)
router.get('/:id', auth, authorize('roles.view'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new role (admin only)
router.post('/', auth, authorize('roles.create'), async (req, res) => {
  try {
    const { name, displayName, description, permissions } = req.body;

    if (!name || !displayName) {
      return res.status(400).json({ error: 'Name and display name are required' });
    }

    // Check if role already exists
    const existingRole = await Role.findOne({ name: name.toLowerCase() });
    if (existingRole) {
      return res.status(400).json({ error: 'Role with this name already exists' });
    }

    const role = new Role({
      name: name.toLowerCase(),
      displayName,
      description: description || '',
      permissions: permissions || {},
      createdBy: req.user.id
    });

    await role.save();
    res.status(201).json(role);
  } catch (error) {
    console.error('Create role error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a role (admin only)
router.put('/:id', auth, authorize('roles.edit'), async (req, res) => {
  try {
    const { displayName, description, permissions, isActive } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent editing superadmin role (immutable)
    if (role.name === 'superadmin') {
      return res.status(403).json({ error: 'Superadmin role cannot be modified' });
    }

    // Prevent editing system roles' name
    if (role.isSystem && req.body.name && req.body.name.toLowerCase() !== role.name) {
      return res.status(400).json({ error: 'Cannot change name of system role' });
    }

    // Prevent deleting system roles
    if (role.isSystem && isActive === false) {
      return res.status(400).json({ error: 'Cannot deactivate system role' });
    }

    // Update fields
    if (displayName !== undefined) role.displayName = displayName;
    if (description !== undefined) role.description = description;
    if (permissions !== undefined) role.permissions = permissions;
    if (isActive !== undefined && !role.isSystem) role.isActive = isActive;

    await role.save();
    res.json(role);
  } catch (error) {
    console.error('Update role error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a role (admin only)
router.delete('/:id', auth, authorize('roles.delete'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent deleting superadmin role (immutable)
    if (role.name === 'superadmin') {
      return res.status(403).json({ error: 'Superadmin role cannot be deleted' });
    }

    // Prevent deleting system roles
    if (role.isSystem) {
      return res.status(400).json({ error: 'Cannot delete system role' });
    }

    // Check if any users have this role
    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      return res.status(400).json({ 
        error: `Cannot delete role: ${usersWithRole} user(s) have this role assigned` 
      });
    }

    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign role to user (admin only)
router.post('/:roleId/assign', auth, authorize('users.assignRoles'), async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const role = await Role.findById(req.params.roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (!role.isActive) {
      return res.status(400).json({ error: 'Cannot assign inactive role' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.role = role._id;
    await user.save();

    await user.populate('role');
    res.json({ message: 'Role assigned successfully', user });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get users with a specific role (admin only)
router.get('/:id/users', auth, authorize('users.view'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const users = await User.find({ role: role._id })
      .select('-password')
      .populate('role')
      .sort({ name: 1 });

    res.json(users);
  } catch (error) {
    console.error('Get role users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
