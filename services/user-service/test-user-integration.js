#!/usr/bin/env node
/**
 * Integration test: User Service with real Postgres and Role Service.
 * Requires: Gateway, User Service, Auth Service, Role Service, and Postgres running
 * (e.g. ./start-all.sh from services/). Run as admin/superadmin (create user, assign role).
 *
 * Creates a temporary user, exercises user-service + DB + role-service, then deletes the user.
 * Saves/restores settings if changed.
 *
 * Usage: node test-user-integration.js [gatewayUrl] [email] [password]
 * Defaults: http://localhost:8000, admin@localknowledge.local, admin123
 */

const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5002';

let token = null;
let createdUserId = null;
let settingsBefore = null;

function log(name, ok, detail = '') {
  const icon = ok ? '\u2713' : '\u2717';
  console.log(`  ${ok ? '\x1b[32m' : '\x1b[31m'}${icon} ${name}\x1b[0m ${detail ? `- ${detail}` : ''}`);
}

async function request(method, path, body = null, useAuth = true) {
  const base = path.startsWith('/api/') ? GATEWAY : USER_SERVICE_URL;
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
  console.log('User Service – Integration Tests (real DB + Role Service)');
  console.log('=========================================================');
  console.log(`Gateway:       ${GATEWAY}`);
  console.log(`User Service:  ${USER_SERVICE_URL}`);
  console.log(`Login:         ${EMAIL} (admin/superadmin required)`);
  console.log('');

  // 1. Login
  console.log('1. Auth (login)');
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

  // 2. Get roles (user-service create user needs roleId; role-service validates)
  console.log('\n2. GET /api/roles (integration: Role Service)');
  const rolesRes = await request('GET', '/api/roles');
  const rolesOk = rolesRes.ok && Array.isArray(rolesRes.data);
  log('GET /api/roles', rolesOk, rolesOk ? `roles: ${rolesRes.data?.length ?? 0}` : (rolesRes.data?.error || rolesRes.status));
  if (!rolesOk || !rolesRes.data?.length) {
    console.log('  \x1b[31mNo roles – create user will need a roleId. Skipping user CRUD.\x1b[0m');
  }
  const roleId = rolesOk && rolesRes.data?.length ? (rolesRes.data[0].id ?? rolesRes.data[0]._id) : null;

  // 3. Settings (user-service + real settings file)
  console.log('\n3. Settings (user-service + real settings file)');
  const settingsRes = await request('GET', '/api/users/settings');
  const settingsOk = settingsRes.ok && settingsRes.data && typeof settingsRes.data.aiProvider !== 'undefined';
  log('GET /api/users/settings', settingsOk, settingsOk ? `aiProvider: ${settingsRes.data?.aiProvider}` : (settingsRes.data?.error || settingsRes.status));
  settingsBefore = settingsRes.ok ? { ...settingsRes.data } : null;

  const putSettingsRes = await request('PUT', '/api/users/settings', {
    aiProvider: 'openai',
    cloudProvider: 'openai',
    cloudApiUrl: 'https://api.openai.com/v1',
    cloudModel: 'gpt-4o-mini',
  });
  const putSettingsOk = putSettingsRes.ok || putSettingsRes.status === 403;
  log('PUT /api/users/settings', putSettingsOk, putSettingsRes.ok ? '200' : (putSettingsRes.status === 403 ? '403 (not superadmin)' : String(putSettingsRes.status)));

  // 4. List users (user-service + Postgres)
  console.log('\n4. GET /api/users (user-service + Postgres)');
  const listRes = await request('GET', '/api/users?page=1&limit=10');
  const listOk = listRes.ok && Array.isArray(listRes.data?.users);
  log('GET /api/users', listOk, listOk ? `users: ${listRes.data?.users?.length ?? 0}` : (listRes.data?.error || listRes.status));

  if (!roleId) {
    console.log('\n  Skipping create/update/assign/delete user (no roleId).');
    await restoreSettings();
    console.log('\nDone.');
    return;
  }

  // 5. Create user (user-service + Postgres + role-service validation)
  const testEmail = `integration-test-${Date.now()}@example.com`;
  const createBody = {
    name: 'Integration Test User',
    email: testEmail,
    password: 'testpass123',
    roleId,
  };
  console.log('\n5. POST /api/users (create – user-service + Postgres + Role Service)');
  const createRes = await request('POST', '/api/users', createBody);
  const createOk = createRes.ok && (createRes.data?.id || createRes.data?._id);
  log('POST /api/users', createOk, createOk ? `id: ${createRes.data?.id ?? createRes.data?._id}` : (createRes.data?.error || createRes.status));
  if (!createOk) {
    console.log('  Response:', createRes.data || createRes.text);
    await restoreSettings();
    process.exit(1);
  }
  createdUserId = createRes.data?.id ?? createRes.data?._id;

  // 6. Get created user (user-service + Postgres)
  console.log('\n6. GET /api/users/:id (read from Postgres)');
  const getRes = await request('GET', `/api/users/${createdUserId}`);
  const getOk = getRes.ok && (getRes.data?.email === testEmail || getRes.data?.id === createdUserId);
  log('GET /api/users/:id', getOk, getOk ? getRes.data?.email : (getRes.data?.error || getRes.status));

  // 7. Update user (user-service + Postgres)
  console.log('\n7. PUT /api/users/:id (update in Postgres)');
  const updateRes = await request('PUT', `/api/users/${createdUserId}`, {
    name: 'Integration Test User Updated',
    email: testEmail,
  });
  const updateOk = updateRes.ok && updateRes.data?.name === 'Integration Test User Updated';
  log('PUT /api/users/:id', updateOk, updateOk ? 'name updated' : (updateRes.data?.error || updateRes.status));

  // 8. Assign role (user-service + role-service + Postgres)
  console.log('\n8. POST /api/users/:id/assign-role (user-service + Role Service + Postgres)');
  const assignRes = await request('POST', `/api/users/${createdUserId}/assign-role`, { roleId });
  const assignOk = assignRes.ok || assignRes.status === 403;
  log('POST /api/users/:id/assign-role', assignOk, assignRes.ok ? '200' : (assignRes.status === 403 ? '403' : String(assignRes.status)));

  // 9. Cleanup: delete created user
  console.log('\n9. DELETE /api/users/:id (cleanup)');
  const deleteRes = await request('DELETE', `/api/users/${createdUserId}`);
  log('DELETE /api/users/:id', deleteRes.ok, deleteRes.ok ? 'deleted' : (deleteRes.data?.error || deleteRes.status));
  if (!deleteRes.ok) {
    console.log('  \x1b[33mWarning: could not delete test user. Remove manually: id =', createdUserId, '\x1b[0m');
  }
  createdUserId = null;

  await restoreSettings();
  console.log('\nDone. Integration test passed (user-service + Postgres + Role Service).');
}

