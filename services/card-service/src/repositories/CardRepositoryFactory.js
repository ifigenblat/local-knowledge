const path = require('path');
const PostgresCardRepository = require(path.join(__dirname, '../../../shared/postgres/repositories/CardRepository'));

let _instance = null;

async function getCardRepository() {
  if (_instance) return _instance;
  const { initPostgres } = require(path.join(__dirname, '../../../shared/postgres'));
  const { Card, sequelize } = await initPostgres();
  _instance = new PostgresCardRepository(Card, sequelize);
  return _instance;
}

module.exports = { getCardRepository };
