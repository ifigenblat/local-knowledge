const { getSequelize } = require('../database');
const { defineRole } = require('./Role');
const { defineUser } = require('./User');
const { defineCard } = require('./Card');
const { defineCollection } = require('./Collection');
const { defineProcessingRules } = require('./ProcessingRules');

let Role, User, Card, Collection, ProcessingRules;

function initModels() {
  const sequelize = getSequelize();
  if (!sequelize) throw new Error('Sequelize not initialized. Call connectDB() first.');

  Role = defineRole(sequelize);
  User = defineUser(sequelize);
  Card = defineCard(sequelize);
  Collection = defineCollection(sequelize);
  ProcessingRules = defineProcessingRules(sequelize);

  User.belongsTo(Role, { foreignKey: 'roleId' });
  Role.hasMany(User, { foreignKey: 'roleId' });
  Card.belongsTo(User, { foreignKey: 'userId' });
  User.hasMany(Card, { foreignKey: 'userId' });
  Collection.belongsTo(User, { foreignKey: 'userId' });
  User.hasMany(Collection, { foreignKey: 'userId' });
  Collection.belongsToMany(Card, {
    through: 'collection_cards',
    foreignKey: 'collection_id',
    otherKey: 'card_id',
  });
  Card.belongsToMany(Collection, {
    through: 'collection_cards',
    foreignKey: 'card_id',
    otherKey: 'collection_id',
  });

  return { Role, User, Card, Collection, ProcessingRules, sequelize };
}

function getModels() {
  const sequelize = getSequelize();
  return { Role, User, Card, Collection, ProcessingRules, sequelize };
}

module.exports = { initModels, getModels };
