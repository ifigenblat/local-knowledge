#!/usr/bin/env node
/**
 * Test all collection service endpoints via the API Gateway.
 * Usage: node test-collection-endpoints.js [gatewayUrl] [email] [password]
 * Defaults: http://localhost:8000, admin@localknowledge.local, admin123
 */

const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL = process.argv[3] || process.env.TEST_EMAIL || 'admin@localknowledge.local';
const PASSWORD = process.argv[4] || process.env.TEST_PASSWORD || 'admin123';

let token = null;
let createdCollectionId = null;
let createdCardId = null;

function log(name, ok, detail = '') {
  const icon = ok ? '\u2713' : '\u2717';
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
  console.log('Collection Service Endpoint Tests (via Gateway)');
  console.log('================================================');
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

  // 2. List collections
  console.log('\n2. GET /api/collections (list collections)');
  const listRes = await request('GET', '/api/collections');
  log('GET /api/collections', listRes.ok && Array.isArray(listRes.data), listRes.ok ? `collections: ${listRes.data?.length ?? 0}` : (listRes.data?.error || listRes.status));

  // 3. Create collection
  console.log('\n3. POST /api/collections (create collection)');
  const createBody = {
    name: 'Test Collection ' + Date.now(),
    description: 'Created by test script',
    cards: [],
    isPublic: false
  };
  const createRes = await request('POST', '/api/collections', createBody);
  log('POST /api/collections', createRes.ok && createRes.data?._id, createRes.ok ? `id: ${createRes.data?._id}` : (createRes.data?.error || createRes.status));
  if (createRes.ok && createRes.data?._id) {
    createdCollectionId = createRes.data._id;
  }

  if (!createdCollectionId) {
    console.log('  Skipping get/update/add-card/remove-card/delete (no collection id)');
    console.log('');
    return;
  }

  // 4. Get single collection
  console.log('\n4. GET /api/collections/:id');
  const getRes = await request('GET', `/api/collections/${createdCollectionId}`);
  log('GET /api/collections/:id', getRes.ok && getRes.data?._id === createdCollectionId, getRes.ok ? getRes.data?.name : (getRes.data?.error || getRes.status));

  // 5. Update collection
  console.log('\n5. PUT /api/collections/:id');
  const updateRes = await request('PUT', `/api/collections/${createdCollectionId}`, {
    name: 'Updated Test Collection',
    description: 'Updated by test script',
    isPublic: false
  });
  log('PUT /api/collections/:id', updateRes.ok && updateRes.data?.name === 'Updated Test Collection', updateRes.ok ? 'name updated' : (updateRes.data?.error || updateRes.status));

  // 6. Create a card to add to collection
  console.log('\n6. POST /api/cards (create card for add-to-collection test)');
  const cardBody = {
    title: 'Test Card for Collection ' + Date.now(),
    content: 'Content for collection test.',
    type: 'concept',
    category: 'General',
    tags: ['test'],
    isPublic: false
  };
  const cardRes = await request('POST', '/api/cards', cardBody);
  log('POST /api/cards', cardRes.ok && cardRes.data?._id, cardRes.ok ? `card id: ${cardRes.data?._id}` : (cardRes.data?.error || cardRes.status));
  if (cardRes.ok && cardRes.data?._id) {
    createdCardId = cardRes.data._id;
  }

  // 7. Add card to collection
  console.log('\n7. POST /api/collections/:id/cards');
  if (createdCardId) {
    const addRes = await request('POST', `/api/collections/${createdCollectionId}/cards`, { cardId: createdCardId });
    const hasCard = addRes.ok && addRes.data?.cards?.some(c => (c._id || c) === createdCardId);
    log('POST /api/collections/:id/cards', addRes.ok && (hasCard || addRes.data?.cards?.length >= 1), addRes.ok ? 'card added' : (addRes.data?.error || addRes.status));
  } else {
    log('POST /api/collections/:id/cards', false, 'skipped (no card id)');
  }

  // 8. Remove card from collection
  console.log('\n8. DELETE /api/collections/:id/cards/:cardId');
  if (createdCardId) {
    const removeRes = await request('DELETE', `/api/collections/${createdCollectionId}/cards/${createdCardId}`);
    log('DELETE /api/collections/:id/cards/:cardId', removeRes.ok, removeRes.ok ? 'card removed' : (removeRes.data?.error || removeRes.status));
  } else {
    log('DELETE /api/collections/:id/cards/:cardId', false, 'skipped (no card id)');
  }

  // 9. Delete collection
  console.log('\n9. DELETE /api/collections/:id');
  const delRes = await request('DELETE', `/api/collections/${createdCollectionId}`);
  log('DELETE /api/collections/:id', delRes.ok, delRes.ok ? 'deleted' : (delRes.data?.error || delRes.status));

  // 10. Get deleted collection (should 404)
  console.log('\n10. GET /api/collections/:id (deleted - expect 404)');
  const getDeletedRes = await request('GET', `/api/collections/${createdCollectionId}`);
  log('GET deleted collection returns 404', getDeletedRes.status === 404, getDeletedRes.status);

  // Cleanup: delete test card if we created one
  if (createdCardId) {
    await request('DELETE', `/api/cards/${createdCardId}`);
  }

  console.log('\nDone.\n');
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
