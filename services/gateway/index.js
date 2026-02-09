const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Service URLs
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
  user: process.env.USER_SERVICE_URL || 'http://localhost:5002',
  role: process.env.ROLE_SERVICE_URL || 'http://localhost:5003',
  cards: process.env.CARD_SERVICE_URL || 'http://localhost:5004',
  collections: process.env.COLLECTION_SERVICE_URL || 'http://localhost:5005',
  upload: process.env.UPLOAD_SERVICE_URL || 'http://localhost:5006',
  content: process.env.CONTENT_SERVICE_URL || 'http://localhost:5007',
  ai: process.env.AI_SERVICE_URL || 'http://localhost:5008',
  email: process.env.EMAIL_SERVICE_URL || 'http://localhost:5009',
  preview: process.env.PREVIEW_SERVICE_URL || 'http://localhost:5011',
  files: process.env.FILES_SERVICE_URL || 'http://localhost:5012',
  uploadsStatic: process.env.UPLOADS_STATIC_SERVICE_URL || 'http://localhost:5013',
};

// Middleware: do NOT use express.json() / urlencoded globally - they consume the
// request body stream, so proxied POST/PUT requests would have an empty body.
app.use(cors());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const entry = { ts: new Date().toISOString(), method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start };
    console.log(JSON.stringify(entry));
  });
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    service: 'api-gateway',
    message: 'LocalKnowledge API Gateway',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      services: '/services/health',
      auth: '/api/auth',
      users: '/api/users',
      roles: '/api/roles',
      cards: '/api/cards',
      collections: '/api/collections',
      upload: '/api/upload (upload-service)',
      content: '/api/content (content-processing-service)',
      files: '/api/files (files-service)',
      preview: '/api/preview (preview-service)',
      ai: '/api/ai (ai-service)',
      email: '/api/email (email-service)',
      uploads: '/uploads (uploads-static-service)'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'api-gateway',
    status: 'healthy',
    services: Object.keys(SERVICES),
    timestamp: new Date().toISOString()
  });
});

// JWT validation middleware
const validateToken = async (req, res, next) => {
  // Skip auth for public routes
  const publicRoutes = ['/api/auth/register', '/api/auth/login', '/api/auth/forgot-password', '/api/auth/reset-password'];
  if (publicRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Proxy middleware factory
const createServiceProxy = (serviceName, target) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    timeout: 30000, // 30 second timeout
    proxyTimeout: 30000,
    pathRewrite: {
      [`^/api/${serviceName}`]: `/api/${serviceName}`,
    },
    onError: (err, req, res) => {
      console.error(`Error proxying to ${serviceName}:`, err.message);
      if (!res.headersSent) {
        const isBackend = serviceName === 'cards' || serviceName === 'collections' || serviceName === 'upload' || serviceName === 'ai';
        res.status(502).json({ 
          error: `Service ${serviceName} unavailable`,
          message: isBackend ? 'Backend (cards/collections) may be down. Start it with: cd server && PORT=5010 npm run dev' : `Service ${serviceName} unavailable`,
          service: serviceName
        });
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward original headers
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.id);
        proxyReq.setHeader('X-User-Email', req.user.email);
        if (req.user.role?.name) proxyReq.setHeader('X-User-Role', req.user.role.name);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Log slow requests
      if (proxyRes.statusCode >= 500) {
        console.error(`Service ${serviceName} returned error:`, proxyRes.statusCode);
      }
    }
  });
};

// Auth Service routes (no auth required for login/register)
app.use('/api/auth', (req, res, next) => {
  // req.path is relative to the mount point, so '/login' not '/api/auth/login'
  const publicPaths = ['/register', '/login', '/forgot-password', '/reset-password', '/validate'];
  const requestPath = req.path; // This will be '/login', '/register', etc.
  const isPublicRoute = publicPaths.some(path => {
    return requestPath === path || requestPath === path + '/' || requestPath.startsWith(path + '/');
  });
  
  if (isPublicRoute) {
    // Public route - proxy directly without auth
    return createServiceProxy('auth', SERVICES.auth)(req, res, next);
  }
  // Protected auth routes need token
  validateToken(req, res, () => {
    createServiceProxy('auth', SERVICES.auth)(req, res, next);
  });
});

