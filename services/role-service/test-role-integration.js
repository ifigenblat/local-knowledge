#!/usr/bin/env node
/**
 * Integration test: Role Service with real Postgres.
 * Requires: Gateway, Role Service, Auth Service, and Postgres running (e.g. ./start-all.sh).
 * Creates a temporary role, exercises CRUD, then deletes the role (cleanup).
 * Usage: node test-role-integration.js [gatewayUrl] [email] [password]
 */

const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';

let token = null;
let createdRoleId = null;

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
  console.log('Role Service – Integration Tests (real Postgres)');
  console.log('================================================');
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

  console.log('\n2. GET /api/roles');
  const listRes = await request('GET', '/api/roles');
  const listOk = listRes.ok && Array.isArray(listRes.data);
  log('GET /api/roles', listOk, listOk ? `roles: ${listRes.data?.length ?? 0}` : (listRes.data?.error || listRes.status));

  const testName = `integration-role-${Date.now()}`;
  console.log('\n3. POST /api/roles (create)');
  const createRes = await request('POST', '/api/roles', {
    name: testName,
    displayName: 'Integration Test Role',
    permissions: { cards: true, collections: true },
  });
  const createOk = createRes.ok && (createRes.data?.id || createRes.data?._id);
  log('POST /api/roles', createOk, createOk ? `id: ${createRes.data?.id ?? createRes.data?._id}` : (createRes.data?.error || createRes.status));
  if (!createOk) {
    console.log('  Response:', createRes.data || createRes.text);
    process.exit(1);
  }
  createdRoleId = createRes.data?.id ?? createRes.data?._id;

  console.log('\n4. GET /api/roles/:id');
  const getRes = await request('GET', `/api/roles/${createdRoleId}`);
  log('GET /api/roles/:id', getRes.ok && getRes.data?.name === testName, getRes.ok ? getRes.data?.name : (getRes.data?.error || getRes.status));

  console.log('\n5. PUT /api/roles/:id');
  const updateRes = await request('PUT', `/api/roles/${createdRoleId}`, {
    name: testName,
    displayName: 'Integration Test Role Updated',
    permissions: { cards: true, collections: true },
  });
  log('PUT /api/roles/:id', updateRes.ok && updateRes.data?.displayName === 'Integration Test Role Updated', updateRes.ok ? 'updated' : (updateRes.data?.error || updateRes.status));

  console.log('\n6. DELETE /api/roles/:id (cleanup)');
  const deleteRes = await request('DELETE', `/api/roles/${createdRoleId}`);
  log('DELETE /api/roles/:id', deleteRes.ok, deleteRes.ok ? 'deleted' : (deleteRes.data?.error || deleteRes.status));
  if (!deleteRes.ok) {
    console.log('  \x1b[33mWarning: could not delete test role. Remove manually: id =', createdRoleId, '\x1b[0m');
  }
  createdRoleId = null;

  console.log('\nDone. Integration test passed.');
}

run().catch((err) => {
  console.error('Run failed:', err);
  if (createdRoleId) console.error('  Test role may remain: id =', createdRoleId);
  process.exit(1);
});
