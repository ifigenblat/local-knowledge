const express = require('express');
const router = express.Router();
const RoleService = require('../services/RoleService');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5002';

function userServiceFetch(path, options = {}) {
  const url = `${USER_SERVICE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (options.auth) headers.Authorization = options.auth;
  return fetch(url, { ...options, headers }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(data.error || r.statusText);
      err.status = r.status;
      err.data = data;
      throw err;
    }
    return data;
  });
}

// Get all roles
router.get('/', async (req, res) => {
  try {
    const roles = await RoleService.getAllRoles();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users with this role (must be before GET /:id)
router.get('/:id/users', async (req, res) => {
  try {
    const role = await RoleService.getRoleById(req.params.id);
    const data = await userServiceFetch(
      `/api/users?role=${encodeURIComponent(role._id.toString())}&limit=1000`,
      { auth: req.headers.authorization }
    );
    res.json(data.users || data);
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: 'Role not found' });
    res.status(error.status || 500).json({ error: error.data?.error || error.message });
  }
});

// Assign role to user (must be before GET /:id)
router.post('/:id/assign', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });
    await RoleService.getRoleById(req.params.id); // ensure role exists
    const data = await userServiceFetch(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ roleId: req.params.id }),
      auth: req.headers.authorization,
    });
    res.json({ message: 'Role assigned successfully', user: data });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: 'Role or user not found' });
    res.status(error.status || 400).json({ error: error.data?.error || error.message });
  }
});

// Get role by ID
router.get('/:id', async (req, res) => {
  try {
    const role = await RoleService.getRoleById(req.params.id);
    res.json(role);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Get role by name
router.get('/name/:name', async (req, res) => {
  try {
    const role = await RoleService.getRoleByName(req.params.name);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create role
router.post('/', async (req, res) => {
  try {
    const role = await RoleService.createRole(req.body);
    res.status(201).json(role);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update role
router.put('/:id', async (req, res) => {
  try {
    const role = await RoleService.updateRole(req.params.id, req.body);
    res.json(role);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete role
router.delete('/:id', async (req, res) => {
  try {
    await RoleService.deleteRole(req.params.id);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
