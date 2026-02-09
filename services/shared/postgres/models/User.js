const { DataTypes } = require('sequelize');

function defineUser(sequelize) {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'role_id',
    },
    mustChangePassword: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: { theme: 'auto', cardView: 'grid', notifications: true },
    },
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    getterMethods: {
      _id() { return this.id; },
      role() { return this.roleId; },
    },
  });

  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    values._id = values.id;
    values.role = values.Role || values.role;
    if (values.Role) delete values.Role;
    values.createdAt = values.created_at || values.createdAt;
    delete values.password;
    return values;
  };

  return User;
}

module.exports = { defineUser };
