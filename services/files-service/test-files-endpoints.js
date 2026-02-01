#!/usr/bin/env node
/**
 * Test Files Service endpoints.
 * Run: node test-files-endpoints.js
 * Requires: Files Service on 5012, Gateway on 8000 (for auth).
 */

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:8000';
const FILES_SERVICE = process.env.FILES_SERVICE_URL || 'http://localhost:5012';
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
  console.log('Files Service – endpoint tests\n');
  console.log('Gateway:', GATEWAY);
  console.log('Files Service (direct):', FILES_SERVICE);
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
  const healthRes = await fetch(`${FILES_SERVICE}/health`);
  console.log(healthRes.ok ? '✓ Health OK' : '✗ Health failed:', healthRes.status);
  if (!healthRes.ok) {
    console.error('  Start: cd services/files-service && PORT=5012 npm start');
    process.exit(1);
  }

  // 2. List files via gateway
  console.log('\n2. GET /api/files (via gateway)');
  const listRes = await fetch(`${GATEWAY}/api/files?page=1&limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = await listRes.json().catch(() => ({}));
  if (listRes.ok) {
    console.log('✓ List OK – files:', listData.files?.length ?? 0);
  } else {
    console.log('✗ List failed:', listRes.status, listData);
  }

  console.log('\nDone.\n');
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
