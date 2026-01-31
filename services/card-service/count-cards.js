#!/usr/bin/env node
/**
 * Count cards in the MongoDB cards collection.
 * Uses MONGODB_URI from .env (same as card service).
 * Run: node count-cards.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/local-knowledge';

async function run() {
  await mongoose.connect(uri);
  const count = await mongoose.connection.db.collection('cards').countDocuments();
  console.log('Cards in DB:', count);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
