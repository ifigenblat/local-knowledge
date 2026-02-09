const path = require('path');
const PostgresUserRepository = require(path.join(__dirname, '../../../shared/postgres/repositories/UserRepository'));

let _instance = null;

async function getUserRepository() {
  if (_instance) return _instance;
  const { initPostgres } = require(path.join(__dirname, '../../../shared/postgres'));
  const { User, Role } = await initPostgres();
  _instance = new PostgresUserRepository(User, Role);
  return _instance;
}

module.exports = { getUserRepository };
