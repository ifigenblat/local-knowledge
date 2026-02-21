/**
 * Postgres access for card_embeddings table.
 * Uses pg directly (no Sequelize) - ai-service owns this table.
 */

const { Pool } = require('pg');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URI ||
  'postgresql://localknowledge:localknowledge@localhost:5432/localknowledge';

let pool = null;

function getPool() {
  if (!pool) pool = new Pool({ connectionString: DATABASE_URL });
  return pool;
}

async function upsertEmbedding(cardId, userId, embedding, contentText, model = 'text-embedding-3-small') {
  const client = await getPool().connect();
  try {
    await client.query(
      `INSERT INTO card_embeddings (card_id, user_id, embedding, content_text, model)
       VALUES ($1, $2, $3::jsonb, $4, $5)
       ON CONFLICT (card_id) DO UPDATE SET embedding = EXCLUDED.embedding, content_text = EXCLUDED.content_text, model = EXCLUDED.model, created_at = NOW()`,
      [cardId, userId, JSON.stringify(embedding), contentText || '', model],
    );
  } finally {
    client.release();
  }
}

async function findSimilar(userId, queryEmbedding, topK = 5) {
  const client = await getPool().connect();
  try {
    const rows = await client.query(
      `SELECT ce.card_id, ce.embedding, ce.content_text
       FROM card_embeddings ce
       WHERE ce.user_id = $1`,
      [userId],
    );
    if (rows.rows.length === 0) return [];

    const scores = rows.rows.map((r) => {
      const a = queryEmbedding;
      const b = Array.isArray(r.embedding) ? r.embedding : JSON.parse(r.embedding || '[]');
      const dot = a.reduce((s, v, i) => s + v * (b[i] || 0), 0);
      const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
      const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
      const cos = magA && magB ? dot / (magA * magB) : 0;
      return { cardId: r.card_id, score: cos, contentText: r.content_text || '' };
    });
    scores.sort((x, y) => y.score - x.score);
    return scores.slice(0, topK).filter((s) => s.score > 0);
  } finally {
    client.release();
  }
}

async function getEmbeddedCount(userId) {
  if (userId == null || userId === '') return 0;
  const client = await getPool().connect();
  try {
    const r = await client.query(
      'SELECT COUNT(*)::int AS count FROM card_embeddings WHERE user_id::text = $1',
      [String(userId)]
    );
    return r.rows[0]?.count ?? 0;
  } finally {
    client.release();
  }
}

async function deleteEmbedding(cardId) {
  const client = await getPool().connect();
  try {
    await client.query('DELETE FROM card_embeddings WHERE card_id = $1', [cardId]);
  } finally {
    client.release();
  }
}

module.exports = { upsertEmbedding, findSimilar, deleteEmbedding, getEmbeddedCount, getPool };
