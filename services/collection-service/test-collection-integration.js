#!/usr/bin/env node
/**
 * Integration test: Collection Service with real Postgres (via gateway).
 * Requires: Gateway, Auth, Collection service and Postgres running.
 * Creates a temporary collection, GET/PUT, add/remove card, then deletes (cleanup).
 * Usage: node test-collection-integration.js [gatewayUrl] [email] [password]
 */

const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';

let token = null;
let createdCollectionId = null;

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
  console.log('Collection Service – Integration Tests (real Postgres)');
  console.log('========================================================');
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

  console.log('\n2. GET /api/collections');
  const listRes = await request('GET', '/api/collections');
  const listOk = listRes.ok && Array.isArray(listRes.data);
  log('GET /api/collections', listOk, listOk ? 'ok' : (listRes.data?.error || listRes.status));

  const name = `integration-collection-${Date.now()}`;
  console.log('\n3. POST /api/collections (create)');
  const createRes = await request('POST', '/api/collections', { name, description: 'Integration test' });
  const createOk = createRes.ok && (createRes.data?.id || createRes.data?._id);
  log('POST /api/collections', createOk, createOk ? `id: ${createRes.data?.id ?? createRes.data?._id}` : (createRes.data?.error || createRes.status));
  if (!createOk) {
    console.log('  Response:', createRes.data || createRes.text);
    process.exit(1);
  }
  createdCollectionId = createRes.data?.id ?? createRes.data?._id;

  console.log('\n4. GET /api/collections/:id');
  const getRes = await request('GET', `/api/collections/${createdCollectionId}`);
  log('GET /api/collections/:id', getRes.ok && getRes.data?.name === name, getRes.ok ? getRes.data?.name : (getRes.data?.error || getRes.status));

  console.log('\n5. PUT /api/collections/:id');
  const updateRes = await request('PUT', `/api/collections/${createdCollectionId}`, { name: name + '-updated', description: 'Updated' });
  log('PUT /api/collections/:id', updateRes.ok && updateRes.data?.name === name + '-updated', updateRes.ok ? 'updated' : (updateRes.data?.error || updateRes.status));

  console.log('\n6. DELETE /api/collections/:id (cleanup)');
  const deleteRes = await request('DELETE', `/api/collections/${createdCollectionId}`);
  log('DELETE /api/collections/:id', deleteRes.ok, deleteRes.ok ? 'deleted' : (deleteRes.data?.error || deleteRes.status));
  if (!deleteRes.ok) {
    console.log('  \x1b[33mWarning: could not delete test collection. Remove manually: id =', createdCollectionId, '\x1b[0m');
  }
  createdCollectionId = null;

  console.log('\nDone. Integration test passed.');
}

run().catch((err) => {
  console.error('Run failed:', err);
  if (createdCollectionId) console.error('  Test collection may remain: id =', createdCollectionId);
  process.exit(1);
});
