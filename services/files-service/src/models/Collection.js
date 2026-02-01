const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  name: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }]
}, { _id: true, strict: false, collection: 'collections' });

module.exports = mongoose.model('Collection', collectionSchema);
