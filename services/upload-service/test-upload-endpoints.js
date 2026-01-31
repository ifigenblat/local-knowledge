#!/usr/bin/env node
/**
 * Test upload service endpoints via the API Gateway.
 * Usage: node test-upload-endpoints.js [gatewayUrl] [email] [password]
 * Defaults: http://localhost:8000, admin@localknowledge.local, admin123
 * Requires: gateway, auth, upload-service, and backend (for processing) running.
 */

const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';

let token = null;

function log(name, ok, detail = '') {
  const icon = ok ? '\u2713' : '\u2717';
  console.log(`  ${ok ? '\x1b[32m' : '\x1b[31m'}${icon} ${name}\x1b[0m ${detail ? `- ${detail}` : ''}`);
}

async function request(method, path, body = null, useAuth = true) {
  const url = path.startsWith('http') ? path : `${GATEWAY}${path}`;
  const headers = {};
  if (useAuth && token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    if (body && typeof body.append === 'function') {
      opts.body = body;
      // FormData: do not set Content-Type so fetch sets multipart boundary
    } else if (typeof body === 'string') {
      opts.body = body;
      headers['Content-Type'] = 'application/json';
    } else {
      opts.body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }
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
  console.log('Upload Service Endpoint Tests (via Gateway)');
  console.log('============================================');
  console.log(`Gateway: ${GATEWAY}`);
  console.log(`Login:   ${EMAIL}`);
  console.log('');

  // 1. Login
  console.log('1. Auth');
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

  // 2. Upload single file (multipart)
  console.log('\n2. POST /api/upload (single file)');
  const form = new FormData();
  const fileContent = `# Test Section

This is meaningful content for a test card. It has more than ten characters so it will not be filtered out.`;
  form.append('file', new Blob([fileContent], { type: 'text/plain' }), 'test-upload.txt');
  form.append('category', 'General');
  const uploadRes = await request('POST', '/api/upload', form);
  const hasCards = uploadRes.ok && (uploadRes.data?.cards?.length >= 0 || uploadRes.data?.details != null);
  const detail = uploadRes.ok
    ? `created: ${uploadRes.data?.details?.created ?? 0}, updated: ${uploadRes.data?.details?.updated ?? 0}`
    : (uploadRes.data?.error || uploadRes.data?.message || uploadRes.status);
  log('POST /api/upload', uploadRes.ok && (uploadRes.status === 201 || uploadRes.status === 200), detail);
  if (!uploadRes.ok && uploadRes.data) {
    console.log('  Response:', uploadRes.data);
  }

  // 3. Upload progress (stub)
  console.log('\n3. GET /api/upload/progress/:id');
  const progressRes = await request('GET', '/api/upload/progress/test-id');
  log('GET /api/upload/progress/:id', progressRes.ok, progressRes.ok ? 'stub' : progressRes.status);

  console.log('\nDone.\n');
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
