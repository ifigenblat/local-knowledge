const express = require('express');
const { sendPasswordResetEmail } = require('../emailSender');

const router = express.Router();

/**
 * POST /send-password-reset
 * Body: { email, resetToken, baseUrl? }
 * Sends password reset email. Called by auth-service.
 */
router.post('/send-password-reset', async (req, res) => {
  try {
    const { email, resetToken, baseUrl } = req.body;
    if (!email || !resetToken) {
      return res.status(400).json({ error: 'email and resetToken are required' });
    }
    const result = await sendPasswordResetEmail(email, resetToken, baseUrl);
    res.json(result);
  } catch (error) {
    console.error('Send password reset email error:', error);
    res.status(500).json({
      error: 'Failed to send email',
      message: error.message || 'Error sending password reset email',
    });
  }
});

/**
 * GET /status
 * Returns whether email is configured (transporter available)
 */
router.get('/status', async (req, res) => {
  try {
    const { createTransporter } = require('../emailSender');
    const transporter = await createTransporter();
    res.json({
      configured: !!transporter,
      message: transporter ? 'Email service is configured' : 'No SMTP configured (using dev fallback)',
    });
  } catch (error) {
    res.status(500).json({ configured: false, error: error.message });
  }
});

module.exports = router;
