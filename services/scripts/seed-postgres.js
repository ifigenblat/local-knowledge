#!/usr/bin/env node
/**
 * Seed PostgreSQL with default roles and optional admin user
 * Run: cd services && DATABASE_URL=postgresql://... node scripts/seed-postgres.js
 */

const path = require('path');
const bcrypt = require('bcryptjs');

process.chdir(path.join(__dirname, '..'));
require('dotenv').config();

const ROLES = [
  {
    name: 'superadmin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions. This role cannot be modified or deleted.',
    isSystem: true,
    isImmutable: true,
    permissions: {
      cards: { view: true, create: true, edit: true, delete: true, viewAll: true, editAll: true, deleteAll: true },
      collections: { view: true, create: true, edit: true, delete: true, viewAll: true, editAll: true, deleteAll: true },
      users: { view: true, create: true, edit: true, delete: true, assignRoles: true },
      roles: { view: true, create: true, edit: true, delete: true },
      system: { viewSettings: true, editSettings: true, viewLogs: true },
      upload: { upload: true, uploadMultiple: true, viewAll: true },
    },
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access with all permissions',
    isSystem: true,
    permissions: {
      cards: { view: true, create: true, edit: true, delete: true, viewAll: true, editAll: true, deleteAll: true },
      collections: { view: true, create: true, edit: true, delete: true, viewAll: true, editAll: true, deleteAll: true },
      users: { view: true, create: true, edit: true, delete: true, assignRoles: true },
      roles: { view: true, create: true, edit: true, delete: true },
      system: { viewSettings: true, editSettings: true, viewLogs: true },
      upload: { upload: true, uploadMultiple: true, viewAll: true },
    },
  },
  {
    name: 'user',
    displayName: 'User',
    description: 'Standard user with basic permissions',
    isSystem: true,
    permissions: {
      cards: { view: true, create: true, edit: true, delete: true, viewAll: false, editAll: false, deleteAll: false },
      collections: { view: true, create: true, edit: true, delete: true, viewAll: false, editAll: false, deleteAll: false },
      users: { view: false, create: false, edit: false, delete: false, assignRoles: false },
      roles: { view: false, create: false, edit: false, delete: false },
      system: { viewSettings: false, editSettings: false, viewLogs: false },
      upload: { upload: true, uploadMultiple: true, viewAll: false },
    },
  },
];

async function seed() {
  const servicesDir = path.join(__dirname, '..');
  const { connectDB } = require(path.join(servicesDir, 'shared/postgres/database'));
  const { initModels } = require(path.join(servicesDir, 'shared/postgres/models'));

  await connectDB();
  const { Role, User } = initModels();

  for (const r of ROLES) {
    const [role] = await Role.findOrCreate({ where: { name: r.name }, defaults: r });
    if (role) console.log(`✓ Role "${r.name}" ready`);
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@localknowledge.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const superadminRole = await Role.findOne({ where: { name: 'superadmin' } });
  if (superadminRole) {
    const [user, created] = await User.findOrCreate({
      where: { email: adminEmail },
      defaults: {
        name: 'Admin',
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        roleId: superadminRole.id,
        mustChangePassword: true,
      },
    });
    if (created) {
      console.log(`✓ Admin user created: ${adminEmail}`);
    } else if (user.roleId !== superadminRole.id) {
      await user.update({ roleId: superadminRole.id });
      console.log(`✓ Admin user role updated to Super Administrator: ${adminEmail}`);
    }
  }

  console.log('PostgreSQL seed complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
