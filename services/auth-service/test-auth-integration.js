#!/usr/bin/env node
/**
 * Integration test: Auth flows with real DB and services.
 * Requires: Gateway, Auth, User, Role services and DBs running.
 * Usage: node test-auth-integration.js [gatewayUrl] [email] [password]
 * Defaults: http://localhost:8000, admin@localknowledge.local, admin123
 */

const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';

let token = null;

function log(name, ok, detail = '') {
  const icon = ok ? '\u2713' : '\u2717';
  console.log(`  ${ok ? '\x1b[32m' : '\x1b[31m'}${icon} ${name}\x1b[0m ${detail ? `- ${detail}` : ''}`);
}

async function request(method, path, body = null, useAuth = false) {
  const url = path.startsWith('http') ? path : `${GATEWAY}${path}`;
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
  console.log('Auth Service – Integration Tests');
  console.log('================================');
  console.log(`Gateway: ${GATEWAY}`);
  console.log(`Login:   ${EMAIL}`);
  console.log('');

  // 1. Login (real DB)
  console.log('1. POST /api/auth/login');
  const loginRes = await request('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD }, false);
  if (!loginRes.ok) {
    console.log('  \x1b[31m\u2717 Login failed\x1b[0m -', loginRes.status, loginRes.data?.error || loginRes.text);
    process.exit(1);
  }
  token = loginRes.data?.token;
  if (!token) {
    console.log('  \x1b[31m\u2717 No token\x1b[0m');
    process.exit(1);
  }
  log('Login', true);

  // 2. Validate (real DB lookup)
  console.log('\n2. GET /api/auth/validate');
  const validateRes = await request('GET', '/api/auth/validate', null, true);
  if (!validateRes.ok) {
    console.log('  \x1b[31m\u2717 Validate failed\x1b[0m -', validateRes.status, validateRes.data?.error);
    process.exit(1);
  }
  log('Validate', true, validateRes.data?.user?.email);

  // 3. Invalid token
  console.log('\n3. GET /api/auth/validate (invalid token)');
  const badRes = await request('GET', '/api/auth/validate', null, false);
  const badReq = await fetch(`${GATEWAY}/api/auth/validate`, {
    headers: { Authorization: 'Bearer invalid-token' },
  });
  const badData = await badReq.json().catch(() => ({}));
  log('Invalid token returns 401', badReq.status === 401, badReq.status);

  console.log('\nDone.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
