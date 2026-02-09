/**
 * PostgreSQL shared module - database connection and models
 * All services use this for database access
 */

const { connectDB, getSequelize } = require('./database');
const { initModels, getModels } = require('./models');

let initialized = false;

async function initPostgres() {
  if (initialized) return getModels();
  await connectDB();
  const models = initModels();
  initialized = true;
  return models;
}

function isValidId(id) {
  if (id == null) return false;
  const str = String(id).trim();
  if (!str) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)) return true;
  return true;
}

module.exports = {
  connectDB,
  getSequelize,
  initPostgres,
  initModels,
  getModels,
  isValidId,
};
