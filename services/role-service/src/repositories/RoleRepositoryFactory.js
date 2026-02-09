/**
 * Returns the appropriate RoleRepository based on DATABASE_PROVIDER
 */

const path = require('path');
const PostgresRoleRepository = require(path.join(__dirname, '../../../shared/postgres/repositories/RoleRepository'));

let _instance = null;

async function getRoleRepository() {
  if (_instance) return _instance;

  {
    const { connectDB } = require(path.join(__dirname, '../../../shared/postgres/database'));
    const { initModels } = require(path.join(__dirname, '../../../shared/postgres/models'));
    await connectDB();
    const { Role } = initModels();
    _instance = new PostgresRoleRepository(Role);
  }

  return _instance;
}

module.exports = { getRoleRepository };
