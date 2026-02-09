const express = require('express');
const path = require('path');
const { DEFAULT_RULES } = require('../processor/defaultRules');
const { validateAndSanitizeRules } = require('../processor/validateRules');
const { getRules, invalidateRulesCache } = require('../services/rulesService');

const router = express.Router();

const ADMIN_ROLES = ['admin', 'superadmin'];

function requireAdmin(req, res, next) {
  const role = (req.headers['x-user-role'] || '').toLowerCase();
  if (!ADMIN_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Only administrators can manage processing rules',
    });
  }
  next();
}

/**
 * GET /api/content/rules
 * Returns current processing rules (any authenticated user can view)
 */
router.get('/', async (req, res) => {
  try {
    const rules = await getRules();
    return res.json({
      cardTypeKeywords: rules.cardTypeKeywords,
      categoryKeywords: rules.categoryKeywords,
      actionVerbs: rules.actionVerbs,
    });
  } catch (error) {
    console.error('GET /rules error:', error);
    return res.status(500).json({
      error: 'Failed to load rules',
      message: error.message || 'Error loading processing rules',
    });
  }
});

/**
 * PUT /api/content/rules
 * Update processing rules (admin only)
 * Body: { cardTypeKeywords, categoryKeywords, actionVerbs }
 */
router.put('/', requireAdmin, async (req, res) => {
  try {
    const payload = req.body;
    const { valid, errors, sanitized } = validateAndSanitizeRules(payload);

    if (!valid) {
      return res.status(400).json({
        error: 'Validation failed',
        message: errors.join('; '),
        details: errors,
      });
    }

    const { getModels } = require(path.join(__dirname, '../../../shared/postgres/models'));
    const { ProcessingRules: ProcessingRulesModel } = getModels();

    if (!ProcessingRulesModel) {
      return res.status(503).json({
        error: 'Models not initialized',
        message: 'ProcessingRules model not found',
      });
    }

    let record = await ProcessingRulesModel.findOne({ where: { key: 'default' } });

    const rulesData = {
      cardTypeKeywords: sanitized.cardTypeKeywords,
      categoryKeywords: sanitized.categoryKeywords,
      actionVerbs: sanitized.actionVerbs,
    };

    if (record) {
      await record.update({
        rules: rulesData,
        version: (record.version || 1) + 1,
      });
    } else {
      await ProcessingRulesModel.create({
        key: 'default',
        rules: rulesData,
        version: 1,
      });
    }

    invalidateRulesCache();

    return res.json({
      success: true,
      message: 'Rules updated successfully',
      rules: rulesData,
    });
  } catch (error) {
    console.error('PUT /rules error:', error);
    return res.status(500).json({
      error: 'Failed to update rules',
      message: error.message || 'Error saving processing rules',
    });
  }
});

/**
 * POST /api/content/rules/reset
 * Reset rules to defaults (admin only)
 */
router.post('/reset', requireAdmin, async (req, res) => {
  try {
    const { valid, errors, sanitized } = validateAndSanitizeRules(DEFAULT_RULES);
    if (!valid) {
      return res.status(500).json({
        error: 'Default rules invalid',
        message: 'Internal error: default rules failed validation',
      });
    }

    const { getModels } = require(path.join(__dirname, '../../../shared/postgres/models'));
    const { ProcessingRules: ProcessingRulesModel } = getModels();

    if (!ProcessingRulesModel) {
      return res.status(503).json({
        error: 'Models not initialized',
        message: 'ProcessingRules model not found',
      });
    }

    const rulesData = {
      cardTypeKeywords: sanitized.cardTypeKeywords,
      categoryKeywords: sanitized.categoryKeywords,
      actionVerbs: sanitized.actionVerbs,
    };

    let record = await ProcessingRulesModel.findOne({ where: { key: 'default' } });
    if (record) {
      await record.update({
        rules: rulesData,
        version: (record.version || 1) + 1,
      });
    } else {
      await ProcessingRulesModel.create({
        key: 'default',
        rules: rulesData,
        version: 1,
      });
    }

    invalidateRulesCache();

    return res.json({
      success: true,
      message: 'Rules reset to defaults',
      rules: rulesData,
    });
  } catch (error) {
    console.error('POST /rules/reset error:', error);
    return res.status(500).json({
      error: 'Failed to reset rules',
      message: error.message || 'Error resetting processing rules',
    });
  }
});

module.exports = router;
