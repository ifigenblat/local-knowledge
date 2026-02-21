#!/usr/bin/env node
/**
 * Functional test: User Service endpoints via the API Gateway.
 * Requires: Gateway and User Service running (e.g. ./start-all.sh from services/).
 * Usage: node test-user-endpoints.js [gatewayUrl] [email] [password]
 * Defaults: http://localhost:8000, admin@localknowledge.local, admin123
 */

const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5002';

let token = null;
let currentUserId = null;

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
  console.log('User Service – Functional Tests (via Gateway)');
  console.log('==============================================');
  console.log(`Gateway:       ${GATEWAY}`);
  console.log(`User Service:  ${USER_SERVICE_URL} (direct health only)`);
  console.log(`Login:         ${EMAIL}`);
  console.log('');

  // 0. Health (direct to user-service) – optional, skip if unreachable
  console.log('0. GET /health (direct to user-service)');
  try {
    const healthRes = await fetch(`${USER_SERVICE_URL}/health`);
    const healthOk = healthRes.ok;
    log('GET /health (user-service)', healthOk, healthOk ? 'healthy' : `status ${healthRes.status}`);
    if (!healthOk) {
      console.log('  (User service may be behind gateway only; continuing with gateway requests.)');
    }
  } catch (e) {
    log('GET /health (user-service)', false, e.message);
    console.log('  (Start user-service: cd services/user-service && PORT=5002 npm start)');
  }

  // 1. Login via gateway
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
  if (loginRes.data?.user?.id) {
    currentUserId = loginRes.data.user.id;
  }

  // 2. GET /api/users/settings
  console.log('\n2. GET /api/users/settings');
  const settingsRes = await request('GET', '/api/users/settings');
  const settingsOk = settingsRes.ok && settingsRes.data && typeof settingsRes.data.aiProvider !== 'undefined';
  log('GET /api/users/settings', settingsOk, settingsOk ? `aiProvider: ${settingsRes.data?.aiProvider}` : (settingsRes.data?.error || settingsRes.status));
  if (!settingsOk && settingsRes.data?.error) {
    console.log('  Response:', settingsRes.data.error);
  }

  // 3. GET /api/users (list users – typically admin)
  console.log('\n3. GET /api/users (list users)');
  const listRes = await request('GET', '/api/users');
  const listOk = listRes.ok && Array.isArray(listRes.data?.users);
  log('GET /api/users', listOk, listOk ? `users: ${listRes.data?.users?.length ?? 0}` : (listRes.data?.error || listRes.status));
  if (listOk && listRes.data?.users?.length > 0 && !currentUserId) {
    currentUserId = listRes.data.users[0].id ?? listRes.data.users[0]._id;
  }

  // 4. GET /api/users?page=1&limit=5
  const listQueryRes = await request('GET', '/api/users?page=1&limit=5');
  log('GET /api/users?page=1&limit=5', listQueryRes.ok && Array.isArray(listQueryRes.data?.users), listQueryRes.ok ? `users: ${listQueryRes.data?.users?.length ?? 0}` : listQueryRes.status);

  // 5. GET /api/users/:id (get current user if we have an id)
  if (currentUserId) {
    console.log('\n4. GET /api/users/:id');
    const getRes = await request('GET', `/api/users/${currentUserId}`);
    const getOk = getRes.ok && (getRes.data?.id === currentUserId || getRes.data?._id === currentUserId);
    log('GET /api/users/:id', getOk, getOk ? getRes.data?.name || getRes.data?.email : (getRes.data?.error || getRes.status));
  } else {
    console.log('\n4. GET /api/users/:id – skipped (no user id from login/list)');
  }

  // 6. PUT /api/users/settings (superadmin only – may get 403) – save/restore to leave env unchanged
  console.log('\n5. PUT /api/users/settings (superadmin only)');
  const settingsBefore = settingsRes.ok ? { ...settingsRes.data } : null;
  const putSettingsRes = await request('PUT', '/api/users/settings', {
    aiProvider: 'openai',
    cloudProvider: 'openai',
    cloudApiUrl: 'https://api.openai.com/v1',
    cloudModel: 'gpt-4o-mini',
  });
  const putSettingsOk = putSettingsRes.ok || putSettingsRes.status === 403;
  const isForbidden = putSettingsRes.status === 403;
  log('PUT /api/users/settings', putSettingsOk, isForbidden ? '403 (expected if not superadmin)' : (putSettingsRes.ok ? '200' : String(putSettingsRes.status)));

  // Restore settings if we changed them (superadmin and had previous state)
  if (putSettingsRes.ok && settingsBefore) {
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
    const restoreRes = await request('PUT', '/api/users/settings', restoreBody);
    if (restoreRes.ok) {
      log('Restore settings (cleanup)', true);
    }
  }

  console.log('');
  console.log('Done. All user API endpoints exercised.');
}

run().catch((err) => {
  console.error('Run failed:', err);
  process.exit(1);
});
