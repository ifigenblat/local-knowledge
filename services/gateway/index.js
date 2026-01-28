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
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Apply auth middleware to protected routes
app.use('/api/*', validateToken);

// Proxy middleware factory
const createServiceProxy = (serviceName, target) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {
      [`^/api/${serviceName}`]: `/api/${serviceName}`,
    },
    onError: (err, req, res) => {
      console.error(`Error proxying to ${serviceName}:`, err.message);
      res.status(502).json({ 
        error: `Service ${serviceName} unavailable`,
        service: serviceName
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward original headers
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.id);
        proxyReq.setHeader('X-User-Email', req.user.email);
      }
    }
  });
};

// Auth Service routes (no auth required for login/register)
app.use('/api/auth', (req, res, next) => {
  if (req.path === '/register' || req.path === '/login' || req.path === '/forgot-password' || req.path === '/reset-password' || req.path === '/validate') {
    return createServiceProxy('auth', SERVICES.auth)(req, res, next);
  }
  validateToken(req, res, () => {
    createServiceProxy('auth', SERVICES.auth)(req, res, next);
  });
});

// User Service routes
app.use('/api/users', createServiceProxy('users', SERVICES.user));

// Role Service routes
app.use('/api/roles', createServiceProxy('roles', SERVICES.role));

// Service health checks (no auth)
app.get('/services/health', async (req, res) => {
  const axios = require('axios');
  const health = {};

  for (const [name, url] of Object.entries(SERVICES)) {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 2000 });
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
  res.status(404).json({ error: 'Route not found' });
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
