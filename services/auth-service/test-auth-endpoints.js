#!/usr/bin/env node
/**
 * Functional test: Auth Service endpoints via the API Gateway.
 * Requires: Gateway and Auth Service running (e.g. ./start-all.sh from services/).
 * Usage: node test-auth-endpoints.js [gatewayUrl] [email] [password]
 * Defaults: http://localhost:8000, admin@localknowledge.local, admin123
 */

const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

let token = null;

function log(name, ok, detail = '') {
  const icon = ok ? '\u2713' : '\u2717';
  console.log(`  ${ok ? '\x1b[32m' : '\x1b[31m'}${icon} ${name}\x1b[0m ${detail ? `- ${detail}` : ''}`);
}

async function request(method, path, body = null, useAuth = false) {
  const base = path.startsWith('/api/') ? GATEWAY : AUTH_SERVICE_URL;
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth && token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {}
  return { ok: res.ok, status: res.status, data, text };
}

async function run() {
  console.log('Auth Service – Functional Tests (via Gateway)');
  console.log('=============================================');
  console.log(`Gateway:       ${GATEWAY}`);
  console.log(`Auth Service:  ${AUTH_SERVICE_URL} (direct health only)`);
  console.log(`Login:         ${EMAIL}`);
  console.log('');

  // 0. Health (direct to auth-service)
  console.log('0. GET /health (direct to auth-service)');
  try {
    const healthRes = await fetch(`${AUTH_SERVICE_URL}/health`);
    const healthOk = healthRes.ok;
    log('GET /health (auth-service)', healthOk, healthOk ? 'healthy' : `status ${healthRes.status}`);
  } catch (e) {
    log('GET /health (auth-service)', false, e.message);
  }

  // 1. Login via gateway
  console.log('\n1. POST /api/auth/login');
  const loginRes = await request('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD }, false);
  if (!loginRes.ok) {
    console.log('  \x1b[31m\u2717 Login failed\x1b[0m - cannot continue. Status:', loginRes.status, loginRes.data?.error || loginRes.text);
    process.exit(1);
  }
  token = loginRes.data?.token;
  if (!token) {
    console.log('  \x1b[31m\u2717 No token in login response\x1b[0m');
    process.exit(1);
  }
  log('Login', true);

  // 2. Validate token
  console.log('\n2. GET /api/auth/validate');
  const validateRes = await request('GET', '/api/auth/validate', null, true);
  log('Validate token', validateRes.ok, validateRes.ok ? 'valid' : validateRes.data?.error || validateRes.status);

  // 3. Forgot password (just check it returns 200, does not send email without config)
  console.log('\n3. POST /api/auth/forgot-password');
  const forgotRes = await request('POST', '/api/auth/forgot-password', { email: EMAIL }, false);
  log('Forgot password (returns message)', forgotRes.ok, forgotRes.status);

  console.log('\nDone.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