// User Service routes (require auth)
app.use('/api/users', validateToken, createServiceProxy('users', SERVICES.user));

// Role Service routes (require auth)
app.use('/api/roles', validateToken, createServiceProxy('roles', SERVICES.role));

// Card Service routes (require auth) - cards CRUD + regenerate (regenerate proxied to backend by card-service)
app.use('/api/cards', validateToken, createProxyMiddleware({
  target: SERVICES.cards,
  changeOrigin: true,
  timeout: 30000,
  proxyTimeout: 30000,
  pathRewrite: (path, req) => req.originalUrl || path,
  onError: (err, req, res) => {
    console.error('Error proxying to card service:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Card service unavailable',
        message: 'Card service may be down. Start it: cd services/card-service && PORT=5004 npm run dev',
        service: 'cards'
      });
    }
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user) {
      proxyReq.setHeader('X-User-Id', req.user.id);
      proxyReq.setHeader('X-User-Email', req.user.email);
      if (req.user.role?.name) proxyReq.setHeader('X-User-Role', req.user.role.name);
    }
  },
}));

// Collection Service routes (require auth)
app.use('/api/collections', validateToken, createProxyMiddleware({
  target: SERVICES.collections,
  changeOrigin: true,
  timeout: 30000,
  proxyTimeout: 30000,
  pathRewrite: (path, req) => req.originalUrl || path,
  onError: (err, req, res) => {
    console.error('Error proxying to collection service:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Collection service unavailable',
        message: 'Collection service may be down. Start it: cd services/collection-service && PORT=5005 npm start',
        service: 'collections'
      });
    }
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user) {
      proxyReq.setHeader('X-User-Id', req.user.id);
      proxyReq.setHeader('X-User-Email', req.user.email);
      if (req.user.role?.name) proxyReq.setHeader('X-User-Role', req.user.role.name);
    }
  },
}));
// Upload service: receives multipart, saves file, may call AI for card generation (long-running)
app.use('/api/upload', validateToken, createProxyMiddleware({
  target: SERVICES.upload,
  changeOrigin: true,
  timeout: 300000,
  proxyTimeout: 300000,
  pathRewrite: (path, req) => req.originalUrl || path,
  onError: (err, req, res) => {
    console.error('Error proxying to upload service:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Upload service unavailable',
        message: 'Upload service may be down. Start it: cd services/upload-service && PORT=5006 npm start',
        service: 'upload',
      });
    }
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user) {
      proxyReq.setHeader('X-User-Id', req.user.id);
      proxyReq.setHeader('X-User-Email', req.user.email);
      if (req.user.role?.name) proxyReq.setHeader('X-User-Role', req.user.role.name);
    }
  },
}));
app.use('/api/content', validateToken, createProxyMiddleware({
  target: SERVICES.content,
  changeOrigin: true,
  timeout: 60000,
  proxyTimeout: 60000,
  pathRewrite: (path, req) => (req.originalUrl || path).replace(/^\/api\/content/, ''),
  onError: (err, req, res) => {
    console.error('Error proxying to content service:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Content service unavailable',
        message: 'Content service may be down. Start it: cd services/content-processing-service && PORT=5007 npm start',
        service: 'content',
      });
    }
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user) {
      proxyReq.setHeader('X-User-Id', req.user.id);
      proxyReq.setHeader('X-User-Email', req.user.email);
      if (req.user.role?.name) proxyReq.setHeader('X-User-Role', req.user.role.name);
    }
  },
}));
app.use('/api/email', validateToken, createProxyMiddleware({
  target: SERVICES.email,
  changeOrigin: true,
  timeout: 15000,
  proxyTimeout: 15000,
  pathRewrite: (path, req) => (req.originalUrl || path).replace(/^\/api\/email/, ''),
  onError: (err, req, res) => {
    console.error('Error proxying to email service:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Email service unavailable',
        message: 'Email service may be down. Start it: cd services/email-service && PORT=5009 npm start',
        service: 'email',
      });
    }
  },
}));
app.use('/api/files', validateToken, createProxyMiddleware({
  target: SERVICES.files,
  changeOrigin: true,
  timeout: 30000,
  proxyTimeout: 30000,
  pathRewrite: (path, req) => {
    const url = req.originalUrl || path;
    const [base, qs] = url.split('?');
    const newPath = base.replace(/^\/api\/files\/?/, '/') || '/';
    return qs ? `${newPath}?${qs}` : newPath;
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user) {
      proxyReq.setHeader('X-User-Id', req.user.id);
      proxyReq.setHeader('X-User-Email', req.user.email);
      if (req.user.role?.name) proxyReq.setHeader('X-User-Role', req.user.role.name);
    }
  },
  onError: (err, req, res) => {
    console.error('Error proxying to files service:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Files service unavailable',
        message: 'Files service may be down. Start it: cd services/files-service && PORT=5012 npm start',
        service: 'files',
      });
    }
  },
}));
app.use('/api/preview', validateToken, createProxyMiddleware({
  target: SERVICES.preview,
  changeOrigin: true,
  timeout: 30000,
  proxyTimeout: 30000,
  pathRewrite: (path, req) => (req.originalUrl || path).replace(/^\/api\/preview/, ''),
  onError: (err, req, res) => {
    console.error('Error proxying to preview service:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Preview service unavailable',
        message: 'Preview service may be down. Start it: cd services/preview-service && PORT=5011 npm start',
        service: 'preview',
      });
    }
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user) {
      proxyReq.setHeader('X-User-Id', req.user.id);
      proxyReq.setHeader('X-User-Email', req.user.email);
      if (req.user.role?.name) proxyReq.setHeader('X-User-Role', req.user.role.name);
    }
  },
}));
app.use('/api/ai', validateToken, createProxyMiddleware({
  target: SERVICES.ai,
  changeOrigin: true,
  timeout: 180000,
  proxyTimeout: 180000,
  pathRewrite: (path, req) => (req.originalUrl || path).replace(/^\/api\/ai/, ''),
  onError: (err, req, res) => {
    console.error('Error proxying to AI service:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'AI service unavailable',
        message: 'AI service may be down. Start it: cd services/ai-service && PORT=5008 npm start',
        service: 'ai',
      });
    }
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user) {
      proxyReq.setHeader('X-User-Id', req.user.id);
      proxyReq.setHeader('X-User-Email', req.user.email);
      if (req.user.role?.name) proxyReq.setHeader('X-User-Role', req.user.role.name);
    }
  },
}));
app.use('/uploads', validateToken, createProxyMiddleware({
  target: SERVICES.uploadsStatic,
  changeOrigin: true,
  timeout: 60000,
  proxyTimeout: 60000,
  pathRewrite: (path, req) => req.originalUrl || path,
  onError: (err, req, res) => {
    console.error('Error proxying to uploads-static:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Uploads static service unavailable',
        message: 'Start it: cd services/uploads-static-service && PORT=5013 npm start',
        service: 'uploads-static',
      });
    }
  },
}));

