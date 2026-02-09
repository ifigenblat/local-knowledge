/**
 * Sync PostgreSQL schema - creates tables if they don't exist
 * Run: DATABASE_URL=postgresql://... node shared/postgres/sync.js
 * Or from a service: node -e "require('./shared/postgres/sync').sync()"
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { connectDB, getSequelize } = require('./database');
const { initModels } = require('./models');

async function sync() {
  await connectDB();
  const { sequelize } = initModels();
  await sequelize.sync({ alter: true });
  console.log('✅ PostgreSQL schema synced');
  process.exit(0);
}

sync().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
