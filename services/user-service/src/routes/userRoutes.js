const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const UserService = require('../services/UserService');

const CONFIG_PATH = process.env.CONFIG_PATH || path.resolve(__dirname, '../../../config');
const SETTINGS_FILE = path.join(CONFIG_PATH, 'settings.json');

const CLOUD_PROVIDERS = ['openai', 'groq', 'together', 'lmstudio', 'localai', 'llamacpp', 'custom'];
const PROVIDER_DEFAULTS = {
  openai: { url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  groq: { url: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant' },
  together: { url: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3-8b-chat-hf' },
  lmstudio: { url: 'http://localhost:1234/v1', model: 'llama-3-8b' },
  localai: { url: 'http://localhost:8080/v1', model: 'llama-3-8b' },
  llamacpp: { url: 'http://localhost:8081/v1', model: 'llama-3-8b' },
  custom: { url: '', model: '' },
};

function readSettingsRaw() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Settings read failed:', e.message);
  }
  return { aiProvider: 'ollama' };
}

function readSettings() {
  const raw = readSettingsRaw();
  const aiProvider = raw.aiProvider === 'openai' ? 'openai' : 'ollama';
  const cloudProvider = CLOUD_PROVIDERS.includes(raw.cloudProvider) ? raw.cloudProvider : 'openai';
  const cloudApiUrl = typeof raw.cloudApiUrl === 'string' ? raw.cloudApiUrl.trim() : (PROVIDER_DEFAULTS[cloudProvider]?.url || '');
  const cloudModel = typeof raw.cloudModel === 'string' ? raw.cloudModel.trim() : (PROVIDER_DEFAULTS[cloudProvider]?.model || '');
  const hasApiKey = Boolean(raw.cloudApiKey && raw.cloudApiKey.trim());
  const cloudApiKeyMasked = hasApiKey ? '••••••••' + (raw.cloudApiKey.slice(-4) || '') : '';
  return {
    aiProvider,
    cloudProvider,
    cloudApiUrl,
    cloudModel,
    cloudApiKeyMasked,
    hasApiKey,
  };
}

function writeSettings(settings) {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.mkdirSync(CONFIG_PATH, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error('Settings write failed:', e.message);
    throw e;
  }
}

// Get app settings (e.g. AI provider) – authenticated; API key never sent to client
router.get('/settings', async (req, res) => {
  try {
    res.json(readSettings());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update app settings (superadmin only – gateway passes X-User-Role)
router.put('/settings', async (req, res) => {
  try {
    const role = (req.headers['x-user-role'] || '').toLowerCase();
    if (role !== 'superadmin') {
      return res.status(403).json({ error: 'Only Super Administrator can change settings' });
    }
    const { aiProvider, cloudProvider, cloudApiUrl, cloudModel, cloudApiKey } = req.body;
    if (aiProvider !== 'openai' && aiProvider !== 'ollama') {
      return res.status(400).json({ error: 'aiProvider must be "openai" or "ollama"' });
    }
    const current = readSettingsRaw();
    current.aiProvider = aiProvider;
    if (aiProvider === 'openai') {
      if (CLOUD_PROVIDERS.includes(cloudProvider)) current.cloudProvider = cloudProvider;
      if (typeof cloudApiUrl === 'string') current.cloudApiUrl = cloudApiUrl.trim();
      if (typeof cloudModel === 'string') current.cloudModel = cloudModel.trim();
      if (typeof cloudApiKey === 'string' && cloudApiKey.trim()) {
        current.cloudApiKey = cloudApiKey.trim();
      }
    }
    writeSettings(current);
    res.json(readSettings());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }

    const options = {
      sort: { createdAt: -1 },
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const { users, total } = await UserService.getAllUsers(query, options);
    
    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1,
        totalUsers: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const user = await UserService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const user = await UserService.updateUser(req.params.id, req.body);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    await UserService.deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Assign role to user (admin only - gateway passes X-User-Role)
router.post('/:id/assign-role', async (req, res) => {
  try {
    const { roleId } = req.body;
    const currentUserRole = req.headers['x-user-role'] || '';

    const user = await UserService.assignRoleToUser(
      req.params.id,
      roleId,
      currentUserRole
    );

    res.json(user);
  } catch (error) {
    const status =
      error.message === 'User not found' || error.message?.includes('Role not found')
        ? 404
        : error.message?.includes('Cannot modify') || error.message?.includes('Cannot assign')
          ? 403
          : 400;
    res.status(status).json({ error: error.message });
  }
});

module.exports = router;
