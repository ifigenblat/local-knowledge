#!/usr/bin/env node
/**
 * Migration: Create card_embeddings table for knowledge base / RAG.
 * Run from services dir: node scripts/migrate-knowledge.js
 * Uses JSONB for embedding storage (no pgvector required).
 */

const path = require('path');
const { Client } = require('pg');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URI ||
  'postgresql://localknowledge:localknowledge@localhost:5432/localknowledge';

async function migrate() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS card_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        embedding JSONB NOT NULL,
        content_text TEXT NOT NULL DEFAULT '',
        model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(card_id)
      );
    `);
    console.log('✓ card_embeddings table ready');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_card_embeddings_user_id
      ON card_embeddings(user_id);
    `);
    console.log('✓ index on user_id ready');

    try {
      await client.query(`ALTER TABLE card_embeddings ADD COLUMN IF NOT EXISTS content_text TEXT DEFAULT '';`);
      console.log('✓ content_text column ready');
    } catch (e) {
      if (!e.message?.includes('already exists')) console.warn('content_text:', e.message);
    }
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
