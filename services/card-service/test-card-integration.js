#!/usr/bin/env node
/**
 * Integration test: Card Service with real DB (via gateway).
 * Requires: Gateway, Auth, Card service and Postgres running.
 * Creates a temporary card, GET/PUT, then deletes (cleanup).
 * Usage: node test-card-integration.js [gatewayUrl] [email] [password]
 */

const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';

let token = null;
let createdCardId = null;

function log(name, ok, detail = '') {
  const icon = ok ? '\u2713' : '\u2717';
  console.log(`  ${ok ? '\x1b[32m' : '\x1b[31m'}${icon} ${name}\x1b[0m ${detail ? `- ${detail}` : ''}`);
}

async function request(method, path, body = null, useAuth = true) {
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
  console.log('Card Service – Integration Tests (real Postgres)');
  console.log('==================================================');
  console.log(`Gateway: ${GATEWAY}`);
  console.log(`Login:   ${EMAIL}`);
  console.log('');

  console.log('1. Login');
  const loginRes = await request('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD }, false);
  if (!loginRes.ok) {
    console.log('  \x1b[31m\u2717 Login failed\x1b[0m');
    process.exit(1);
  }
  token = loginRes.data?.token;
  if (!token) {
    console.log('  \x1b[31m\u2717 No token\x1b[0m');
    process.exit(1);
  }
  log('Login', true);

  console.log('\n2. GET /api/cards');
  const listRes = await request('GET', '/api/cards');
  const listOk = listRes.ok && (listRes.data?.cards !== undefined || Array.isArray(listRes.data));
  log('GET /api/cards', listOk, listOk ? 'ok' : (listRes.data?.error || listRes.status));

  const title = `integration-card-${Date.now()}`;
  console.log('\n3. POST /api/cards (create)');
  const createRes = await request('POST', '/api/cards', {
    title,
    content: 'Integration test card content here.',
    category: 'General',
  });
  const createOk = createRes.ok && (createRes.data?.id || createRes.data?._id);
  log('POST /api/cards', createOk, createOk ? `id: ${createRes.data?.id ?? createRes.data?._id}` : (createRes.data?.error || createRes.status));
  if (!createOk) {
    console.log('  Response:', createRes.data || createRes.text);
    process.exit(1);
  }
  createdCardId = createRes.data?.id ?? createRes.data?._id;

  console.log('\n4. GET /api/cards/:id');
  const getRes = await request('GET', `/api/cards/${createdCardId}`);
  log('GET /api/cards/:id', getRes.ok && getRes.data?.title === title, getRes.ok ? getRes.data?.title : (getRes.data?.error || getRes.status));

  console.log('\n5. PUT /api/cards/:id');
  const updateRes = await request('PUT', `/api/cards/${createdCardId}`, {
    title: title + '-updated',
    content: 'Updated content',
    category: 'General',
  });
  log('PUT /api/cards/:id', updateRes.ok && updateRes.data?.title === title + '-updated', updateRes.ok ? 'updated' : (updateRes.data?.error || updateRes.status));

  console.log('\n6. DELETE /api/cards/:id (cleanup)');
  const deleteRes = await request('DELETE', `/api/cards/${createdCardId}`);
  log('DELETE /api/cards/:id', deleteRes.ok, deleteRes.ok ? 'deleted' : (deleteRes.data?.error || deleteRes.status));
  if (!deleteRes.ok) {
    console.log('  \x1b[33mWarning: could not delete test card. Remove manually: id =', createdCardId, '\x1b[0m');
  }
  createdCardId = null;

  console.log('\nDone. Integration test passed.');
}

run().catch((err) => {
  console.error('Run failed:', err);
  if (createdCardId) console.error('  Test card may remain: id =', createdCardId);
  process.exit(1);
});
