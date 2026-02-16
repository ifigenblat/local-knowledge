# Knowledge base and AI: roadmap

This doc outlines how the current setup supports (and how to extend) a **knowledge base from your data** with **AI review, analysis, and Q&A**.

## Current state (after OOM fixes)

- **Chunked AI processing**: The upload flow no longer sends a whole file to the AI in one request. Text is split into chunks (~6k chars by paragraph); each chunk is sent separately to the AI service. That avoids running out of memory in Node and in the model.
- **Limits**: Extracted text is capped (default 500k chars per file); the AI service rejects any single request over 100k chars so callers must chunk.
- **Cards as knowledge units**: Each uploaded file is turned into cards (concepts, actions, quotes, etc.). Cards are stored and searchable. This is the base layer of your knowledge base.

## Path to “AI over my data”

### 1. **Stable base (done)**

- Process files in chunks so large documents don’t crash the stack.
- Cards are the first-class knowledge items (title, content, type, category, tags, source file).

### 2. **Search and filter (existing)**

- Use existing card/collection APIs and UI to search and browse by category, tags, source file.
- Optional: full-text or semantic search over card content (e.g. Postgres full-text or a small vector index).

### 3. **Embeddings + RAG (next step)**

To support “ask a question and get an answer from my data”:

- **Embeddings**: For each card (or each chunk of content), compute an embedding (e.g. OpenAI `text-embedding-3-small`, or a local model). Store `(card_id, embedding)` in a table or vector store.
- **Retrieval**: When the user asks a question, embed the question, find the top‑k nearest cards/chunks (vector similarity), and pass only those as context to the LLM.
- **Answer**: One LLM call with prompt like: “Given this context: … Answer the question: …” So the model never sees all your data at once—only the retrieved bits. This keeps memory and cost under control and scales to large knowledge bases.

### 4. **Where to implement**

- **Option A – In ai-service**: Add “embed cards” (batch) and “answer question” (retrieve + single LLM call). Store embeddings in Postgres (pgvector) or in a small vector DB.
- **Option B – New “knowledge” or “rag” service**: Dedicated service that uses card-service (read-only), calls ai-service for embeddings and chat, and owns the vector store. Keeps ai-service focused on card generation and chat.

### 5. **Prompting**

- **Review/analyze**: Reuse or extend the existing “extract cards” prompt so the model can also suggest tags, categories, or summaries. You can add a separate “review” step that takes a card and returns suggestions.
- **Q&A**: Use a fixed system prompt, e.g. “You answer only from the provided context. If the answer is not in the context, say so.” Then pass retrieved context + user question as the user message.

## Env / tuning (current)

- **Upload-service**: `MAX_EXTRACTED_TEXT_CHARS` (default 500000), `AI_CHUNK_CHARS` (default 6000), `AI_CHUNK_DELAY_MS` (default 300).
- **Ai-service**: `AI_MAX_TEXT_LENGTH` (default 100000). Requests with larger `text` get 413; upload-service already sends only chunks.

You can lower `MAX_EXTRACTED_TEXT_CHARS` or `AI_CHUNK_CHARS` further if you still see high memory usage (e.g. many concurrent uploads or very large single files).

---

## Implementation (RAG)

### Endpoints

- **POST /api/ai/knowledge/embed** – Body: `{ cards: [{ id, title, content }] }`. Requires auth. Embeds cards using OpenAI-compatible `/embeddings` API; stores in `card_embeddings` table.
- **POST /api/ai/knowledge/ask** – Body: `{ question, topK? }`. Requires auth. Retrieves top‑k similar cards, calls LLM with context, returns `{ answer, sources }`.

### Setup

1. Run migration: `cd services && npm run migrate-knowledge`
2. **Embeddings** require a provider that supports `/embeddings`:
   - **Groq and LM Studio do NOT support embeddings** (chat-only APIs). For Knowledge, set **EMBED_API_URL** and **EMBED_API_KEY** to OpenAI in `ai-service/.env`; chat can stay on Groq.
   - **OpenAI** – Set `EMBED_API_URL=https://api.openai.com/v1`, `EMBED_API_KEY=sk-...`, `EMBED_MODEL=text-embedding-3-small`.
   - **Ollama** – `ollama pull nomic-embed-text`, then `OLLAMA_ENABLED=true` and aiProvider: Ollama in settings. If you get "model runner stopped" (OOM), use a lighter model for Q&A: `ollama pull llama3.2:1b` and set `KNOWLEDGE_OLLAMA_MODEL=llama3.2:1b` in ai-service .env.
3. Frontend: Knowledge page → Embed my cards → Ask a question.
