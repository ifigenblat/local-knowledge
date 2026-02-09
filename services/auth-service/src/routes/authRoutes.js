const express = require('express');
const router = express.Router();
const AuthService = require('../services/AuthService');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const result = await AuthService.register(name, email, password);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log(`[Auth] Login attempt for: ${email}`);
    const result = await AuthService.login(email, password);
    console.log(`[Auth] Login successful for: ${email}`);
    res.json(result);
  } catch (error) {
    console.error(`[Auth] Login failed for ${req.body?.email || 'unknown'}:`, error.message);
    console.error(`[Auth] Error stack:`, error.stack);
    // Return 400 for client errors, 500 for server errors
    const statusCode = error.message.includes('Invalid credentials') || error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

// Validate token
router.get('/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await AuthService.validateToken(token);
    res.json({ valid: true, user });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await AuthService.requestPasswordReset(email);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password (logged-in user, from Settings)
router.put('/password', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const result = await AuthService.changePassword(userId, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    const status = error.message.includes('Current password is incorrect') ? 400 : 400;
    res.status(status).json({ error: error.message });
  }
});

// Reset password (from forgot-password link)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required. Please use the link from your email.' });
    }

    const result = await AuthService.resetPassword(token, newPassword);
    res.json(result);
  } catch (error) {
    console.error('[Auth] Reset password failed:', error.message);
    const status = error.message.includes('at least 6') ? 400 : 400;
    res.status(status).json({ error: error.message });
  }
});

module.exports = router;
