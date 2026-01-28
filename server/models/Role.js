const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  permissions: {
    // Card permissions
    cards: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      edit: { type: Boolean, default: true },
      delete: { type: Boolean, default: true },
      viewAll: { type: Boolean, default: false }, // View all users' cards
      editAll: { type: Boolean, default: false }, // Edit all users' cards
      deleteAll: { type: Boolean, default: false } // Delete all users' cards
    },
    // Collection permissions
    collections: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      edit: { type: Boolean, default: true },
      delete: { type: Boolean, default: true },
      viewAll: { type: Boolean, default: false },
      editAll: { type: Boolean, default: false },
      deleteAll: { type: Boolean, default: false }
    },
    // User management permissions
    users: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      assignRoles: { type: Boolean, default: false }
    },
    // Role management permissions
    roles: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    // System permissions
    system: {
      viewSettings: { type: Boolean, default: false },
      editSettings: { type: Boolean, default: false },
      viewLogs: { type: Boolean, default: false }
    },
    // Upload permissions
    upload: {
      upload: { type: Boolean, default: true },
      uploadMultiple: { type: Boolean, default: true },
      viewAll: { type: Boolean, default: false }
    }
  },
  isSystem: {
    type: Boolean,
    default: false // System roles cannot be deleted
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);
