#!/usr/bin/env node
/**
 * Test Preview Service endpoints.
 * Run: node test-preview-endpoints.js
 * Requires: Preview Service on 5011, Gateway on 8000 (for auth).
 */

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:8000';
const PREVIEW_SERVICE = process.env.PREVIEW_SERVICE_URL || 'http://localhost:5011';
const EMAIL = process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.env.TEST_PASSWORD || 'admin123';

async function login() {
  const res = await fetch(`${GATEWAY}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return data.token || data.accessToken;
}

async function run() {
  console.log('Preview Service – endpoint tests\n');
  console.log('Gateway:', GATEWAY);
  console.log('Preview Service (direct):', PREVIEW_SERVICE);
  console.log('');

  let token;
  try {
    token = await login();
    console.log('✓ Login OK');
  } catch (e) {
    console.error('✗ Login failed:', e.message);
    process.exit(1);
  }

  // 1. Health (direct)
  console.log('\n1. GET /health (direct)');
  const healthRes = await fetch(`${PREVIEW_SERVICE}/health`);
  console.log(healthRes.ok ? '✓ Health OK' : '✗ Health failed:', healthRes.status);
  if (!healthRes.ok) {
    console.error('  Start: cd services/preview-service && PORT=5011 npm start');
    process.exit(1);
  }

  // 2. Status (direct)
  console.log('\n2. GET /status (direct)');
  const statusRes = await fetch(`${PREVIEW_SERVICE}/status`);
  const statusData = await statusRes.json().catch(() => ({}));
  if (statusRes.ok) {
    console.log('✓ Status OK – uploadDir:', statusData.uploadDir);
    console.log('  uploadDirExists:', statusData.uploadDirExists);
  } else {
    console.log('✗ Status failed:', statusRes.status, statusData);
  }

  // 3. Preview via gateway (test-file.txt - may 404 if file doesn't exist)
  console.log('\n3. GET /api/preview/:filename (via gateway)');
  const filename = process.env.TEST_PREVIEW_FILENAME || 'test-preview-nonexistent.txt';
  const previewRes = await fetch(`${GATEWAY}/api/preview/${encodeURIComponent(filename)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (previewRes.ok) {
    const contentType = previewRes.headers.get('content-type') || '';
    console.log('✓ Preview OK – contentType:', contentType.slice(0, 50));
  } else if (previewRes.status === 404) {
    console.log('✓ Preview endpoint OK (404 – file not found, expected if no uploads)');
  } else if (previewRes.status === 502) {
    console.log('✗ Preview failed: Preview service unavailable (502)');
  } else {
    const body = await previewRes.text();
    console.log('✗ Preview failed:', previewRes.status, body.slice(0, 100));
  }

  console.log('\nDone.\n');
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
