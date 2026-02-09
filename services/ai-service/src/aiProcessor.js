/**
 * AI-powered card generation: OpenAI-compatible API (OpenAI, Groq, etc.) or Ollama (local).
 * Provider can be set in UI by superadmin (settings.json) or by env: OPENAI_API_KEY / OLLAMA_ENABLED.
 */

const path = require('path');
const fs = require('fs');

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';
const OLLAMA_ENABLED = process.env.OLLAMA_ENABLED === 'true';

const OPENAI_API_URL = (process.env.OPENAI_API_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Use same config dir as user-service (services/config) so AI provider settings saved in UI are used
const CONFIG_PATH = process.env.CONFIG_PATH || path.resolve(__dirname, '../../../config');
const SETTINGS_FILE = path.join(CONFIG_PATH, 'settings.json');
let cachedSettings = null;
let cachedSettingsTime = 0;
const CACHE_MS = 60000;

function readSettingsRaw() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('AI provider settings read failed:', e.message);
  }
  return {};
}

function getSettings() {
  const now = Date.now();
  if (cachedSettings !== null && now - cachedSettingsTime < CACHE_MS) {
    return cachedSettings;
  }
  cachedSettings = readSettingsRaw();
  cachedSettingsTime = now;
  return cachedSettings;
}

function invalidateSettingsCache() {
  cachedSettings = null;
  cachedSettingsTime = 0;
}

function getConfiguredAIProvider() {
  const s = getSettings();
  if (s.aiProvider === 'openai') return 'openai';
  if (s.aiProvider === 'ollama') return 'ollama';
  return null;
}

function getCloudConfig() {
  const s = getSettings();
  const useCloudFromSettings = s.aiProvider === 'openai';
  const apiKeyFromSettings = (s.cloudApiKey && String(s.cloudApiKey).trim()) || '';
  return {
    apiKey: useCloudFromSettings ? apiKeyFromSettings : (OPENAI_API_KEY || '').trim(),
    apiUrl: (useCloudFromSettings && s.cloudApiUrl && String(s.cloudApiUrl).trim()
      ? String(s.cloudApiUrl).trim()
      : OPENAI_API_URL).replace(/\/$/, '') || 'https://api.openai.com/v1',
    model: (useCloudFromSettings && s.cloudModel && String(s.cloudModel).trim()
      ? String(s.cloudModel).trim()
      : OPENAI_MODEL) || 'gpt-4o-mini',
  };
}

function useOpenAI() {
  const configured = getConfiguredAIProvider();
  if (configured === 'ollama') return false;
  if (configured === 'openai') {
    if (!cloudProviderRequiresApiKey()) return true;
    const { apiKey } = getCloudConfig();
    return Boolean(apiKey);
  }
  return Boolean(OPENAI_API_KEY && OPENAI_API_KEY.trim());
}

const AI_CHAT_TIMEOUT_MS = 90000; // 90s per request to allow slow/local models
const AI_CHAT_MAX_RETRIES = 2;
const AI_CHAT_RETRY_DELAY_MS = 3000;

