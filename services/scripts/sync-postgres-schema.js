#!/usr/bin/env node
/**
 * Sync PostgreSQL schema - creates/updates tables
 * Run from services dir: node scripts/sync-postgres-schema.js
 * Or: DATABASE_URL=postgresql://user:pass@localhost:5432/db node scripts/sync-postgres-schema.js
 */

const path = require('path');

const servicesDir = path.join(__dirname, '..');
process.chdir(servicesDir);
require('dotenv').config();

const { connectDB } = require(path.join(servicesDir, 'shared/postgres/database'));
const { initModels } = require(path.join(servicesDir, 'shared/postgres/models'));

async function sync() {
  console.log('Syncing PostgreSQL schema...');
  await connectDB();
  const { sequelize } = initModels();
  const cfg = sequelize.config;
  console.log('Connected to database:', cfg.database, 'on', cfg.host + ':' + (cfg.port || 5432));

  await sequelize.sync({ alter: true });

  const qi = sequelize.getQueryInterface();
  const tables = await qi.showAllTables();
  console.log('✅ PostgreSQL schema synced');
  console.log('Tables in public schema:', tables.length ? tables.join(', ') : '(none)');
  process.exit(0);
}

sync().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
