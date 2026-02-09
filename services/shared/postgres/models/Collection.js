const { DataTypes } = require('sequelize');

function defineCollection(sequelize) {
  const Collection = sequelize.define('Collection', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
  }, {
    tableName: 'collections',
    timestamps: true,
    underscored: true,
    getterMethods: {
      _id() { return this.id; },
      user() { return this.userId; },
    },
  });

  Collection.prototype.toJSON = function () {
    const values = { ...this.get() };
    values._id = values.id;
    values.user = values.userId;
    if (values.Cards) values.cards = values.Cards.map((c) => c.id || c._id);
    return values;
  };

  return Collection;
}

module.exports = { defineCollection };
