const { DataTypes } = require('sequelize');

function defineCard(sequelize) {
  const Card = sequelize.define('Card', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    cardId: {
      type: DataTypes.STRING(6),
      allowNull: true,
      unique: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    contentHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('concept', 'action', 'quote', 'checklist', 'mindmap'),
      defaultValue: 'concept',
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {
        difficulty: 3,
        estimatedTime: 5,
        lastReviewed: null,
        reviewCount: 0,
        rating: null,
        relatedCards: [],
      },
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    generatedBy: {
      type: DataTypes.ENUM('rule-based', 'ai'),
      defaultValue: 'rule-based',
    },
    attachments: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    provenance: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'cards',
    timestamps: true,
    underscored: true,
    getterMethods: {
      _id() { return this.id; },
      user() { return this.userId; },
    },
  });

  Card.prototype.toJSON = function () {
    const values = { ...this.get() };
    values._id = values.id;
    values.user = values.userId;
    return values;
  };

  return Card;
}

module.exports = { defineCard };
