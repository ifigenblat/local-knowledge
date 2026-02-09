/**
 * Rules service - loads processing rules from DB with cache and fallback to defaults
 */

const path = require('path');
const { DEFAULT_RULES } = require('../processor/defaultRules');

let cachedRules = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

function invalidateRulesCache() {
  cachedRules = null;
  cacheTimestamp = 0;
}

async function getRules() {
  const now = Date.now();
  if (cachedRules && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedRules;
  }

  try {
    const { getModels } = require(path.join(__dirname, '../../../shared/postgres/models'));
    const { getSequelize } = require(path.join(__dirname, '../../../shared/postgres/database'));
    const sequelize = getSequelize();

    if (!sequelize) {
      return DEFAULT_RULES;
    }

    const { ProcessingRules } = getModels();
    if (!ProcessingRules) {
      return DEFAULT_RULES;
    }

    const record = await ProcessingRules.findOne({ where: { key: 'default' } });
    if (!record || !record.rules) {
      return DEFAULT_RULES;
    }

    const rules = record.rules;
    // Validate structure
    if (rules.cardTypeKeywords && rules.categoryKeywords && rules.actionVerbs) {
      cachedRules = rules;
      cacheTimestamp = now;
      return rules;
    }

    return DEFAULT_RULES;
  } catch (error) {
    console.warn('rulesService: could not load from DB, using defaults:', error?.message);
    return DEFAULT_RULES;
  }
}

module.exports = { getRules, invalidateRulesCache };