async function callOpenAIChat(prompt, maxTokens = 800) {
  const { apiKey, apiUrl, model } = getCloudConfig();
  const requiresKey = cloudProviderRequiresApiKey();
  if (requiresKey && (!apiKey || !apiKey.trim())) throw new Error('No API key configured. Set in Settings (AI provider) or ai-service .env.');
  const bearerToken = (apiKey && apiKey.trim()) ? apiKey : 'no-key';

  let lastError;
  for (let attempt = 0; attempt <= AI_CHAT_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_CHAT_TIMEOUT_MS);
    try {
      const res = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.3,
        }),
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        let msg = errBody;
        try {
          const j = JSON.parse(errBody);
          msg = j.error?.message || j.message || errBody;
        } catch (_) {}
        lastError = new Error(msg || `API error: ${res.status}`);
        if ((res.status === 429 || res.status === 503) && attempt < AI_CHAT_MAX_RETRIES) {
          console.warn(`AI rate limit/server error (${res.status}), retrying in ${AI_CHAT_RETRY_DELAY_MS / 1000}s...`);
          await new Promise(r => setTimeout(r, AI_CHAT_RETRY_DELAY_MS));
          continue;
        }
        throw lastError;
      }
      // Cap response body size to avoid OOM (some APIs can return huge payloads)
      const MAX_RESPONSE_BODY_CHARS = 500 * 1024; // 500KB
      let bodyText = '';
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (bodyText.length < MAX_RESPONSE_BODY_CHARS) {
          const { done, value } = await reader.read();
          if (done) break;
          bodyText += decoder.decode(value, { stream: true });
        }
        reader.cancel().catch(() => {});
      }
      if (!bodyText) throw new Error('Empty response from AI');
      let data;
      try {
        data = JSON.parse(bodyText);
      } catch (parseErr) {
        if (bodyText.length >= MAX_RESPONSE_BODY_CHARS) throw new Error('AI response too large (capped to avoid OOM)');
        throw parseErr;
      }
      const content = data.choices?.[0]?.message?.content?.trim() || '';
      if (!content) throw new Error('Empty response from AI');
      return content;
    } catch (e) {
      clearTimeout(timeoutId);
      lastError = e.name === 'AbortError' ? new Error('AI request timed out') : e;
      const isRetryable = e.name === 'AbortError' || e.message?.includes('fetch') || e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT';
      if (isRetryable && attempt < AI_CHAT_MAX_RETRIES) {
        console.warn(`AI request failed (${e.message}), retrying in ${AI_CHAT_RETRY_DELAY_MS / 1000}s...`);
        await new Promise(r => setTimeout(r, AI_CHAT_RETRY_DELAY_MS));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

async function isOpenAIAvailable() {
  if (!useOpenAI()) return false;
  const { apiKey, apiUrl } = getCloudConfig();
  if (cloudProviderRequiresApiKey() && (!apiKey || !apiKey.trim())) return false;
  const bearerToken = (apiKey && apiKey.trim()) ? apiKey : 'no-key';
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${apiUrl}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (res.ok) return true;
    if (res.status === 404) return true;
    return false;
  } catch (e) {
    console.log('OpenAI-compatible API not available:', e.message);
    return false;
  }
}

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

  if (useOpenAI()) {
    const available = await isOpenAIAvailable();
    if (!available) {
      const msg = cloudProviderRequiresApiKey()
        ? 'Cloud API not reachable. Check API key and URL in Settings (AI provider).'
        : 'Local AI server not reachable. Is it running at the URL in Settings (AI provider)? To use AI without local setup, switch to a cloud provider (e.g. Groq or OpenAI) in Administration → AI Settings.';
      throw new Error(msg);
    }
    const content = await callOpenAIChat(prompt, 500);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON found in AI response');
    let cardData;
    try {
      cardData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error('Invalid JSON in AI response');
    }
    if (!cardData.title || !cardData.content) throw new Error('AI response missing required fields');
    if (!Array.isArray(cardData.tags)) cardData.tags = cardData.tags ? [cardData.tags] : [];
    const validTypes = ['concept', 'action', 'quote', 'checklist', 'mindmap'];
    const snippetPreview = snippet.trim().substring(0, 500) + (snippet.trim().length > 500 ? '...' : '');
    return {
      title: cardData.title.trim(),
      content: cardData.content.trim(),
      type: validTypes.includes(cardData.type) ? cardData.type : 'concept',
      category: (cardData.category && String(cardData.category).trim()) || 'General',
      tags: cardData.tags.map(t => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 10),
      source: sourceFileName,
      generatedBy: 'ai',
      provenance: {
        snippet: snippetPreview,
        model_name: getCloudConfig().model,
        location: 'AI-generated from snippet',
      },
    };
  }

  if (!OLLAMA_ENABLED) throw new Error('No AI configured. Set OPENAI_API_KEY or OLLAMA_ENABLED=true.');
  const available = await isOllamaAvailable();
  if (!available) throw new Error('Ollama is not running or not available');

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

const MAX_CHUNK_CHARS_OLLAMA = 1500;
const MAX_CHUNK_CHARS_CLOUD = 5000;
const CHUNK_OVERLAP = 100;
const MAX_DOCUMENT_CHARS_OLLAMA = 1500;  // Conservative for local Ollama to prevent OOM
const MAX_DOCUMENT_CHARS_CLOUD = 20000;  // Used only for Ollama; cloud uses paragraph chunking

function chunkText(text, maxChars = MAX_CHUNK_CHARS_OLLAMA, overlap = CHUNK_OVERLAP) {
  if (!text || text.length <= maxChars) return text ? [text] : [];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > start + maxChars / 2) end = lastSpace + 1;
    }
    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
    if (start >= text.length) break;
  }
  return chunks.filter((c) => c.length > 20);
}

