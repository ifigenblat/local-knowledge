#!/usr/bin/env node
/**
 * Test Email Service endpoints.
 * Run: node test-email-endpoints.js
 * Requires: Email Service on 5009, Gateway on 8000 (for auth).
 */

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL_SERVICE = process.env.EMAIL_SERVICE_URL || 'http://localhost:5009';
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
  console.log('Email Service – endpoint tests\n');
  console.log('Gateway:', GATEWAY);
  console.log('Email Service (direct):', EMAIL_SERVICE);
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
  const healthRes = await fetch(`${EMAIL_SERVICE}/health`);
  console.log(healthRes.ok ? '✓ Health OK' : '✗ Health failed:', healthRes.status);
  if (!healthRes.ok) {
    console.error('  Start: cd services/email-service && PORT=5009 npm start');
    process.exit(1);
  }

  // 2. Status via gateway
  console.log('\n2. GET /api/email/status (via gateway)');
  const statusRes = await fetch(`${GATEWAY}/api/email/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const statusData = await statusRes.json().catch(() => ({}));
  if (statusRes.ok) {
    console.log('✓ Status OK – configured:', statusData.configured);
  } else {
    console.log('✗ Status failed:', statusRes.status, statusData);
  }

  // 3. Send password reset (test) – uses dummy token
  console.log('\n3. POST /api/email/send-password-reset (test)');
  const sendRes = await fetch(`${GATEWAY}/api/email/send-password-reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: EMAIL,
      resetToken: 'test-token-12345',
      baseUrl: 'http://localhost:3000',
    }),
  });
  const sendData = await sendRes.json().catch(() => ({}));
  if (sendRes.ok && (sendData.success || sendData.development)) {
    console.log('✓ Send OK');
  } else {
    console.log('✗ Send failed:', sendRes.status, sendData);
  }

  console.log('\nDone.\n');
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
