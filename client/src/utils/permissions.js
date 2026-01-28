/**
 * Utility functions for checking user permissions
 */

/**
 * Check if user has a specific permission
 * @param {object} user - User object with role populated
 * @param {string} permission - Permission path (e.g., 'cards.create')
 * @returns {boolean}
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.role || !user.role.permissions) {
    return false;
  }

  const parts = permission.split('.');
  let current = user.role.permissions;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return false;
    }
    current = current[part];
  }

  return current === true;
};

/**
 * Check if user has any of the specified permissions
 * @param {object} user - User object with role populated
 * @param {string[]} permissions - Array of permission paths
 * @returns {boolean}
 */
export const hasAnyPermission = (user, permissions) => {
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Check if user has all of the specified permissions
 * @param {object} user - User object with role populated
 * @param {string[]} permissions - Array of permission paths
 * @returns {boolean}
 */
export const hasAllPermissions = (user, permissions) => {
  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Check if user is admin
 * @param {object} user - User object with role populated
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  return user?.role?.name === 'admin' || user?.role?.name === 'superadmin';
};

/**
 * Check if user is superadmin
 * @param {object} user - User object with role populated
 * @returns {boolean}
 */
export const isSuperAdmin = (user) => {
  return user?.role?.name === 'superadmin';
};

/**
 * Check if user can view all cards (not just their own)
 * @param {object} user - User object with role populated
 * @returns {boolean}
 */
export const canViewAllCards = (user) => {
  return hasPermission(user, 'cards.viewAll') || isAdmin(user);
};

/**
 * Check if user can edit all cards (not just their own)
 * @param {object} user - User object with role populated
 * @returns {boolean}
 */
export const canEditAllCards = (user) => {
  return hasPermission(user, 'cards.editAll') || isAdmin(user);
};

/**
 * Check if user can delete all cards (not just their own)
 * @param {object} user - User object with role populated
 * @returns {boolean}
 */
export const canDeleteAllCards = (user) => {
  return hasPermission(user, 'cards.deleteAll') || isAdmin(user);
};
