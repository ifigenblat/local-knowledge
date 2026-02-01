#!/usr/bin/env node
/**
 * Integration test: Upload flow and Files flow.
 * Requires: gateway, auth, upload, content-processing, card, files services running.
 * Run: node test-integration-upload-files.js
 */

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:8000';
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
  console.log('Integration Test: Upload + Files Flow\n');
  let passed = 0;
  let failed = 0;

  let token;
  try {
    token = await login();
    console.log('✓ Login OK');
    passed++;
  } catch (e) {
    console.error('✗ Login failed:', e.message);
    process.exit(1);
  }

  const auth = { Authorization: `Bearer ${token}` };

  // 1. List files (initial)
  try {
    const res = await fetch(`${GATEWAY}/api/files?page=1&limit=5`, { headers: auth });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.files)) {
      console.log('✓ List files OK (count:', data.files.length + ')');
      passed++;
    } else {
      throw new Error(res.status + ' ' + (data.error || data.message || ''));
    }
  } catch (e) {
    console.error('✗ List files failed:', e.message);
    failed++;
  }

  // 2. Upload file (uses native FormData + Blob in Node 18+)
  let uploadedFilename = null;
  try {
    const content = '# Test\n\nMeaningful content for integration test. More than ten chars.';
    const form = new FormData();
    form.append('file', new Blob([content], { type: 'text/plain' }), 'test-integration.txt');
    form.append('category', 'General');

    const res = await fetch(`${GATEWAY}/api/upload`, {
      method: 'POST',
      body: form,
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.cards || data.details)) {
      uploadedFilename = data.file?.filename;
      console.log('✓ Upload OK (cards:', (data.details?.created ?? 0) + (data.details?.updated ?? 0) + ')');
      passed++;
    } else {
      throw new Error(data.error || data.message || res.status);
    }
  } catch (e) {
    console.error('✗ Upload failed:', e.message);
    failed++;
  }

  // 3. List files again (should include new file if upload succeeded)
  try {
    const res = await fetch(`${GATEWAY}/api/files?page=1&limit=20`, { headers: auth });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.files)) {
      const found = uploadedFilename ? data.files.some(f => f.filename === uploadedFilename) : true;
      if (found || !uploadedFilename) {
        console.log('✓ List files after upload OK');
        passed++;
      } else {
        throw new Error('Uploaded file not in list');
      }
    } else {
      throw new Error(data.error || data.message || res.status);
    }
  } catch (e) {
    console.error('✗ List files after upload failed:', e.message);
    failed++;
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
