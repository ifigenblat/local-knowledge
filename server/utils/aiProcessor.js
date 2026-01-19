/**
 * AI-powered card regeneration using Ollama (local LLM)
 * Falls back to rule-based processing if Ollama is not available
 */

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';
const OLLAMA_ENABLED = process.env.OLLAMA_ENABLED === 'true';

/**
 * Check if Ollama is available
 */
async function isOllamaAvailable() {
  if (!OLLAMA_ENABLED) {
    return false;
  }

  try {
    // Use AbortController for timeout in Node.js 18+
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log('Ollama not available:', error.message);
    return false;
  }
}

/**
 * Generate card data using AI from Ollama
 */
async function regenerateCardWithAI(snippet, sourceFileName = 'regenerated') {
  try {
    if (!OLLAMA_ENABLED) {
      throw new Error('Ollama is not enabled');
    }

    // Check if Ollama is available
    const available = await isOllamaAvailable();
    if (!available) {
      throw new Error('Ollama is not running or not available');
    }

    // Truncate snippet if too long (models have context limits)
    // Use a more conservative limit for phi model (3B) to prevent crashes
    const maxSnippetLength = 1000; // Reduced from 2000 for stability
    const truncatedSnippet = snippet.length > maxSnippetLength 
      ? snippet.substring(0, maxSnippetLength) + '...' 
      : snippet;

    // Create a shorter, more direct prompt optimized for phi model
    const prompt = `Analyze this text and return JSON only:

Text: ${truncatedSnippet}

JSON format:
{
  "title": "short title",
  "content": "cleaned text", 
  "type": "concept",
  "category": "category",
  "tags": ["tag1","tag2","tag3"]
}`;

    // Call Ollama API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    let response;
    try {
      response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.2, // Lower temperature for more stable results
            top_p: 0.8, // Reduced for stability
            num_predict: 500, // Further reduced to prevent crashes
          },
        }),
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Ollama request timed out after 30 seconds. The model may be overloaded. Please try again.');
      }
      throw new Error(`Failed to connect to Ollama: ${fetchError.message}`);
    }

    if (!response.ok) {
      let errorMessage = `Ollama API error: ${response.status} ${response.statusText}`;
      try {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseErr) {
          // If not JSON, use the text as is (truncated)
          if (errorText) {
            errorMessage = errorText.substring(0, 200);
          }
        }
      } catch (e) {
        // If response can't be read, use status text
        console.error('Error reading Ollama error response:', e.message);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const aiResponse = data.response || '';

    // Extract JSON from response (might have extra text before/after)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    let cardData;
    try {
      cardData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Invalid JSON in AI response');
    }

    // Validate and clean the response
    if (!cardData.title || !cardData.content) {
      throw new Error('AI response missing required fields');
    }

    // Ensure arrays are arrays
    if (!Array.isArray(cardData.tags)) {
      cardData.tags = cardData.tags ? [cardData.tags] : [];
    }

    // Limit tags to 10
    cardData.tags = cardData.tags.slice(0, 10);

    // Validate type
    const validTypes = ['concept', 'action', 'quote', 'checklist', 'mindmap'];
    if (!validTypes.includes(cardData.type)) {
      cardData.type = 'concept'; // Default fallback
    }

    // Ensure category is a string
    if (!cardData.category || typeof cardData.category !== 'string') {
      cardData.category = 'General';
    }

    // Truncate title if too long
    if (cardData.title.length > 200) {
      cardData.title = cardData.title.substring(0, 197) + '...';
    }

    // Create provenance info
    const snippetPreview = snippet.trim().substring(0, 500) + (snippet.trim().length > 500 ? '...' : '');

    return {
      title: cardData.title.trim(),
      content: cardData.content.trim(),
      type: cardData.type,
      category: cardData.category.trim(),
      tags: cardData.tags.map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0),
      source: sourceFileName,
      provenance: {
        snippet: snippetPreview,
        model_name: OLLAMA_MODEL,
        location: 'AI-generated from snippet',
      },
    };
  } catch (error) {
    console.error('AI regeneration error:', error);
    throw error;
  }
}

/**
 * Hybrid regeneration: Try AI first, fallback to rule-based
 */
async function regenerateCardHybrid(snippet, sourceFileName, filePath, useAI = false) {
  if (useAI) {
    try {
      const aiResult = await regenerateCardWithAI(snippet, sourceFileName);
      console.log('Successfully regenerated card using AI');
      return aiResult;
    } catch (error) {
      console.warn('AI regeneration failed, falling back to rule-based:', error.message);
      // Fall through to rule-based
    }
  }

  // Use rule-based as fallback or default
  const { createCardFromSection } = require('./contentProcessor');
  const ruleBasedResult = await createCardFromSection(snippet, sourceFileName, filePath, 1, 1);
  
  if (!ruleBasedResult) {
    throw new Error('Both AI and rule-based regeneration failed');
  }

  return ruleBasedResult;
}

/**
 * Generate both AI and rule-based versions for comparison
 */
async function regenerateCardComparison(snippet, sourceFileName, filePath) {
  const { createCardFromSection } = require('./contentProcessor');
  
  // Always generate rule-based version
  const ruleBasedResult = await createCardFromSection(snippet, sourceFileName, filePath, 1, 1);
  
  if (!ruleBasedResult) {
    throw new Error('Rule-based regeneration failed');
  }

  // Try to generate AI version
  let aiResult = null;
  let aiError = null;
  
  try {
    aiResult = await regenerateCardWithAI(snippet, sourceFileName);
  } catch (error) {
    aiError = error.message;
    console.warn('AI regeneration failed:', error.message);
  }

  return {
    ruleBased: ruleBasedResult,
    ai: aiResult,
    aiError: aiError,
  };
}

/**
 * Get detailed Ollama status information
 */
async function getOllamaStatus() {
  const status = {
    enabled: OLLAMA_ENABLED,
    configured: !!OLLAMA_API_URL && !!OLLAMA_MODEL,
    apiUrl: OLLAMA_API_URL,
    model: OLLAMA_MODEL,
    available: false,
    error: null,
  };

  if (!OLLAMA_ENABLED) {
    status.error = 'Ollama is not enabled. Set OLLAMA_ENABLED=true in your .env file.';
    return status;
  }

  try {
    const available = await isOllamaAvailable();
    status.available = available;
    
    if (!available) {
      status.error = `Ollama is not reachable at ${OLLAMA_API_URL}. Make sure Ollama is running (e.g., 'ollama serve').`;
    } else {
      // Try to verify the model exists
      try {
        const modelResponse = await fetch(`${OLLAMA_API_URL}/api/show`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: OLLAMA_MODEL }),
        });
        
        if (!modelResponse.ok) {
          status.error = `Model '${OLLAMA_MODEL}' not found. Run 'ollama pull ${OLLAMA_MODEL}' to install it.`;
          status.available = false;
        }
      } catch (modelError) {
        // If model check fails but Ollama is available, it's still usable
        console.warn('Could not verify model:', modelError.message);
      }
    }
  } catch (error) {
    status.available = false;
    status.error = error.message || 'Unknown error checking Ollama status';
  }

  return status;
}

module.exports = {
  regenerateCardWithAI,
  regenerateCardHybrid,
  regenerateCardComparison,
  isOllamaAvailable,
  getOllamaStatus,
};
