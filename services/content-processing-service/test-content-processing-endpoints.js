#!/usr/bin/env node
/**
 * Test Content Processing Service endpoints.
 * Run: node test-content-processing-endpoints.js
 * Requires: Content Processing Service on port 5007 (or CONTENT_SERVICE_URL).
 * For /process you need a real file path on disk; for /extract we upload a small text file.
 */

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:8000';
const CONTENT_SERVICE = process.env.CONTENT_SERVICE_URL || 'http://localhost:5007';
const EMAIL = process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.env.TEST_PASSWORD || 'admin123';

async function login() {
  const res = await fetch(`${GATEWAY}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.token || data.accessToken;
}

async function request(method, url, body, token) {
  const opts = { method, headers: {} };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.body = body;
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

async function run() {
  console.log('Content Processing Service – endpoint tests\n');
  console.log('Gateway:', GATEWAY);
  console.log('Content Service (direct):', CONTENT_SERVICE);
  console.log('');

  let token;
  try {
    token = await login();
    console.log('✓ Login OK');
  } catch (e) {
    console.error('✗ Login failed:', e.message);
    process.exit(1);
  }

  // 1. Health (direct to service)
  console.log('\n1. GET /health (direct to content service)');
  const healthRes = await fetch(`${CONTENT_SERVICE}/health`);
  const healthOk = healthRes.ok;
  console.log(healthOk ? '✓ Health OK' : '✗ Health failed:', healthRes.status);
  if (!healthOk) {
    console.error('  Start Content Processing Service: cd services/content-processing-service && PORT=5007 npm start');
    process.exit(1);
  }

  // 2. POST /extract (multipart) – via gateway so we send token
  console.log('\n2. POST /extract (multipart file via gateway)');
  const form = new FormData();
  const content = '# Test Section\n\nThis is meaningful content for a test card. It has more than ten characters so it will not be filtered out.';
  form.append('file', new Blob([content], { type: 'text/plain' }), 'test-extract.txt');
  const extractUrl = `${GATEWAY}/api/content/extract`;
  const extractRes = await request('POST', extractUrl, form, token);
  if (extractRes.ok && Array.isArray(extractRes.data?.items)) {
    console.log('✓ Extract OK, items:', extractRes.data.items.length);
    if (extractRes.data.items.length > 0) {
      const first = extractRes.data.items[0];
      console.log('  First item title:', first.title?.substring(0, 50));
    }
  } else {
    console.log('✗ Extract failed:', extractRes.status, extractRes.data);
  }

  // 3. POST /process (JSON with filePath) – only works if you have a real file path
  console.log('\n3. POST /process (JSON filePath) – skipped (no test file path)');
  console.log('   To test: POST to /api/content/process with body: { filePath, originalName, filename }');

  console.log('\nDone.\n');
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
