const { DataTypes } = require('sequelize');
const { getSequelize } = require('../database');

const defaultPermissions = {
  cards: { view: true, create: true, edit: true, delete: true, viewAll: false, editAll: false, deleteAll: false },
  collections: { view: true, create: true, edit: true, delete: true, viewAll: false, editAll: false, deleteAll: false },
  users: { view: false, create: false, edit: false, delete: false, assignRoles: false },
  roles: { view: false, create: false, edit: false, delete: false },
  system: { viewSettings: false, editSettings: false, viewLogs: false },
  upload: { upload: true, uploadMultiple: true, viewAll: false },
};

function defineRole(sequelize) {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isLowercase: true },
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: defaultPermissions,
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isImmutable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by_id',
    },
  }, {
    tableName: 'roles',
    timestamps: true,
    underscored: true,
    getterMethods: {
      _id() { return this.id; },
    },
  });

  Role.prototype.toJSON = function () {
    const values = { ...this.get() };
    values._id = values.id;
    return values;
  };

  return Role;
}

module.exports = { defineRole, defaultPermissions };
