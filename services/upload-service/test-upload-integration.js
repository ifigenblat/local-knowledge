#!/usr/bin/env node
/**
 * Integration test: Upload Service via gateway (health + upload flow check).
 * Usage: node test-upload-integration.js [gatewayUrl] [email] [password]
 */
const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';
const UPLOAD_SERVICE_URL = process.env.UPLOAD_SERVICE_URL || 'http://localhost:5006';

let token = null;
function log(name, ok, detail = '') {
  const icon = ok ? '\u2713' : '\u2717';
  console.log(`  ${ok ? '\x1b[32m' : '\x1b[31m'}${icon} ${name}\x1b[0m ${detail ? `- ${detail}` : ''}`);
}

async function run() {
  console.log('Upload Service – Integration Tests');
  console.log('===================================');
  console.log(`Gateway: ${GATEWAY}`);
  console.log(`Upload:  ${UPLOAD_SERVICE_URL}`);
  console.log('');
  try {
    const healthRes = await fetch(`${UPLOAD_SERVICE_URL}/health`);
    log('GET /health (upload-service)', healthRes.ok, healthRes.ok ? 'healthy' : healthRes.status);
  } catch (e) {
    log('GET /health (upload-service)', false, e.message);
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
  token = data.token;
  if (!token) {
    console.log('  \x1b[31m\u2717 No token\x1b[0m');
    process.exit(1);
  }
  log('Login', true);
  const uploadHealth = await fetch(`${GATEWAY}/api/upload/health`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  if (uploadHealth && uploadHealth.ok) {
    log('GET /api/upload/health (via gateway)', true);
  } else {
    log('GET /api/upload/health (via gateway)', false, uploadHealth ? uploadHealth.status : 'skip');
  }
  console.log('\nDone.');
}
run().catch((err) => { console.error(err); process.exit(1); });