/**
 * Split text into chunks by paragraph boundaries. Groups small paragraphs so each chunk
 * is at most maxChunkChars. Splits any single paragraph that exceeds maxChunkChars.
 * Processes one chunk at a time to keep memory low.
 */
function chunkByParagraphs(text, maxChunkChars = MAX_CHUNK_CHARS_CLOUD) {
  if (!text || !text.trim()) return [];
  const raw = text.trim();
  const paragraphs = raw.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  if (paragraphs.length === 0) {
    if (raw.length <= maxChunkChars) return raw.length > 20 ? [raw] : [];
    return chunkText(raw, maxChunkChars, 0);
  }
  const flattened = [];
  for (const p of paragraphs) {
    if (p.length <= maxChunkChars) {
      flattened.push(p);
    } else {
      const parts = chunkText(p, maxChunkChars, 0);
      flattened.push(...parts);
    }
  }
  const chunks = [];
  let current = [];
  let currentLen = 0;
  for (const p of flattened) {
    const pLen = p.length + 2;
    if (currentLen + pLen > maxChunkChars && current.length > 0) {
      chunks.push(current.join('\n\n'));
      current = [];
      currentLen = 0;
    }
    current.push(p);
    currentLen += pLen;
  }
  if (current.length > 0) chunks.push(current.join('\n\n'));
  return chunks.filter(c => c.length > 20);
}

