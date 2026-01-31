const express = require('express');
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
  // Monolith backend: preview, AI, process-uploaded-file (upload receives files, backend processes)
  backend: process.env.BACKEND_SERVICE_URL || 'http://localhost:5010',
};

// Middleware: do NOT use express.json() / urlencoded globally - they consume the
// request body stream, so proxied POST/PUT requests would have an empty body
// and cause socket hang up or 400 on the backend. Proxy streams the raw request.
app.use(cors());

// Root route
app.get('/', (req, res) => {
  res.json({ 
    service: 'api-gateway',
    message: 'LocalKnowledge API Gateway',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      services: '/services/health',
      auth: '/api/auth',
      users: '/api/users',
      roles: '/api/roles',
      cards: '/api/cards',
      collections: '/api/collections',
      upload: '/api/upload (upload-service)',
      files: '/api/files',
      preview: '/api/preview',
      ai: '/api/ai',
      uploads: '/uploads'
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
        const isBackend = serviceName === 'cards' || serviceName === 'collections' || serviceName === 'upload' || serviceName === 'preview' || serviceName === 'ai';
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
    }
  },
}));

// Backend (monolith) routes: collections, upload, preview, AI, static uploads
const backendPathRewrite = (path, req) => req.originalUrl || path;
const backendProxyOptions = {
  target: SERVICES.backend,
  changeOrigin: true,
  timeout: 30000,
  proxyTimeout: 30000,
  pathRewrite: backendPathRewrite,
  onError: (err, req, res) => {
    console.error('Error proxying to backend:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Backend unavailable',
        message: 'Backend (collections/upload) may be down. Start it: cd server && PORT=5010 npm run dev',
        service: 'backend'
      });
    }
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user) {
      proxyReq.setHeader('X-User-Id', req.user.id);
      proxyReq.setHeader('X-User-Email', req.user.email);
    }
  },
};
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
    }
  },
}));
// Upload service: receives multipart, saves file, calls backend to process
app.use('/api/upload', validateToken, createProxyMiddleware({
  target: SERVICES.upload,
  changeOrigin: true,
  timeout: 60000,
  proxyTimeout: 60000,
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
    }
  },
}));
app.use('/api/files', validateToken, createProxyMiddleware({ ...backendProxyOptions }));
app.use('/api/preview', validateToken, createProxyMiddleware({ ...backendProxyOptions }));
app.use('/api/ai', validateToken, createProxyMiddleware({ ...backendProxyOptions }));
app.use('/uploads', validateToken, createProxyMiddleware({
  ...backendProxyOptions,
  timeout: 60000,
  proxyTimeout: 60000,
}));

// Service health checks (no auth)
app.get('/services/health', async (req, res) => {
  const axios = require('axios');
  const health = {};

  for (const [name, url] of Object.entries(SERVICES)) {
    const healthPath = (name === 'backend') ? `${url}/api/health` : `${url}/health`;
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

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 Proxying to services:`);
  Object.entries(SERVICES).forEach(([name, url]) => {
    console.log(`   ${name}: ${url}`);
  });
});

module.exports = app;
