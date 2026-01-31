#!/usr/bin/env node
/**
 * Test all card service endpoints via the API Gateway.
 * Usage: node test-card-endpoints.js [gatewayUrl] [email] [password]
 * Defaults: http://localhost:8000, admin@localknowledge.local, admin123
 */

const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';

let token = null;
let createdCardId = null;

function log(name, ok, detail = '') {
  const icon = ok ? '\u2713' : '\u2717';
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`  ${ok ? '\x1b[32m' : '\x1b[31m'}${icon} ${name}\x1b[0m ${detail ? `- ${detail}` : ''}`);
}

async function request(method, path, body = null, useAuth = true) {
  const url = path.startsWith('http') ? path : `${GATEWAY}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth && token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {}
  return { ok: res.ok, status: res.status, data, text };
}

async function run() {
  console.log('Card Service Endpoint Tests (via Gateway)');
  console.log('=========================================');
  console.log(`Gateway: ${GATEWAY}`);
  console.log(`Login:   ${EMAIL}`);
  console.log('');

  // 1. Login
  console.log('1. Auth');
  const loginRes = await request('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD }, false);
  if (!loginRes.ok) {
    console.log('  \x1b[31m\u2717 Login failed\x1b[0m - cannot continue. Status:', loginRes.status, loginRes.data?.error || loginRes.text);
    process.exit(1);
  }
  token = loginRes.data?.token;
  if (!token) {
    console.log('  \x1b[31m\u2717 No token in login response\x1b[0m');
    process.exit(1);
  }
  log('Login', true);

  // 2. List cards
  console.log('\n2. GET /api/cards (list cards)');
  const listRes = await request('GET', '/api/cards');
  log('GET /api/cards', listRes.ok, listRes.ok ? `cards: ${listRes.data?.cards?.length ?? 0}` : listRes.data?.error || listRes.status);
  if (!listRes.ok) {
    console.log('  Response:', listRes.data || listRes.text);
  }

  // 3. List with query params
  const listQueryRes = await request('GET', '/api/cards?page=1&limit=5');
  log('GET /api/cards?page=1&limit=5', listQueryRes.ok, listQueryRes.ok ? `cards: ${listQueryRes.data?.cards?.length ?? 0}` : listQueryRes.status);

  // 4. Get by category (use a category that might exist)
  console.log('\n3. GET /api/cards/category/:category');
  const catRes = await request('GET', '/api/cards/category/General');
  const isArray = Array.isArray(catRes.data);
  log('GET /api/cards/category/General', catRes.ok && isArray, catRes.ok ? `array length: ${catRes.data?.length ?? 0}` : (catRes.data?.error || catRes.status));

  // 5. Get by type
  console.log('\n4. GET /api/cards/type/:type');
  const typeRes = await request('GET', '/api/cards/type/concept');
  const typeArray = Array.isArray(typeRes.data);
  log('GET /api/cards/type/concept', typeRes.ok && typeArray, typeRes.ok ? `array length: ${typeRes.data?.length ?? 0}` : (typeRes.data?.error || typeRes.status));

  // 6. Create card
  console.log('\n5. POST /api/cards (create card)');
  const createBody = {
    title: 'Test Card ' + Date.now(),
    content: 'Content for test card.',
    type: 'concept',
    category: 'General',
    tags: ['test'],
    isPublic: false
  };
  const createRes = await request('POST', '/api/cards', createBody);
  log('POST /api/cards', createRes.ok && createRes.data?._id, createRes.ok ? `id: ${createRes.data?._id}` : (createRes.data?.error || createRes.status));
  if (createRes.ok && createRes.data?._id) {
    createdCardId = createRes.data._id;
  }

  if (!createdCardId) {
    console.log('  Skipping get/update/review/rate/regenerate/delete (no card id)');
    console.log('');
    return;
  }

  // 7. Get single card
  console.log('\n6. GET /api/cards/:id');
  const getRes = await request('GET', `/api/cards/${createdCardId}`);
  log('GET /api/cards/:id', getRes.ok && getRes.data?._id === createdCardId, getRes.ok ? getRes.data?.title : (getRes.data?.error || getRes.status));

  // 8. Update card
  console.log('\n7. PUT /api/cards/:id');
  const updateRes = await request('PUT', `/api/cards/${createdCardId}`, {
    title: 'Updated Test Card',
    content: 'Updated content.',
    type: 'concept',
    category: 'General',
    tags: ['test', 'updated']
  });
  log('PUT /api/cards/:id', updateRes.ok && updateRes.data?.title === 'Updated Test Card', updateRes.ok ? 'title updated' : (updateRes.data?.error || updateRes.status));

  // 9. PATCH review
  console.log('\n8. PATCH /api/cards/:id/review');
  const reviewRes = await request('PATCH', `/api/cards/${createdCardId}/review`, {});
  log('PATCH /api/cards/:id/review', reviewRes.ok, reviewRes.ok ? 'ok' : (reviewRes.data?.error || reviewRes.status));

  // 10. PATCH rate
  console.log('\n9. PATCH /api/cards/:id/rate');
  const rateRes = await request('PATCH', `/api/cards/${createdCardId}/rate`, { rating: 4 });
  log('PATCH /api/cards/:id/rate', rateRes.ok, rateRes.ok ? 'rating 4' : (rateRes.data?.error || rateRes.status));

  // 11. Regenerate (200 = ok, 400 with "provenance" = expected for manual cards, 502 = backend down)
  console.log('\n10. POST /api/cards/:id/regenerate');
  const regenRes = await request('POST', `/api/cards/${createdCardId}/regenerate`, { useAI: false, comparisonMode: false });
  const regenMsg = regenRes.data?.error || regenRes.data?.message || '';
  const regenExpectedNoProvenance = regenRes.status === 400 && (regenMsg.includes('provenance') || regenMsg.includes('snippet'));
  const regenOk = regenRes.ok || regenRes.status === 502 || regenExpectedNoProvenance;
  const regenDetail = regenRes.ok ? 'ok' : (regenRes.status === 502 ? 'backend unavailable' : (regenExpectedNoProvenance ? 'no provenance (expected)' : regenMsg || regenRes.status));
  log('POST /api/cards/:id/regenerate', regenOk, regenDetail);

  // 12. Delete card
  console.log('\n11. DELETE /api/cards/:id');
  const delRes = await request('DELETE', `/api/cards/${createdCardId}`);
  log('DELETE /api/cards/:id', delRes.ok, delRes.ok ? 'deleted' : (delRes.data?.error || delRes.status));

  // 13. Get deleted card (should 404)
  console.log('\n12. GET /api/cards/:id (deleted - expect 404)');
  const getDeletedRes = await request('GET', `/api/cards/${createdCardId}`);
  log('GET deleted card returns 404', getDeletedRes.status === 404, getDeletedRes.status);

  console.log('\nDone.\n');
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
