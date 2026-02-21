#!/usr/bin/env node
/**
 * Integration test: Preview Service (health).
 * Usage: node test-preview-integration.js [gatewayUrl] [email] [password]
 */
const PREVIEW_URL = process.env.PREVIEW_SERVICE_URL || 'http://localhost:5011';

function log(name, ok, detail = '') {
  const icon = ok ? '\u2713' : '\u2717';
  console.log(`  ${ok ? '\x1b[32m' : '\x1b[31m'}${icon} ${name}\x1b[0m ${detail ? `- ${detail}` : ''}`);
}

async function run() {
  console.log('Preview Service – Integration Tests');
  console.log('===================================');
  console.log(`Preview: ${PREVIEW_URL}`);
  console.log('');
  try {
    const healthRes = await fetch(`${PREVIEW_URL}/health`);
    log('GET /health (preview-service)', healthRes.ok, healthRes.ok ? 'healthy' : healthRes.status);
  } catch (e) {
    log('GET /health (preview-service)', false, e.message);
  }
  console.log('\nDone.');
}
run().catch((err) => { console.error(err); process.exit(1); });
