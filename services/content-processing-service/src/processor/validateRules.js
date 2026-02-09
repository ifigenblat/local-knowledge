/**
 * Validation for processing rules - prevents invalid structures
 */

const VALID_CARD_TYPES = ['concept', 'action', 'quote', 'checklist', 'mindmap'];
const MAX_CARD_TYPES = 10;
const MAX_CATEGORIES = 50;
const MAX_KEYWORDS_PER_TYPE = 100;
const MAX_KEYWORDS_PER_CATEGORY = 100;
const MAX_ACTION_VERBS = 100;
const MAX_KEYWORD_LENGTH = 100;
const MAX_CATEGORY_NAME_LENGTH = 80;

function isValidKeyword(kw) {
  if (typeof kw !== 'string') return false;
  const trimmed = kw.trim();
  if (!trimmed || trimmed.length > MAX_KEYWORD_LENGTH) return false;
  return true;
}

function validateAndSanitizeRules(rules) {
  const errors = [];

  if (!rules || typeof rules !== 'object') {
    return { valid: false, errors: ['Rules must be an object'], sanitized: null };
  }

  // cardTypeKeywords: { [type: string]: string[] }
  const sanitized = { cardTypeKeywords: {}, categoryKeywords: {}, actionVerbs: [] };

  if (rules.cardTypeKeywords) {
    if (typeof rules.cardTypeKeywords !== 'object' || Array.isArray(rules.cardTypeKeywords)) {
      errors.push('cardTypeKeywords must be an object mapping card types to keyword arrays');
    } else {
      const types = Object.keys(rules.cardTypeKeywords);
      if (types.length === 0) {
        errors.push('cardTypeKeywords must have at least one card type');
      } else if (types.length > MAX_CARD_TYPES) {
        errors.push(`cardTypeKeywords has too many types (max ${MAX_CARD_TYPES})`);
      } else {
        for (const type of types) {
          const validType = VALID_CARD_TYPES.includes(type);
          if (!validType) {
            errors.push(`Invalid card type "${type}". Must be one of: ${VALID_CARD_TYPES.join(', ')}`);
            continue;
          }
          const keywords = rules.cardTypeKeywords[type];
          if (!Array.isArray(keywords)) {
            errors.push(`cardTypeKeywords.${type} must be an array of strings`);
            continue;
          }
          const unique = [...new Set(keywords.map(k => (typeof k === 'string' ? k.trim().toLowerCase() : '')).filter(Boolean))];
          if (unique.length === 0) {
            errors.push(`cardTypeKeywords.${type} must have at least one keyword`);
          } else if (unique.length > MAX_KEYWORDS_PER_TYPE) {
            errors.push(`cardTypeKeywords.${type} has too many keywords (max ${MAX_KEYWORDS_PER_TYPE})`);
          } else {
            const invalid = unique.filter(k => k.length > MAX_KEYWORD_LENGTH);
            if (invalid.length > 0) {
              errors.push(`Some keywords in ${type} exceed ${MAX_KEYWORD_LENGTH} characters`);
            } else {
              sanitized.cardTypeKeywords[type] = unique;
            }
          }
        }
      }
    }
  } else {
    errors.push('cardTypeKeywords is required');
  }

  // categoryKeywords: { [category: string]: string[] }
  if (rules.categoryKeywords) {
    if (typeof rules.categoryKeywords !== 'object' || Array.isArray(rules.categoryKeywords)) {
      errors.push('categoryKeywords must be an object mapping category names to keyword arrays');
    } else {
      const categories = Object.keys(rules.categoryKeywords);
      if (categories.length > MAX_CATEGORIES) {
        errors.push(`categoryKeywords has too many categories (max ${MAX_CATEGORIES})`);
      } else {
        for (const cat of categories) {
          const trimmedCat = typeof cat === 'string' ? cat.trim() : '';
          if (!trimmedCat) {
            errors.push('Category names cannot be empty');
            continue;
          }
          if (trimmedCat.length > MAX_CATEGORY_NAME_LENGTH) {
            errors.push(`Category "${trimmedCat.substring(0, 30)}..." exceeds ${MAX_CATEGORY_NAME_LENGTH} characters`);
            continue;
          }
          const keywords = rules.categoryKeywords[cat];
          if (!Array.isArray(keywords)) {
            errors.push(`categoryKeywords.${trimmedCat} must be an array of strings`);
            continue;
          }
          const catUnique = [...new Set(keywords.map(k => (typeof k === 'string' ? k.trim().toLowerCase() : '')).filter(Boolean))];
          if (catUnique.length > MAX_KEYWORDS_PER_CATEGORY) {
            errors.push(`categoryKeywords.${trimmedCat} has too many keywords (max ${MAX_KEYWORDS_PER_CATEGORY})`);
          } else {
            const invalid = catUnique.filter(k => k.length > MAX_KEYWORD_LENGTH);
            if (invalid.length > 0) {
              errors.push(`Some keywords in category "${trimmedCat}" exceed ${MAX_KEYWORD_LENGTH} characters`);
            } else {
              sanitized.categoryKeywords[trimmedCat] = catUnique;
            }
          }
        }
      }
    }
  } else {
    errors.push('categoryKeywords is required');
  }

  // actionVerbs: string[]
  if (rules.actionVerbs !== undefined) {
    if (!Array.isArray(rules.actionVerbs)) {
      errors.push('actionVerbs must be an array of strings');
    } else {
      const unique = [...new Set(rules.actionVerbs.map(v => (typeof v === 'string' ? v.trim().toLowerCase() : '')).filter(Boolean))];
      if (unique.length > MAX_ACTION_VERBS) {
        errors.push(`actionVerbs has too many items (max ${MAX_ACTION_VERBS})`);
      } else {
        const invalid = unique.filter(v => v.length > MAX_KEYWORD_LENGTH);
        if (invalid.length > 0) {
          errors.push('Some action verbs exceed maximum length');
        } else {
          sanitized.actionVerbs = unique;
        }
      }
    }
  } else {
    errors.push('actionVerbs is required');
  }

  if (errors.length > 0) {
    return { valid: false, errors, sanitized: null };
  }

  return { valid: true, errors: [], sanitized };
}

module.exports = { validateAndSanitizeRules, VALID_CARD_TYPES };
