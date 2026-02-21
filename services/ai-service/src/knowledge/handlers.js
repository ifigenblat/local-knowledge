/**
 * Knowledge base handlers: embed cards, ask question (RAG).
 */

const { chatGenerate } = require('../aiProcessor');
const { embedText, getEmbedModel } = require('./embedder');
const { upsertEmbedding, findSimilar, getEmbeddedCount } = require('./db');

/**
 * Embed cards and store in card_embeddings.
 * Body: { cards: [{ id, title, content }] }, userId from X-User-Id header.
 */
async function embedCards(cards, userId) {
  if (!userId) throw new Error('User ID required (X-User-Id header)');
  if (!Array.isArray(cards) || cards.length === 0) {
    return { embedded: 0, errors: [] };
  }

  let embedded = 0;
  const errors = [];

  for (const card of cards) {
    const id = card.id || card._id;
    const title = card.title || '';
    const content = card.content || '';
    const text = `${title}\n\n${content}`.trim().substring(0, 8000);
    if (!text) {
      errors.push({ cardId: id, error: 'Empty content' });
      continue;
    }
    try {
      const embedding = await embedText(text);
      await upsertEmbedding(id, userId, embedding, text, getEmbedModel());
      embedded++;
    } catch (e) {
      errors.push({ cardId: id, error: e.message || String(e) });
    }
  }

  const embeddedCount = await getEmbeddedCount(userId);
  return { embedded, total: cards.length, errors, embeddedCount };
}

/**
 * Ask a question over the user's knowledge base (RAG).
 * Embeds question, retrieves top-k similar cards, calls LLM with context.
 * Body: { question, topK? }, userId from X-User-Id header.
 */
async function askQuestion(question, userId, topK = 5) {
  if (!userId) throw new Error('User ID required (X-User-Id header)');
  const q = (question || '').trim();
  if (!q) throw new Error('Question is required');

  const queryEmbedding = await embedText(q);
  const similar = await findSimilar(userId, queryEmbedding, Math.min(topK, 10));

  if (similar.length === 0) {
    return {
      answer: "I don't have any relevant knowledge in your cards yet. Try embedding your cards first (Knowledge page → Embed my cards).",
      sources: [],
    };
  }

  const MAX_CONTEXT_CHARS = 1500;
  const MAX_PER_CARD = 400;
  let ctx = '';
  for (let i = 0; i < similar.length; i++) {
    const t = (similar[i].contentText || '').trim().substring(0, MAX_PER_CARD);
    if (!t) continue;
    const block = (ctx ? '\n\n---\n\n' : '') + `[${i + 1}]\n${t}`;
    if (ctx.length + block.length > MAX_CONTEXT_CHARS) break;
    ctx += block;
  }

  const systemPrompt = 'You are a helpful assistant over the user\'s knowledge base (cards below). Base your answers on this context. You may summarize, recommend, suggest collections or next steps, and answer questions—using the card content as the source. If the question cannot be informed by the context at all, say so briefly; otherwise give a useful, concise answer.';
  const userPrompt = `Context:\n\n${ctx}\n\nQuestion: ${q}`;
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  const answer = await chatGenerate(fullPrompt, 500);
  const sources = similar.map((s) => ({ cardId: s.cardId, score: Math.round(s.score * 100) / 100 }));

  return { answer, sources };
}

/**
 * Return the number of cards currently embedded for the user.
 */
async function getEmbeddedCountForUser(userId) {
  if (!userId) return 0;
  return getEmbeddedCount(userId);
}

module.exports = { embedCards, askQuestion, getEmbeddedCountForUser };
