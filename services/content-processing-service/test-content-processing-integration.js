#!/usr/bin/env node
/**
 * Integration test: Content Processing Service (health + rules/process check via gateway).
 * Usage: node test-content-processing-integration.js [gatewayUrl] [email] [password]
 */
const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const CONTENT_URL = process.env.CONTENT_SERVICE_URL || 'http://localhost:5007';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';

function log(name, ok, detail = '') {
  const icon = ok ? '\u2713' : '\u2717';
  console.log(`  ${ok ? '\x1b[32m' : '\x1b[31m'}${icon} ${name}\x1b[0m ${detail ? `- ${detail}` : ''}`);
}

async function run() {
  console.log('Content Processing Service – Integration Tests');
  console.log('==============================================');
  console.log(`Gateway: ${GATEWAY}`);
  console.log(`Content: ${CONTENT_URL}`);
  console.log('');
  try {
    const healthRes = await fetch(`${CONTENT_URL}/health`);
    log('GET /health (content-processing)', healthRes.ok, healthRes.ok ? 'healthy' : healthRes.status);
  } catch (e) {
    log('GET /health (content-processing)', false, e.message);
  }
  const loginRes = await fetch(`${GATEWAY}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) {
    console.log('  \x1b[31m\u2717 Login failed\x1b[0m');
    process.exit(1);
  }
  const data = await loginRes.json();
  const token = data.token;
  if (!token) {
    console.log('  \x1b[31m\u2717 No token\x1b[0m');
    process.exit(1);
  }
  log('Login', true);
  try {
    const rulesRes = await fetch(`${CONTENT_URL}/rules`, { headers: { Authorization: `Bearer ${token}` } });
    log('GET /rules', rulesRes.ok, rulesRes.ok ? 'ok' : rulesRes.status);
  } catch (e) {
    log('GET /rules', false, e.message);
  }
  console.log('\nDone.');
}
run().catch((err) => { console.error(err); process.exit(1); });
