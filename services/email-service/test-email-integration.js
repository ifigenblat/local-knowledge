#!/usr/bin/env node
/**
 * Integration test: Email Service (health).
 * Usage: node test-email-integration.js [gatewayUrl] [email] [password]
 */
const EMAIL_URL = process.env.EMAIL_SERVICE_URL || 'http://localhost:5009';

function log(name, ok, detail = '') {
  const icon = ok ? '\u2713' : '\u2717';
  console.log(`  ${ok ? '\x1b[32m' : '\x1b[31m'}${icon} ${name}\x1b[0m ${detail ? `- ${detail}` : ''}`);
}

async function run() {
  console.log('Email Service – Integration Tests');
  console.log('================================');
  console.log(`Email: ${EMAIL_URL}`);
  console.log('');
  try {
    const healthRes = await fetch(`${EMAIL_URL}/health`);
    log('GET /health (email-service)', healthRes.ok, healthRes.ok ? 'healthy' : healthRes.status);
  } catch (e) {
    log('GET /health (email-service)', false, e.message);
  }
  console.log('\nDone.');
}
run().catch((err) => { console.error(err); process.exit(1); });
