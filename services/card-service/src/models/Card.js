const mongoose = require('mongoose');
const crypto = require('crypto');

const cardSchema = new mongoose.Schema({
  cardId: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  contentHash: {
    type: String,
    required: false,
    unique: false
  },
  type: {
    type: String,
    enum: ['concept', 'action', 'quote', 'checklist', 'mindmap'],
    default: 'concept'
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  source: {
    type: String,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    difficulty: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    estimatedTime: {
      type: Number,
      default: 5
    },
    relatedCards: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card'
    }],
    lastReviewed: { type: Date },
    reviewCount: { type: Number, default: 0 },
    rating: { type: Number, min: 1, max: 5 }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  generatedBy: {
    type: String,
    enum: ['rule-based', 'ai'],
    default: 'rule-based'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  }],
  provenance: {
    source_file_id: { type: String, trim: true },
    source_path: { type: String, trim: true },
    file_hash: { type: String, trim: true },
    location: { type: String, trim: true },
    snippet: { type: String, maxlength: 5000 },
    model_name: { type: String, trim: true },
    prompt_version: { type: String, trim: true, default: '1.0' },
    confidence_score: { type: Number, min: 0, max: 1 }
  }
}, {
  timestamps: true
});

cardSchema.index({ title: 'text', content: 'text', tags: 'text' });
cardSchema.index({ user: 1, category: 1 });
cardSchema.index({ type: 1, category: 1 });
cardSchema.index({ contentHash: 1, user: 1 });
cardSchema.index({ cardId: 1 });

cardSchema.statics.generateCardId = async function () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let cardId;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    cardId = '';
    for (let i = 0; i < 6; i++) {
      cardId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await this.findOne({ cardId });
    if (!existing) isUnique = true;
    attempts++;
  }

  if (!isUnique) {
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = Math.random().toString(36).toUpperCase().slice(-2);
    cardId = timestamp + random;
  }
  return cardId;
};

cardSchema.pre('save', async function (next) {
  if (!this.cardId) {
    this.cardId = await this.constructor.generateCardId();
  }
  next();
});

cardSchema.statics.findByCardId = function (cardId) {
  return this.findOne({ cardId: cardId.toUpperCase() });
};

cardSchema.statics.findDuplicate = function (contentHash, userId) {
  if (!contentHash) return null;
  return this.findOne({ contentHash, user: userId });
};

cardSchema.statics.findByCategory = function (category, userId) {
  return this.find({ category, user: userId }).sort({ createdAt: -1 });
};

cardSchema.statics.findByType = function (type, userId) {
  return this.find({ type, user: userId }).sort({ createdAt: -1 });
};

cardSchema.methods.updateReview = function () {
  this.metadata = this.metadata || {};
  this.metadata.lastReviewed = new Date();
  this.metadata.reviewCount = (this.metadata.reviewCount || 0) + 1;
  return this.save();
};

module.exports = mongoose.model('Card', cardSchema);
