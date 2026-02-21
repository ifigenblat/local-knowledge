#!/usr/bin/env node
/**
 * Functional test: Role Service endpoints via the API Gateway.
 * Requires: Gateway and Role Service running (e.g. ./start-all.sh from services/).
 * Usage: node test-role-endpoints.js [gatewayUrl] [email] [password]
 * Defaults: http://localhost:8000, admin@localknowledge.local, admin123
 */

const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';

const ROLE_SERVICE_URL = process.env.ROLE_SERVICE_URL || 'http://localhost:5003';

let token = null;

function log(name, ok, detail = '') {
  const icon = ok ? '\u2713' : '\u2717';
  console.log(`  ${ok ? '\x1b[32m' : '\x1b[31m'}${icon} ${name}\x1b[0m ${detail ? `- ${detail}` : ''}`);
}

async function request(method, path, body = null, useAuth = true) {
  const base = path.startsWith('/api/') ? GATEWAY : ROLE_SERVICE_URL;
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
  console.log('Role Service – Functional Tests (via Gateway)');
  console.log('=============================================');
  console.log(`Gateway:       ${GATEWAY}`);
  console.log(`Role Service:  ${ROLE_SERVICE_URL}`);
  console.log(`Login:         ${EMAIL}`);
  console.log('');

  try {
    const healthRes = await fetch(`${ROLE_SERVICE_URL}/health`);
    log('GET /health (role-service)', healthRes.ok, healthRes.ok ? 'healthy' : `status ${healthRes.status}`);
  } catch (e) {
    log('GET /health (role-service)', false, e.message);
  }

  console.log('\n1. Auth (login via gateway)');
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

  console.log('\n2. GET /api/roles');
  const listRes = await request('GET', '/api/roles');
  const listOk = listRes.ok && Array.isArray(listRes.data);
  log('GET /api/roles', listOk, listOk ? `roles: ${listRes.data?.length ?? 0}` : (listRes.data?.error || listRes.status));

  const roleId = listOk && listRes.data?.length ? (listRes.data[0].id ?? listRes.data[0]._id) : null;

  if (roleId) {
    console.log('\n3. GET /api/roles/:id');
    const getRes = await request('GET', `/api/roles/${roleId}`);
    log('GET /api/roles/:id', getRes.ok && getRes.data, getRes.ok ? getRes.data?.name : (getRes.data?.error || getRes.status));

    console.log('\n4. GET /api/roles/name/admin');
    const nameRes = await request('GET', '/api/roles/name/admin');
    log('GET /api/roles/name/admin', nameRes.ok && nameRes.data?.name === 'admin', nameRes.ok ? nameRes.data?.name : (nameRes.data?.error || nameRes.status));
  }

  console.log('\nDone. All role API endpoints exercised.');
}

run().catch((err) => {
  console.error('Run failed:', err);
  process.exit(1);
});
