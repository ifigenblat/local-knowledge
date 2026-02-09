/**
 * PostgreSQL / Sequelize connection for microservices
 * Use DATABASE_URL or POSTGRES_URI for connection
 */

const { Sequelize } = require('sequelize');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URI ||
  'postgresql://localknowledge:localknowledge@localhost:5432/localknowledge';

let sequelize = null;

const connectDB = async () => {
  if (sequelize) {
    try {
      await sequelize.authenticate();
      return sequelize;
    } catch {
      sequelize = null;
    }
  }

  sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.SEQ_LOGGING === 'true' ? console.log : false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    define: {
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  });

  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');
    return sequelize;
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err.message);
    throw err;
  }
};

const disconnectDB = async () => {
  if (sequelize) {
    await sequelize.close();
    sequelize = null;
    console.log('PostgreSQL disconnected');
  }
};

const getSequelize = () => sequelize;

module.exports = { connectDB, disconnectDB, getSequelize };