async function generateCardsFromChunk(snippet, sourceFileName, chunkIndex, totalChunks) {
  const truncatedSnippet = snippet.length > MAX_CHUNK_CHARS_OLLAMA
    ? snippet.substring(0, MAX_CHUNK_CHARS_OLLAMA) + '...'
    : snippet;

  const chunkContext = totalChunks > 1 ? ` (Part ${chunkIndex + 1} of ${totalChunks})` : '';

  const prompt = `Analyze this text and extract learning cards. Return a JSON array of cards. Each card: {"title":"short title","content":"cleaned text","type":"concept|action|quote|checklist|mindmap","category":"category name","tags":["tag1","tag2"]}.
Extract 1-5 meaningful cards. Skip trivial or empty content.
Return ONLY valid JSON array, no other text.

Text${chunkContext}:
${truncatedSnippet}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  let response;
  try {
    response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: true,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 400,
          stop: ['\n\n\n', '```', '---'],
        },
      }),
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(errText || `Ollama API error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Ollama returned no response body');
  }

  // Stream response to avoid OOM: accumulate only up to MAX_RESPONSE_CHARS
  const MAX_RESPONSE_CHARS = 8000;
  const MAX_BUFFER_CHARS = 20000;
  let aiResponse = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let readCount = 0;
  const maxReads = 500;
  try {
    while (aiResponse.length < MAX_RESPONSE_CHARS && readCount < maxReads) {
      const { done, value } = await reader.read();
      readCount++;
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > MAX_BUFFER_CHARS) buffer = buffer.slice(-10000);
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.response) aiResponse += data.response;
          if (data.done) break;
        } catch (_) {}
      }
    }
    reader.cancel().catch(() => {});
  } catch (e) {
    reader.cancel().catch(() => {});
    if (e.name === 'AbortError') throw new Error('Ollama request timed out');
    throw e;
  }
  if (aiResponse.length > MAX_RESPONSE_CHARS) {
    aiResponse = aiResponse.substring(0, MAX_RESPONSE_CHARS);
    console.warn(`⚠️  AI response capped at ${MAX_RESPONSE_CHARS} chars`);
  }

  console.log(`🤖 Chunk ${chunkIndex + 1}/${totalChunks}: AI response length: ${aiResponse.length} chars`);
  
  // More efficient JSON extraction - find first [ and last ]
  const firstBracket = aiResponse.indexOf('[');
  const lastBracket = aiResponse.lastIndexOf(']');
  
  if (firstBracket === -1 || lastBracket === -1 || firstBracket >= lastBracket) {
    // Try single object fallback
    const firstBrace = aiResponse.indexOf('{');
    const lastBrace = aiResponse.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      try {
        const single = JSON.parse(aiResponse.substring(firstBrace, lastBrace + 1));
        console.log('✅ Parsed single card object from AI response');
        const validTypes = ['concept', 'action', 'quote', 'checklist', 'mindmap'];
        if (single && single.title && single.content) {
          return [{
            title: String(single.title).trim().substring(0, 200),
            content: String(single.content).trim().substring(0, 9500),
            type: validTypes.includes(single.type) ? single.type : 'concept',
            category: (single.category && String(single.category).trim()) || 'General',
            tags: Array.isArray(single.tags) ? single.tags.slice(0, 10).map((t) => String(t).toLowerCase().trim()).filter(Boolean) : [],
            source: sourceFileName,
            generatedBy: 'ai',
            provenance: {
              snippet: snippet.substring(0, 500) + (snippet.length > 500 ? '...' : ''),
              model_name: OLLAMA_MODEL,
              location: `AI-generated from document${chunkContext}`,
            },
          }];
        }
      } catch (_) {}
    }
    console.warn('❌ No valid JSON found in AI response');
    throw new Error('No valid JSON array found in AI response');
  }

  const jsonStr = aiResponse.substring(firstBracket, lastBracket + 1);
  let cards;
  try {
    cards = JSON.parse(jsonStr);
  } catch (e) {
    console.error('❌ JSON parse error:', e.message);
    throw new Error('Invalid JSON in AI response');
  }
  
  if (!Array.isArray(cards)) cards = [cards].filter(Boolean);
  console.log(`✅ Parsed ${cards.length} cards from chunk ${chunkIndex + 1}/${totalChunks}`);

  const validTypes = ['concept', 'action', 'quote', 'checklist', 'mindmap'];
  const result = [];
  for (const c of cards) {
    if (!c || !c.title || !c.content) continue;
    result.push({
      title: String(c.title).trim().substring(0, 200),
      content: String(c.content).trim().substring(0, 9500),
      type: validTypes.includes(c.type) ? c.type : 'concept',
      category: (c.category && String(c.category).trim()) || 'General',
      tags: Array.isArray(c.tags) ? c.tags.slice(0, 10).map((t) => String(t).toLowerCase().trim()).filter(Boolean) : [],
      source: sourceFileName,
      generatedBy: 'ai',
      provenance: {
        snippet: snippet.substring(0, 500) + (snippet.length > 500 ? '...' : ''),
        model_name: OLLAMA_MODEL,
        location: `AI-generated from document${chunkContext}`,
      },
    });
  }
  return result;
}

async function generateCardsFromDocument(text, sourceFileName = 'document') {
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed.length < 20) {
    throw new Error('Document text is too short for AI processing');
  }

  // Cloud providers: process by paragraph so we can handle long docs without size limits
  if (useOpenAI()) {
    const available = await isOpenAIAvailable();
    if (!available) {
      const msg = cloudProviderRequiresApiKey()
        ? 'Cloud API not reachable. Check API key and URL in Settings (AI provider).'
        : 'Local AI server not reachable. Is it running at the URL in Settings (AI provider)? To use AI without local setup, switch to a cloud provider (e.g. Groq or OpenAI) in Administration → AI Settings.';
      throw new Error(msg);
    }

    // Split by paragraphs; each chunk is one or more paragraphs (max MAX_CHUNK_CHARS_CLOUD per chunk)
    const chunks = chunkByParagraphs(trimmed, MAX_CHUNK_CHARS_CLOUD);
    const totalChunks = chunks.length;
    const allCards = [];

    console.log(`🤖 Generating cards via Cloud API (${getCloudConfig().model}) - ${totalChunks} paragraph chunk(s), ${trimmed.length} chars total`);
    
    for (let i = 0; i < totalChunks; i++) {
      const chunk = chunks[i];
      if (!chunk || typeof chunk !== 'string') {
        console.warn(`⚠️  Chunk ${i + 1} empty or invalid, skipping`);
        continue;
      }
      const chunkContext = totalChunks > 1 ? ` (Part ${i + 1} of ${totalChunks})` : '';
      const maxCards = totalChunks > 1 ? 10 : 15; // More cards for single chunk, fewer per chunk for multi-chunk

      try {
        const prompt = `Analyze this text and extract learning cards. Return a JSON array of cards. Each card: {"title":"short title","content":"cleaned text with key information preserved","type":"concept|action|quote|checklist|mindmap","category":"category name","tags":["tag1","tag2"]}.
Extract up to ${maxCards} meaningful cards. Capture all important concepts, definitions, procedures, and insights. Skip trivial or empty content.
Return ONLY valid JSON array, no other text.

Text${chunkContext}:
${chunk}`;

        const content = await callOpenAIChat(prompt, 2000);
        const firstBracket = content.indexOf('[');
        const lastBracket = content.lastIndexOf(']');

        let cards = [];
        if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
          try {
            cards = JSON.parse(content.substring(firstBracket, lastBracket + 1));
          } catch (e) {
            console.warn(`⚠️  Failed to parse JSON from chunk ${i + 1}: ${e.message}`);
          }
        } else {
          // Try single object fallback
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
            try {
              const single = JSON.parse(content.substring(firstBrace, lastBrace + 1));
              if (single && single.title && single.content) cards = [single];
            } catch (_) {}
          }
        }

        const validTypes = ['concept', 'action', 'quote', 'checklist', 'mindmap'];
        const chunkCards = (Array.isArray(cards) ? cards : [cards]).filter(c => c && c.title && c.content).map(c => ({
          title: String(c.title).trim().substring(0, 200),
          content: String(c.content).trim().substring(0, 9500),
          type: validTypes.includes(c.type) ? c.type : 'concept',
          category: (c.category && String(c.category).trim()) || 'General',
          tags: Array.isArray(c.tags) ? c.tags.slice(0, 10).map(t => String(t).toLowerCase().trim()).filter(Boolean) : [],
          source: sourceFileName,
          generatedBy: 'ai',
          provenance: {
            snippet: chunk.substring(0, 500) + (chunk.length > 500 ? '...' : ''),
            model_name: getCloudConfig().model,
            location: `AI-generated from document${chunkContext}`,
          },
        }));

        console.log(`✅ Chunk ${i + 1}/${totalChunks}: ${chunkCards.length} cards`);
        allCards.push(...chunkCards);
      } catch (chunkErr) {
        console.warn(`⚠️  Chunk ${i + 1}/${totalChunks} failed: ${chunkErr.message}. Continuing with other chunks.`);
        // Continue to next chunk; return partial results at the end
      }
      if (i < totalChunks - 1) {
        await new Promise(r => setTimeout(r, 400)); // brief delay between chunks to reduce rate limits
      }
    }

    if (allCards.length === 0) throw new Error('AI could not generate cards from the document (all chunks failed or returned no cards)');
    console.log(`✅ Generated ${allCards.length} total cards via Cloud API`);
    return allCards;
  }

  // For Ollama: use conservative limits to prevent OOM
  if (!OLLAMA_ENABLED) throw new Error('No AI configured. Set OPENAI_API_KEY or OLLAMA_ENABLED=true.');
  const available = await isOllamaAvailable();
  if (!available) throw new Error('Ollama is not running or not available');

  const snippet = trimmed.length > MAX_DOCUMENT_CHARS_OLLAMA
    ? trimmed.substring(0, MAX_DOCUMENT_CHARS_OLLAMA) + '...'
    : trimmed;

  console.log(`🤖 Generating cards from first ${snippet.length} chars (Ollama)`);
  try {
    const cards = await generateCardsFromChunk(snippet, sourceFileName, 0, 1);
    if (!cards || cards.length === 0) throw new Error('AI could not generate cards from the document');
    console.log(`✅ Generated ${cards.length} cards from document`);
    return cards;
  } catch (chunkError) {
    const msg = chunkError && typeof chunkError.message === 'string' ? chunkError.message : String(chunkError);
    console.warn('AI document processing failed:', msg);
    throw chunkError instanceof Error ? chunkError : new Error(msg);
  }
}

const CLOUD_PROVIDER_LABELS = { openai: 'OpenAI', groq: 'Groq', together: 'Together', lmstudio: 'LM Studio', localai: 'LocalAI', llamacpp: 'llama.cpp', custom: 'Custom' };
/** Providers that require an API key; local (LocalAI, LM Studio, llama.cpp) do not */
const PROVIDERS_REQUIRING_API_KEY = ['openai', 'groq', 'together', 'custom'];

function cloudProviderRequiresApiKey() {
  const s = getSettings();
  const provider = (s && s.cloudProvider) || 'openai';
  return PROVIDERS_REQUIRING_API_KEY.includes(provider);
}

async function getOllamaStatus() {
  const configured = getConfiguredAIProvider();
  if (configured === 'openai') {
    const s = getSettings();
    const { apiUrl, model, apiKey } = getCloudConfig();
    const cloudLabel = CLOUD_PROVIDER_LABELS[s.cloudProvider] || s.cloudProvider || 'Cloud';
    const status = {
      provider: 'openai',
      cloudProvider: s.cloudProvider || 'openai',
      cloudLabel,
      enabled: true,
      configured: true,
      apiUrl: apiUrl.replace(/\/v1\/?$/, ''),
      model,
      available: false,
      error: null,
    };
    const requiresKey = cloudProviderRequiresApiKey();
    if (requiresKey && (!apiKey || !String(apiKey).trim())) {
      status.error = 'No API key configured. Add your API key in Settings (AI provider).';
      return status;
    }
    try {
      status.available = await isOpenAIAvailable();
      if (!status.available) {
        const label = cloudLabel || 'Cloud';
        if (requiresKey) {
          status.error = 'Cloud API not reachable. Check API key and URL in Settings (AI provider).';
        } else {
          status.error = `${label} not reachable. Is the local server running at ${status.apiUrl}? To use AI without local setup, switch to a cloud provider (e.g. Groq or OpenAI) in Administration → AI Settings.`;
        }
      }
    } catch (e) {
      status.available = false;
      const label = cloudLabel || 'Cloud';
      if (cloudProviderRequiresApiKey()) {
        status.error = e.message || 'Unknown error checking API';
      } else {
        status.error = `${label} not reachable. Is the local server running? ${e.message || ''} To use AI without local setup, switch to a cloud provider (e.g. Groq or OpenAI) in Administration → AI Settings.`.trim();
      }
    }
    return status;
  }

  const status = {
    provider: 'ollama',
    enabled: OLLAMA_ENABLED,
    configured: !!OLLAMA_API_URL && !!OLLAMA_MODEL,
    apiUrl: OLLAMA_API_URL,
    model: OLLAMA_MODEL,
    available: false,
    error: null,
  };

  if (!OLLAMA_ENABLED) {
    status.error = 'No AI configured. Set OPENAI_API_KEY for cloud AI, or OLLAMA_ENABLED=true for local Ollama.';
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
  generateCardsFromDocument,
  getOllamaStatus,
  isOllamaAvailable,
  invalidateSettingsCache,
};