// Run local AI install/start script (superadmin only). Uses scripts in services/scripts/local-ai/.
const ALLOWED_ACTIONS = {
  install_ollama: 'install-ollama.sh',
  start_localai: 'start-localai.sh',
  start_llamacpp: 'start-llamacpp.sh',
  download_llamacpp_model: 'download-llamacpp-model.sh',
};
const LONG_TIMEOUT_MS = 300000; // 5 min for download
const SERVICES_DIR = path.resolve(__dirname, '..');

app.post('/api/admin/run-local-ai-setup', express.json(), validateToken, async (req, res) => {
  if (req.user.role?.name !== 'superadmin') {
    return res.status(403).json({ error: 'Only Super Administrator can run local AI setup' });
  }
  const { action, port } = req.body || {};
  const scriptName = typeof action === 'string' ? ALLOWED_ACTIONS[action] : undefined;
  if (!scriptName) {
    return res.status(400).json({ error: 'Invalid action. Use: install_ollama, start_localai, start_llamacpp, download_llamacpp_model' });
  }
  const isLongRunning = action === 'download_llamacpp_model';
  const timeoutMs = isLongRunning ? LONG_TIMEOUT_MS : 120000;
  const scriptPath = path.join(SERVICES_DIR, 'scripts', 'local-ai', scriptName);
  const fs = require('fs');
  if (!fs.existsSync(scriptPath)) {
    return res.status(400).json({ error: `Script not found: ${scriptPath}` });
  }
  const portNum = port != null ? parseInt(Number(port), 10) : null;
  if (port != null && (Number.isNaN(portNum) || portNum < 1024 || portNum > 65535)) {
    return res.status(400).json({ error: 'Port must be between 1024 and 65535' });
  }
  const env = { ...process.env };
  if (portNum != null) env.PORT = String(portNum);
  // Ensure Docker and common tools are on PATH when gateway runs from GUI or systemd
  const pathExtra = ['/usr/local/bin', '/opt/homebrew/bin'].filter(p => p && !(env.PATH || '').includes(p));
  if (pathExtra.length) env.PATH = [env.PATH, ...pathExtra].filter(Boolean).join(':');
  return new Promise((resolve) => {
    const child = spawn('bash', [scriptPath], {
      env,
      cwd: SERVICES_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      if (!res.headersSent) {
        res.status(408).json({
          ok: false,
          error: isLongRunning ? 'Download timed out (5 min)' : 'Script timed out (2 min)',
          stdout: stdout.slice(-2000),
          stderr: stderr.slice(-2000),
        });
        resolve();
      }
    }, timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      if (res.headersSent) return resolve();
      const out = stdout.slice(-8000);
      const err = stderr.slice(-8000);
      const errorMsg = code !== 0
        ? (stderr.trim() || stdout.trim()).slice(-600) || `Script exited with code ${code}`
        : undefined;
      res.status(200).json({
        ok: code === 0,
        code: code ?? signal,
        stdout: out,
        stderr: err,
        ...(code !== 0 && { error: errorMsg }),
      });
      resolve();
    });
    child.on('error', (err) => {
      clearTimeout(timeout);
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: err.message, stdout: '', stderr: '' });
        resolve();
      }
    });
  });
});

