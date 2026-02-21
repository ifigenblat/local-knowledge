const path = require('path');

let CollectionRepository = null;

async function getCollectionRepository() {
  if (!CollectionRepository) {
    const { initPostgres } = require(path.join(__dirname, '../../../shared/postgres'));
    const { Collection, Card } = await initPostgres();
    const PostgresCollectionRepository = require(path.join(__dirname, '../../../shared/postgres/repositories/CollectionRepository'));
    CollectionRepository = new PostgresCollectionRepository(Collection, Card);
  }
  return CollectionRepository;
}

module.exports = { getCollectionRepository };
