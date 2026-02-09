const { DataTypes } = require('sequelize');

function defineProcessingRules(sequelize) {
  const ProcessingRules = sequelize.define('ProcessingRules', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      defaultValue: 'default',
    },
    rules: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'cardTypeKeywords, categoryKeywords, actionVerbs',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  }, {
    tableName: 'processing_rules',
    timestamps: true,
    underscored: true,
  });

  return ProcessingRules;
}

module.exports = { defineProcessingRules };
