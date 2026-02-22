const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const CONTENT_SERVICE_URL = process.env.CONTENT_SERVICE_URL || 'http://localhost:5007';
const CARD_SERVICE_URL = process.env.CARD_SERVICE_URL || 'http://localhost:5004';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5008';

const CONFIG_PATH = process.env.CONFIG_PATH || path.resolve(__dirname, '../../../config');
const SETTINGS_FILE = path.join(CONFIG_PATH, 'settings.json');
const PROCESSING_CACHE_MS = 60000;
let processingCache = null;
let processingCacheTime = 0;

function getProcessingSettings() {
  const now = Date.now();
  if (processingCache !== null && now - processingCacheTime < PROCESSING_CACHE_MS) {
    return processingCache;
  }
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      const maxExtracted = typeof raw.maxExtractedTextChars === 'number' ? raw.maxExtractedTextChars : parseInt(process.env.MAX_EXTRACTED_TEXT_CHARS, 10) || 500000;
      const chunkChars = typeof raw.aiChunkChars === 'number' ? raw.aiChunkChars : parseInt(process.env.AI_CHUNK_CHARS, 10) || 6000;
      const delayMs = typeof raw.aiChunkDelayMs === 'number' ? raw.aiChunkDelayMs : parseInt(process.env.AI_CHUNK_DELAY_MS, 10) || 300;
      processingCache = { maxExtractedTextChars: maxExtracted, aiChunkChars: chunkChars, aiChunkDelayMs: delayMs };
      processingCacheTime = now;
      return processingCache;
    }
  } catch (e) {
    // ignore
  }
  processingCache = {
    maxExtractedTextChars: parseInt(process.env.MAX_EXTRACTED_TEXT_CHARS, 10) || 500000,
    aiChunkChars: parseInt(process.env.AI_CHUNK_CHARS, 10) || 6000,
    aiChunkDelayMs: parseInt(process.env.AI_CHUNK_DELAY_MS, 10) || 300,
  };
  processingCacheTime = now;
  return processingCache;
}

/**
 * Split text into chunks by paragraph boundaries. Each chunk <= maxChunkChars.
 * Ensures we never send a full large document to the AI service in one request.
 */
function chunkTextForAI(text, maxChunkChars = 6000) {
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed.length <= maxChunkChars) return trimmed.length > 20 ? [trimmed] : [];
  const paragraphs = trimmed.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  if (paragraphs.length === 0) {
    // No paragraph breaks: split by size so we still process the entire document
    const chunks = [];
    for (let start = 0; start < trimmed.length; start += maxChunkChars) {
      const chunk = trimmed.substring(start, start + maxChunkChars);
      if (chunk.length > 20) chunks.push(chunk);
    }
    return chunks;
  }
  const chunks = [];
  let current = [];
  let currentLen = 0;
  for (const p of paragraphs) {
    const pLen = p.length + 2;
    if (currentLen + pLen > maxChunkChars && current.length > 0) {
      chunks.push(current.join('\n\n'));
      current = [];
      currentLen = 0;
    }
    if (p.length > maxChunkChars) {
      for (let i = 0; i < p.length; i += maxChunkChars) {
        chunks.push(p.substring(i, i + maxChunkChars));
      }
      current = [];
      currentLen = 0;
      continue;
    }
    current.push(p);
    currentLen += pLen;
  }
  if (current.length > 0) chunks.push(current.join('\n\n'));
  return chunks.filter(c => c.length > 20);
}

// Upload directory (default: services/uploads when run from services/upload-service)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), '..', 'uploads');

function requireUser(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: 'No token provided',
      message: 'Call via API Gateway (port 8000) with Authorization: Bearer <token>.',
    });
  }
  next();
}

