const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// Get all users (admin only)
router.get('/', auth, authorize('users.view'), async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by role
    if (role) {
      const roleDoc = await Role.findOne({ name: role });
      if (roleDoc) {
        query.role = roleDoc._id;
      }
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };
    
    const users = await User.find(query)
      .select('-password')
      .populate('role', 'name displayName')
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit);
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        current: options.page,
        total: Math.ceil(total / options.limit),
        hasNext: options.page * options.limit < total,
        hasPrev: options.page > 1,
        totalUsers: total
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single user (admin only)
router.get('/:id', auth, authorize('users.view'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('role');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new user (admin only)
router.post('/', auth, authorize('users.create'), async (req, res) => {
  try {
    const { name, email, password, roleId } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Get default role if not specified
    let defaultRole = null;
    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(400).json({ error: 'Invalid role ID' });
      }
      if (!role.isActive) {
        return res.status(400).json({ error: 'Cannot assign inactive role' });
      }
      defaultRole = roleId;
    } else {
      const userRole = await Role.findOne({ name: 'user' });
      if (userRole) {
        defaultRole = userRole._id;
      }
    }
    
    const user = new User({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: defaultRole
    });
    
    await user.save();
    await user.populate('role', 'name displayName');
    
    res.status(201).json({
      ...user.toObject(),
      password: undefined // Don't send password
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a user (admin only)
router.put('/:id', auth, authorize('users.edit'), async (req, res) => {
  try {
    const { name, email, password, roleId, mustChangePassword } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent editing superadmin user (except by superadmin)
    const currentUser = await User.findById(req.user.id).populate('role');
    if (user.role) {
      const userRole = await Role.findById(user.role);
      if (userRole && userRole.name === 'superadmin' && currentUser.role.name !== 'superadmin') {
        return res.status(403).json({ error: 'Cannot edit superadmin user' });
      }
    }
    
    // Update fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email: email.toLowerCase().trim(), 
        _id: { $ne: user._id } 
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email.toLowerCase().trim();
    }
    if (password !== undefined && password !== '') {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    if (roleId !== undefined) {
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(400).json({ error: 'Invalid role ID' });
      }
      if (!role.isActive) {
        return res.status(400).json({ error: 'Cannot assign inactive role' });
      }
      user.role = roleId;
    }
    if (mustChangePassword !== undefined) {
      user.mustChangePassword = mustChangePassword;
    }
    
    await user.save();
    await user.populate('role', 'name displayName');
    
    res.json({
      ...user.toObject(),
      password: undefined
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a user (admin only)
router.delete('/:id', auth, authorize('users.delete'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deleting superadmin user
    if (user.role) {
      const userRole = await Role.findById(user.role);
      if (userRole && userRole.name === 'superadmin') {
        return res.status(403).json({ error: 'Cannot delete superadmin user' });
      }
    }
    
    // Prevent deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign role to user (admin only)
router.post('/:id/assign-role', auth, authorize('users.assignRoles'), async (req, res) => {
  try {
    const { roleId } = req.body;
    
    if (!roleId) {
      return res.status(400).json({ error: 'Role ID is required' });
    }
    
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    if (!role.isActive) {
      return res.status(400).json({ error: 'Cannot assign inactive role' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent assigning role to superadmin user (except by superadmin)
    if (user.role) {
      const currentUserRole = await Role.findById(user.role);
      if (currentUserRole && currentUserRole.name === 'superadmin') {
        const currentUser = await User.findById(req.user.id).populate('role');
        if (currentUser.role.name !== 'superadmin') {
          return res.status(403).json({ error: 'Cannot modify superadmin user role' });
        }
      }
    }
    
    user.role = roleId;
    await user.save();
    
    await user.populate('role', 'name displayName');
    res.json({
      ...user.toObject(),
      password: undefined
    });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
