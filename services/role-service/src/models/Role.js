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
    cards: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      edit: { type: Boolean, default: true },
      delete: { type: Boolean, default: true },
      viewAll: { type: Boolean, default: false },
      editAll: { type: Boolean, default: false },
      deleteAll: { type: Boolean, default: false }
    },
    collections: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      edit: { type: Boolean, default: true },
      delete: { type: Boolean, default: true },
      viewAll: { type: Boolean, default: false },
      editAll: { type: Boolean, default: false },
      deleteAll: { type: Boolean, default: false }
    },
    users: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      assignRoles: { type: Boolean, default: false }
    },
    roles: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    system: {
      viewSettings: { type: Boolean, default: false },
      editSettings: { type: Boolean, default: false },
      viewLogs: { type: Boolean, default: false }
    },
    upload: {
      upload: { type: Boolean, default: true },
      uploadMultiple: { type: Boolean, default: true },
      viewAll: { type: Boolean, default: false }
    }
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  isImmutable: {
    type: Boolean,
    default: false
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