router.use(requireUser);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.isAbsolute(UPLOAD_DIR) ? UPLOAD_DIR : path.resolve(UPLOAD_DIR);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/json',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Single file: save, extract via content-service (or AI), create cards via card-service
router.post('/', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Upload request received:', {
      hasFile: !!req.file,
      useAI: req.body.useAI,
      userId: req.user?.id,
    });
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const file = req.file;
    const userId = req.user.id;
    const filePath = path.resolve(file.path);
    const useAI = req.body.useAI === 'true' || req.body.useAI === true;

    console.log(`Processing file: ${file.originalname}, useAI: ${useAI}`);

    let processedContent;

    if (useAI) {
      // AI flow: extract raw text, send to AI to generate cards
      try {
        console.log('🤖 Starting AI flow - extracting text...');
        const extractRes = await fetch(`${CONTENT_SERVICE_URL.replace(/\/$/, '')}/extract-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath,
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
          }),
        });
        const extractData = await extractRes.json().catch(() => ({}));
        if (!extractRes.ok) {
          console.error('❌ Text extraction failed:', extractData);
          throw new Error(extractData.message || extractData.error || 'Content extraction failed');
        }
        let text = (extractData.text || '').trim();
        console.log(`✅ Extracted ${text.length} characters`);
        
        if (!text || text.length < 20) {
          throw new Error('No text could be extracted from the file for AI processing');
        }
        const limits = getProcessingSettings();
        if (text.length > limits.maxExtractedTextChars) {
          throw new Error(
            `File text is too large for AI processing (${text.length} chars, max ${limits.maxExtractedTextChars}). ` +
            'Use rule-based extraction (turn off "Use AI") or split the file.'
          );
        }

        const chunks = chunkTextForAI(text, limits.aiChunkChars);
        const chunkCharsSum = chunks.reduce((sum, c) => sum + c.length, 0);
        const fullCoverage = chunkCharsSum >= text.length - 50; // allow tiny trim variance
        console.log(
          `🤖 Processing ${chunks.length} chunk(s) via AI (max ${limits.aiChunkChars} chars/request). ` +
          `Extracted ${text.length} chars → chunks sum ${chunkCharsSum} chars. ${fullCoverage ? '✓ Full document covered.' : '⚠ Chunk sum < extracted (check chunking).'}`
        );
        const allItems = [];
        let failedChunks = 0;
        let lastChunkError = null; // keep first/last failure reason for "all failed" response
        const aiBase = AI_SERVICE_URL.replace(/\/$/, '');
        // Per-chunk timeout: AI service may process one chunk as multiple sub-chunks (e.g. Ollama 4×1.5k), each up to 5 min
        const timeoutMs = 1200000; // 20 min per chunk so multi-sub-chunk (e.g. Ollama) can finish
        const retryDelayMs = 3000;

        for (let i = 0; i < chunks.length; i++) {
          let chunkSucceeded = false;
          let lastErr = null;
          for (let attempt = 0; attempt <= 1 && !chunkSucceeded; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            try {
              const aiRes = await fetch(`${aiBase}/generate-cards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: chunks[i],
                  sourceFileName: file.originalname,
                }),
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              const aiData = await aiRes.json().catch(() => ({}));
              if (!aiRes.ok) {
                lastErr = new Error(aiData.message || aiData.error || 'AI card generation failed');
                if (attempt === 0) {
                  console.warn(`⚠️ AI chunk ${i + 1}/${chunks.length} failed (will retry once):`, lastErr.message);
                  await new Promise(r => setTimeout(r, retryDelayMs));
                  continue;
                }
                failedChunks++;
                if (!lastChunkError) lastChunkError = lastErr.message;
                console.error(`❌ AI chunk ${i + 1}/${chunks.length} failed after retry:`, lastErr.message);
                break;
              }
              const items = aiData.items || [];
              allItems.push(...items);
              console.log(`✅ Chunk ${i + 1}/${chunks.length}: ${items.length} cards (total ${allItems.length})`);
              chunkSucceeded = true;
            } catch (err) {
              clearTimeout(timeoutId);
              lastErr = err;
              if (attempt === 0) {
                console.warn(`⚠️ AI chunk ${i + 1}/${chunks.length} error (will retry once):`, err.message);
                await new Promise(r => setTimeout(r, retryDelayMs));
              } else {
                failedChunks++;
                if (!lastChunkError) lastChunkError = err.message || String(err);
                console.error(`❌ AI chunk ${i + 1}/${chunks.length} failed after retry:`, err.message);
              }
            }
          }
          if (i < chunks.length - 1) {
            await new Promise(r => setTimeout(r, limits.aiChunkDelayMs));
          }
        }

        processedContent = allItems;
        if (allItems.length === 0 && chunks.length > 0) {
          console.error('❌ AI flow: all chunks failed. Last error:', lastChunkError);
          if (fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (_) {}
          }
          const baseMsg = 'The AI could not generate cards from this file (all sections failed).';
          const hint = lastChunkError
            ? ` Reason: ${lastChunkError} Try a shorter file, smaller "Chunk size sent to AI" (e.g. 3000), or increase AI timeout (AI_CHAT_TIMEOUT_MS in ai-service).`
            : ' Try a shorter file, reduce "Chunk size sent to AI" in AI Settings, or use a faster model.';
          return res.status(502).json({
            error: 'AI processing failed',
            message: baseMsg + hint,
            detail: lastChunkError || undefined,
            service: 'upload-service',
          });
        }
        if (failedChunks > 0) {
          req._partialAIFailure = { failedChunks, totalChunks: chunks.length };
        }
        console.log(`✅ AI generated ${processedContent.length} cards total` + (failedChunks > 0 ? ` (${failedChunks} chunk(s) failed)` : ''));
      } catch (err) {
        console.error('❌ AI flow error:', err.message);
        if (fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch (_) {}
        }
        const aiBase = (AI_SERVICE_URL || 'http://localhost:5008').replace(/\/$/, '');
        const isUnreachable = err.message === 'fetch failed' || err.cause?.code === 'ECONNREFUSED' || err.cause?.code === 'ETIMEDOUT' || err.name === 'AbortError';
        const message = isUnreachable
          ? `AI service is not running at ${aiBase}. From the services folder run: npm run start:ai  (or ./scripts/start-ai-service.sh). You can also turn off "Use AI" on the Upload page for rule-based processing.`
          : err.message;
        return res.status(502).json({
          error: useAI ? 'AI processing failed' : 'Content extraction failed',
          message,
          service: 'upload-service',
        });
      }
    } else {
      // Rule-based flow: extract and create cards via content-service
      try {
        const contentRes = await fetch(`${CONTENT_SERVICE_URL.replace(/\/$/, '')}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath,
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
          }),
        });
        const contentData = await contentRes.json().catch(() => ({}));
        if (!contentRes.ok) {
          throw new Error(contentData.message || contentData.error || `Content service ${contentRes.status}`);
        }
        processedContent = contentData.items || [];
      } catch (err) {
        if (fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch (_) {}
        }
        return res.status(502).json({
          error: 'Content extraction failed',
          message: err.message,
          service: 'upload-service',
        });
      }
    }

    if (!processedContent || processedContent.length === 0) {
      if (fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (_) {}
      }
      return res.status(400).json({ error: 'No content could be extracted from the file' });
    }

    // 2. Create cards via card-service
    const cardBody = {
      filePath,
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      items: processedContent,
      category: req.body.category,
      tags: req.body.tags,
      model_name: req.body.model_name,
      prompt_version: req.body.prompt_version,
      confidence_score: req.body.confidence_score,
    };
    const cardRes = await fetch(`${CARD_SERVICE_URL.replace(/\/$/, '')}/api/cards/from-processed-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-User-Email': req.user.email || '',
      },
      body: JSON.stringify(cardBody),
    });
    const data = await cardRes.json().catch(() => ({}));
    if (!cardRes.ok) {
      if (fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (_) {}
      }
      return res.status(cardRes.status).json(data);
    }
    if (req._partialAIFailure) {
      data.partialAIFailure = true;
      data.partialAIFailureMessage = `Some sections could not be processed (${req._partialAIFailure.failedChunks} of ${req._partialAIFailure.totalChunks} sections failed). Cards were created from the rest.`;
    }
    res.status(cardRes.status).json(data);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    console.error('Upload service POST / error:', error);
    res.status(500).json({
      error: error.message || 'Error processing file',
      service: 'upload-service',
    });
  }
});