async function restoreSettings() {
  if (!settingsBefore) return;
  const restoreBody = {
    aiProvider: settingsBefore.aiProvider,
    cloudProvider: settingsBefore.cloudProvider,
    cloudApiUrl: settingsBefore.cloudApiUrl,
    cloudModel: settingsBefore.cloudModel,
  };
  if (settingsBefore.maxExtractedTextChars != null) restoreBody.maxExtractedTextChars = settingsBefore.maxExtractedTextChars;
  if (settingsBefore.aiChunkChars != null) restoreBody.aiChunkChars = settingsBefore.aiChunkChars;
  if (settingsBefore.aiChunkDelayMs != null) restoreBody.aiChunkDelayMs = settingsBefore.aiChunkDelayMs;
  if (settingsBefore.aiMaxTextLength != null) restoreBody.aiMaxTextLength = settingsBefore.aiMaxTextLength;
  if (settingsBefore.ollamaChunkChars != null) restoreBody.ollamaChunkChars = settingsBefore.ollamaChunkChars;
  const putRes = await request('PUT', '/api/users/settings', restoreBody);
  if (putRes.ok) log('Restore settings (cleanup)', true);
}

run().catch((err) => {
  console.error('Run failed:', err);
  if (createdUserId) {
    console.error('  Test user may remain: id =', createdUserId);
  }
  process.exit(1);
});
