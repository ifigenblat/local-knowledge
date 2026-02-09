#!/usr/bin/env node
/**
 * Count cards in the PostgreSQL cards table.
 * Uses DATABASE_URL from .env (same as card service).
 * Run from services: node card-service/count-cards.js
 * Or: cd card-service && node count-cards.js
 */
const path = require('path');
process.chdir(path.join(__dirname, '..'));
require('dotenv').config();

const { connectDB } = require(path.join(__dirname, '../shared/postgres/database'));
const { initModels } = require(path.join(__dirname, '../shared/postgres/models'));

async function run() {
  await connectDB();
  const { Card } = initModels();
  const count = await Card.count();
  console.log('Cards in DB:', count);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