// Multiple files: save each, extract, create cards
router.post('/multiple', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const userId = req.user.id;
    const useAI = req.body.useAI === 'true' || req.body.useAI === true;
    const results = [];
    for (const file of req.files) {
      try {
        const filePath = path.resolve(file.path);
        let processedContent;

        if (useAI) {
          const extractRes = await fetch(`${CONTENT_SERVICE_URL.replace(/\/$/, '')}/extract-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath,
              originalName: file.originalname,
              filename: file.filename,
              mimetype: file.mimetype,
            }),
          });
          const extractData = await extractRes.json().catch(() => ({}));
          let text = extractRes.ok ? (extractData.text || '').trim() : '';
          if (text.length < 20) {
            processedContent = [];
          } else {
            const limitsMulti = getProcessingSettings();
            if (text.length > limitsMulti.maxExtractedTextChars) {
              processedContent = [];
              results.push({
                file: file.originalname,
                success: false,
                error: `File too large for AI (${text.length} chars, max ${limitsMulti.maxExtractedTextChars}). Use rule-based or split.`,
              });
              continue;
            }
            const chunks = chunkTextForAI(text, limitsMulti.aiChunkChars);
            const allItems = [];
            const aiBase = AI_SERVICE_URL.replace(/\/$/, '');
            for (let i = 0; i < chunks.length; i++) {
              const aiRes = await fetch(`${aiBase}/generate-cards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: chunks[i], sourceFileName: file.originalname }),
              });
              const aiData = await aiRes.json().catch(() => ({}));
              if (aiRes.ok && Array.isArray(aiData.items)) allItems.push(...aiData.items);
              if (i < chunks.length - 1) await new Promise(r => setTimeout(r, limitsMulti.aiChunkDelayMs));
            }
            processedContent = allItems;
          }
        } else {
          const contentRes = await fetch(`${CONTENT_SERVICE_URL.replace(/\/$/, '')}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath,
              originalName: file.originalname,
              filename: file.filename,
              mimetype: file.mimetype,
            }),
          });
          const contentData = await contentRes.json().catch(() => ({}));
          processedContent = contentRes.ok ? (contentData.items || []) : [];
        }

        if (processedContent.length === 0) {
          if (fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (_) {}
          }
          results.push({ file: file.originalname, success: false, error: 'No content extracted' });
          continue;
        }

        const cardRes = await fetch(`${CARD_SERVICE_URL.replace(/\/$/, '')}/api/cards/from-processed-file`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
            'X-User-Email': req.user.email || '',
          },
          body: JSON.stringify({
            filePath,
            originalName: file.originalname,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
            items: processedContent,
            category: req.body.category,
            tags: req.body.tags,
            model_name: req.body.model_name,
            prompt_version: req.body.prompt_version,
            confidence_score: req.body.confidence_score,
          }),
        });
        const data = await cardRes.json().catch(() => ({}));
        if (cardRes.ok) {
          results.push({
            file: file.originalname,
            success: true,
            created: data.details?.created ?? 0,
            updated: data.details?.updated ?? 0,
            total: (data.details?.created ?? 0) + (data.details?.updated ?? 0),
            cards: data.cards || [],
          });
        } else {
          if (fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (_) {}
          }
          results.push({
            file: file.originalname,
            success: false,
            error: data.error || data.message || cardRes.statusText,
          });
        }
      } catch (err) {
        if (fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch (_) {}
        }
        results.push({ file: file.originalname, success: false, error: err.message });
      }
    }
    res.status(201).json({
      message: 'Batch upload completed',
      results,
    });
  } catch (error) {
    console.error('Upload service POST /multiple error:', error);
    res.status(500).json({
      error: error.message || 'Error processing files',
      service: 'upload-service',
    });
  }
});

// Progress (stub)
router.get('/progress/:id', (req, res) => {
  res.json({ progress: 0, status: 'not implemented' });
});

module.exports = router;
