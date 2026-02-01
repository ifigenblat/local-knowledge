/**
 * AI-powered card regeneration using Ollama (local LLM)
 * Extracted for AI Service microservice
 */

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';
const OLLAMA_ENABLED = process.env.OLLAMA_ENABLED === 'true';

async function isOllamaAvailable() {
  if (!OLLAMA_ENABLED) return false;
  try {
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

async function regenerateCardWithAI(snippet, sourceFileName = 'regenerated') {
  if (!OLLAMA_ENABLED) {
    throw new Error('Ollama is not enabled');
  }
  const available = await isOllamaAvailable();
  if (!available) {
    throw new Error('Ollama is not running or not available');
  }

  const maxSnippetLength = 1000;
  const truncatedSnippet = snippet.length > maxSnippetLength
    ? snippet.substring(0, maxSnippetLength) + '...'
    : snippet;

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response;
  try {
    response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          top_p: 0.8,
          num_predict: 500,
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
        if (errorData.error) errorMessage = errorData.error;
      } catch {
        if (errorText) errorMessage = errorText.substring(0, 200);
      }
    } catch (e) {
      console.error('Error reading Ollama error response:', e.message);
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const aiResponse = data.response || '';
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

  if (!cardData.title || !cardData.content) {
    throw new Error('AI response missing required fields');
  }

  if (!Array.isArray(cardData.tags)) {
    cardData.tags = cardData.tags ? [cardData.tags] : [];
  }
  cardData.tags = cardData.tags.slice(0, 10);

  const validTypes = ['concept', 'action', 'quote', 'checklist', 'mindmap'];
  if (!validTypes.includes(cardData.type)) cardData.type = 'concept';
  if (!cardData.category || typeof cardData.category !== 'string') cardData.category = 'General';
  if (cardData.title.length > 200) cardData.title = cardData.title.substring(0, 197) + '...';

  const snippetPreview = snippet.trim().substring(0, 500) + (snippet.trim().length > 500 ? '...' : '');

  return {
    title: cardData.title.trim(),
    content: cardData.content.trim(),
    type: cardData.type,
    category: cardData.category.trim(),
    tags: cardData.tags.map(tag => String(tag).toLowerCase().trim()).filter(tag => tag.length > 0),
    source: sourceFileName,
    generatedBy: 'ai',
    provenance: {
      snippet: snippetPreview,
      model_name: OLLAMA_MODEL,
      location: 'AI-generated from snippet',
    },
  };
}

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
  getOllamaStatus,
  isOllamaAvailable,
};
