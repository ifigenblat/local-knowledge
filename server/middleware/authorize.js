const User = require('../models/User');
const Role = require('../models/Role');

/**
 * Middleware to check if user has required permission
 * @param {string|string[]} requiredPermission - Permission path (e.g., 'cards.create' or ['cards.create', 'cards.edit'])
 * @param {boolean} requireAll - If true, user must have ALL permissions. If false, user needs ANY permission.
 */
const authorize = (requiredPermission, requireAll = false) => {
  return async (req, res, next) => {
    try {
      // Get user with role populated
      const user = await User.findById(req.user.id).populate('role');
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // If user has no role, deny access
      if (!user.role) {
        return res.status(403).json({ error: 'Access denied: No role assigned' });
      }

      // If role is not active, deny access
      if (!user.role.isActive) {
        return res.status(403).json({ error: 'Access denied: Role is inactive' });
      }

      // Get permissions
      const permissions = user.role.permissions || {};

      // Handle array of permissions
      const permissionsToCheck = Array.isArray(requiredPermission) 
        ? requiredPermission 
        : [requiredPermission];

      // Check permissions
      let hasPermission = false;
      
      if (requireAll) {
        // User must have ALL permissions
        hasPermission = permissionsToCheck.every(permission => {
          return checkPermission(permissions, permission);
        });
      } else {
        // User needs ANY permission
        hasPermission = permissionsToCheck.some(permission => {
          return checkPermission(permissions, permission);
        });
      }

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Access denied: Insufficient permissions',
          required: requiredPermission
        });
      }

      // Attach user and role to request for use in route handlers
      req.userObj = user;
      req.userRole = user.role;
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

/**
 * Helper function to check nested permission path
 * @param {object} permissions - Permissions object
 * @param {string} path - Permission path (e.g., 'cards.create')
 */
function checkPermission(permissions, path) {
  const parts = path.split('.');
  let current = permissions;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return false;
    }
    current = current[part];
  }
  
  return current === true;
}

/**
 * Middleware to check if user is admin
 */
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('role');
    
    if (!user || !user.role) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user has admin role (name === 'admin')
    if (user.role.name !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }

    req.userObj = user;
    req.userRole = user.role;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

module.exports = { authorize, isAdmin };