// Prometheus-style metrics (service health as gauge)
app.get('/metrics', async (req, res) => {
  const axios = require('axios');
  const lines = ['# HELP localknowledge_service_up Service health (1=up, 0=down)', '# TYPE localknowledge_service_up gauge'];
  for (const [name, url] of Object.entries(SERVICES)) {
    try {
      await axios.get(`${url}/health`, { timeout: 2000 });
      lines.push(`localknowledge_service_up{service="${name}"} 1`);
    } catch {
      lines.push(`localknowledge_service_up{service="${name}"} 0`);
    }
  }
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(lines.join('\n') + '\n');
});

// Service health checks (no auth)
app.get('/services/health', async (req, res) => {
  const axios = require('axios');
  const health = {};

  for (const [name, url] of Object.entries(SERVICES)) {
    const healthPath = `${url}/health`;
    try {
      const response = await axios.get(healthPath, { timeout: 2000 });
      health[name] = {
        status: 'healthy',
        data: response.data
      };
    } catch (error) {
      health[name] = {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  res.json(health);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found', message: 'Route not found. If you expect /api/cards or /api/collections, ensure gateway and services (card-service, collection-service) are running.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    service: 'api-gateway'
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 Proxying to services:`);
  Object.entries(SERVICES).forEach(([name, url]) => {
    console.log(`   ${name}: ${url}`);
  });
});

function gracefulShutdown(signal) {
  console.log(`\n${signal} received, shutting down...`);
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
