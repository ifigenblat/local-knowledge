const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  }],
  provenance: {
    source_file_id: { type: String, trim: true }
  }
}, { _id: true, strict: false, collection: 'cards' });

module.exports = mongoose.model('Card', cardSchema);
