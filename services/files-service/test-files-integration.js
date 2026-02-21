#!/usr/bin/env node
/**
 * Integration test: Files Service (health + list via gateway).
 * Usage: node test-files-integration.js [gatewayUrl] [email] [password]
 */
const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const FILES_URL = process.env.FILES_SERVICE_URL || 'http://localhost:5012';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';

function log(name, ok, detail = '') {
  const icon = ok ? '\u2713' : '\u2717';
  console.log(`  ${ok ? '\x1b[32m' : '\x1b[31m'}${icon} ${name}\x1b[0m ${detail ? `- ${detail}` : ''}`);
}

async function run() {
  console.log('Files Service – Integration Tests');
  console.log('================================');
  console.log(`Gateway: ${GATEWAY}`);
  console.log(`Files:   ${FILES_URL}`);
  console.log('');
  try {
    const healthRes = await fetch(`${FILES_URL}/health`);
    log('GET /health (files-service)', healthRes.ok, healthRes.ok ? 'healthy' : healthRes.status);
  } catch (e) {
    log('GET /health (files-service)', false, e.message);
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
    const listRes = await fetch(`${GATEWAY}/api/files`, { headers: { Authorization: `Bearer ${token}` } });
    log('GET /api/files', listRes.ok, listRes.ok ? 'ok' : listRes.status);
  } catch (e) {
    log('GET /api/files', false, e.message);
  }
  console.log('\nDone.');
}
run().catch((err) => { console.error(err); process.exit(1); });
