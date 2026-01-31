/**
 * Minimal Card schema for populate() only (same MongoDB "cards" collection).
 * Collection service does not create/update cards; it only references them.
 */
const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  title: { type: String },
  type: { type: String },
  category: { type: String },
  content: { type: String }
}, { _id: true, strict: false, collection: 'cards' });

module.exports = mongoose.model('Card', cardSchema);
