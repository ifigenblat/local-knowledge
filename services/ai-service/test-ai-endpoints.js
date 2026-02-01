#!/usr/bin/env node
/**
 * Test AI Service endpoints.
 * Run: node test-ai-endpoints.js
 * Requires: AI Service on port 5008, Gateway on 8000 (for auth).
 */

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:8000';
const AI_SERVICE = process.env.AI_SERVICE_URL || 'http://localhost:5008';
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

async function run() {
  console.log('AI Service – endpoint tests\n');
  console.log('Gateway:', GATEWAY);
  console.log('AI Service (direct):', AI_SERVICE);
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
  console.log('\n1. GET /health (direct to AI service)');
  const healthRes = await fetch(`${AI_SERVICE}/health`);
  const healthOk = healthRes.ok;
  console.log(healthOk ? '✓ Health OK' : '✗ Health failed:', healthRes.status);
  if (!healthOk) {
    console.error('  Start AI Service: cd services/ai-service && PORT=5008 npm start');
    process.exit(1);
  }

  // 2. Status via gateway (same as frontend)
  console.log('\n2. GET /api/ai/status (via gateway)');
  const statusRes = await fetch(`${GATEWAY}/api/ai/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const statusData = await statusRes.json().catch(() => ({}));
  if (statusRes.ok) {
    console.log('✓ Status OK');
    console.log('  enabled:', statusData.enabled, 'available:', statusData.available, 'model:', statusData.model);
  } else {
    console.log('✗ Status failed:', statusRes.status, statusData);
  }

  // 3. Regenerate (via gateway) – only works if Ollama is enabled and running
  console.log('\n3. POST /api/ai/regenerate (via gateway)');
  const snippet = 'Effective leadership requires clear communication and the ability to inspire teams toward common goals.';
  const regenRes = await fetch(`${GATEWAY}/api/ai/regenerate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ snippet, sourceFileName: 'test.txt' }),
  });
  const regenData = await regenRes.json().catch(() => ({}));
  if (regenRes.ok && regenData.title) {
    console.log('✓ Regenerate OK');
    console.log('  title:', regenData.title?.substring(0, 50));
  } else {
    console.log('✗ Regenerate failed (expected if Ollama not running):', regenRes.status, regenData.message || regenData.error || regenData);
  }

  console.log('\nDone.\n');
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
