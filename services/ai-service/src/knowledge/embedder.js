/**
 * Embedding generation: OpenAI-compatible /embeddings or Ollama /api/embed.
 * Use EMBED_* env vars for embeddings (can differ from chat). LM Studio does not support embeddings.
 */

const path = require('path');
const fs = require('fs');

const CONFIG_PATH = process.env.CONFIG_PATH || path.resolve(__dirname, '../../../config');
const SETTINGS_FILE = path.join(CONFIG_PATH, 'settings.json');
const OLLAMA_API_URL = (process.env.OLLAMA_API_URL || 'http://localhost:11434').replace(/\/$/, '');
const OLLAMA_ENABLED = process.env.OLLAMA_ENABLED === 'true';

const EMBED_DIMS = 1536; // OpenAI text-embedding-3-small; Ollama nomic-embed-text is 768 (we accept both)

function getSettings() {
  try {
    return fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) : {};
  } catch {
    return {};
  }
}

function useOllamaForEmbeddings() {
  const s = getSettings();
  if (s.aiProvider === 'ollama') return OLLAMA_ENABLED;
  if (process.env.EMBED_VIA_OLLAMA === 'true') return true;
  return false;
}

function getEmbedConfig() {
  const s = getSettings();
  const useOllama = useOllamaForEmbeddings();
  if (useOllama) {
    return { provider: 'ollama', model: process.env.EMBED_MODEL || 'nomic-embed-text', url: OLLAMA_API_URL };
  }
  const embedUrlSet = Boolean(process.env.EMBED_API_URL && process.env.EMBED_API_URL.trim());
  const embedKeySet = Boolean(process.env.EMBED_API_KEY && process.env.EMBED_API_KEY.trim());
  const apiUrl = (process.env.EMBED_API_URL || s.cloudApiUrl || process.env.OPENAI_API_URL || 'https://api.openai.com/v1').toString().replace(/\/$/, '');
  const apiKey = (process.env.EMBED_API_KEY || s.cloudApiKey || process.env.OPENAI_API_KEY || '').trim();
  const isGroq = /groq\.com/i.test(apiUrl);
  const isLocal = /localhost|127\.0\.0\.1/i.test(apiUrl);
  if (isLocal && !embedUrlSet) {
    return {
      provider: 'unsupported',
      message: 'LM Studio and local chat servers do not support embeddings. For the Knowledge feature, set EMBED_API_URL and EMBED_API_KEY in ai-service .env (e.g. OpenAI: EMBED_API_URL=https://api.openai.com/v1, EMBED_API_KEY=sk-...; or Groq with EMBED_MODEL=nomic-embed-text-v1.5). Or use Ollama: ollama pull nomic-embed-text and OLLAMA_ENABLED=true.',
    };
  }
  const model = process.env.EMBED_MODEL || (isGroq ? 'nomic-embed-text-v1.5' : 'text-embedding-3-small');
  return { provider: 'openai', apiKey, apiUrl, model };
}

async function embedViaOllama(text, config) {
  const truncated = typeof text === 'string' ? text.substring(0, 8000) : '';
  if (!truncated.trim()) throw new Error('Text is required for embedding');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(`${config.url}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ model: config.model, input: truncated }),
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(errBody || `Ollama embeddings error: ${res.status}`);
    }
    const data = await res.json();
    const emb = data.embeddings?.[0] ?? data.embedding;
    const embedding = Array.isArray(emb) ? emb : null;
    if (!embedding || embedding.length === 0) throw new Error('Invalid Ollama embedding response');
    return embedding;
  } catch (e) {
    clearTimeout(timeout);
    if (e.message?.includes('model') && e.message?.includes('not found')) {
      throw new Error(`Ollama embedding model "${config.model}" not found. Run: ollama pull ${config.model}`);
    }
    throw e;
  }
}

async function embedViaOpenAI(text, config) {
  const truncated = typeof text === 'string' ? text.substring(0, 8000) : '';
  if (!truncated.trim()) throw new Error('Text is required for embedding');
  if (!config.apiKey) {
    throw new Error(
      'Embeddings need an API key. LM Studio and similar local chat servers do not support embeddings. Set EMBED_API_KEY and EMBED_API_URL to a cloud provider (e.g. OpenAI) in ai-service .env, or use Ollama with "ollama pull nomic-embed-text" and set OLLAMA_ENABLED=true.'
    );
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${config.apiUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({ model: config.model, input: truncated }),
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      let msg = errBody;
      try {
        const j = JSON.parse(errBody);
        msg = j.error?.message || j.message || errBody;
      } catch (_) {}
      const isLocal = /localhost|127\.0\.0\.1/i.test(config.apiUrl);
      if (isLocal && (msg?.includes('does not exist') || msg?.includes('model'))) {
        msg = `LM Studio and similar local chat servers do not support embeddings. Use EMBED_API_URL and EMBED_API_KEY in ai-service .env to point to OpenAI or Groq, or use Ollama: "ollama pull nomic-embed-text" and OLLAMA_ENABLED=true.`;
      } else if (/groq\.com/i.test(config.apiUrl) && msg?.toLowerCase().includes('model')) {
        msg = `Groq embedding error: ${msg} Try EMBED_MODEL=nomic-embed-text-v1.5 in ai-service .env and restart.`;
      }
      throw new Error(msg);
    }
    const data = await res.json();
    const embedding = data.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) throw new Error('Invalid embedding response');
    return embedding;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

async function embedText(text) {
  const config = getEmbedConfig();
  if (config.provider === 'unsupported') {
    throw new Error(config.message);
  }
  if (config.provider === 'ollama') {
    return embedViaOllama(text, config);
  }
  return embedViaOpenAI(text, config);
}

function getEmbedModel() {
  const c = getEmbedConfig();
  if (c.provider === 'ollama') return c.model;
  if (c.provider === 'unsupported') return 'none';
  return c.model;
}

module.exports = { embedText, getEmbedModel, EMBED_DIMS };
