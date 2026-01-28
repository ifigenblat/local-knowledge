const mongoose = require('mongoose');
const Role = require('../models/Role');
require('dotenv').config({ path: '.env' });

async function initializeRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Super Admin role - immutable, full access, cannot be modified
    const superAdminRole = {
      name: 'superadmin',
      displayName: 'Super Administrator',
      description: 'Full system access with all permissions. This role cannot be modified or deleted.',
      isSystem: true,
      isActive: true,
      permissions: {
        cards: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          viewAll: true,
          editAll: true,
          deleteAll: true
        },
        collections: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          viewAll: true,
          editAll: true,
          deleteAll: true
        },
        users: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          assignRoles: true
        },
        roles: {
          view: true,
          create: true,
          edit: true,
          delete: true
        },
        system: {
          viewSettings: true,
          editSettings: true,
          viewLogs: true
        },
        upload: {
          upload: true,
          uploadMultiple: true,
          viewAll: true
        }
      }
    };

    // Default admin role with all permissions
    const adminRole = {
      name: 'admin',
      displayName: 'Administrator',
      description: 'Full system access with all permissions',
      isSystem: true,
      isActive: true,
      permissions: {
        cards: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          viewAll: true,
          editAll: true,
          deleteAll: true
        },
        collections: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          viewAll: true,
          editAll: true,
          deleteAll: true
        },
        users: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          assignRoles: true
        },
        roles: {
          view: true,
          create: true,
          edit: true,
          delete: true
        },
        system: {
          viewSettings: true,
          editSettings: true,
          viewLogs: true
        },
        upload: {
          upload: true,
          uploadMultiple: true,
          viewAll: true
        }
      }
    };

    // Default user role with basic permissions
    const userRole = {
      name: 'user',
      displayName: 'User',
      description: 'Standard user with basic permissions',
      isSystem: true,
      isActive: true,
      permissions: {
        cards: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          viewAll: false,
          editAll: false,
          deleteAll: false
        },
        collections: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          viewAll: false,
          editAll: false,
          deleteAll: false
        },
        users: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          assignRoles: false
        },
        roles: {
          view: false,
          create: false,
          edit: false,
          delete: false
        },
        system: {
          viewSettings: false,
          editSettings: false,
          viewLogs: false
        },
        upload: {
          upload: true,
          uploadMultiple: true,
          viewAll: false
        }
      }
    };

    // Check if roles already exist
    const existingSuperAdmin = await Role.findOne({ name: 'superadmin' });
    const existingAdmin = await Role.findOne({ name: 'admin' });
    const existingUser = await Role.findOne({ name: 'user' });

    if (!existingSuperAdmin) {
      await Role.create(superAdminRole);
      console.log('✓ Created superadmin role');
    } else {
      console.log('ℹ Superadmin role already exists');
    }

    if (!existingAdmin) {
      await Role.create(adminRole);
      console.log('✓ Created admin role');
    } else {
      console.log('ℹ Admin role already exists');
    }

    if (!existingUser) {
      await Role.create(userRole);
      console.log('✓ Created user role');
    } else {
      console.log('ℹ User role already exists');
    }

    console.log('Role initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Role initialization error:', error);
    process.exit(1);
  }
}

initializeRoles();
