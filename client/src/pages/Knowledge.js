import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { fetchCards } from '../store/slices/cardSlice';
import { Search, Database, MessageCircle, Loader2 } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || '';

/** Label for the embedded cards count shown on the Knowledge page */
const EMBEDDED_COUNT_LABEL = 'cards embedded';

export default function Knowledge() {
  const dispatch = useDispatch();
  const { cards } = useSelector((state) => state.cards);
  const [embedding, setEmbedding] = useState(false);
  const [embedResult, setEmbedResult] = useState(null);
  const [embeddedCount, setEmbeddedCount] = useState(null);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState(null);

  const fetchEmbeddedCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/ai/knowledge/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmbeddedCount(res.data?.embeddedCount ?? 0);
    } catch {
      setEmbeddedCount(0);
    }
  }, []);

  useEffect(() => {
    fetchEmbeddedCount();
  }, [fetchEmbeddedCount]);

  const handleEmbed = async () => {
    setEmbedding(true);
    setEmbedResult(null);
    try {
      const { payload } = await dispatch(fetchCards({ limit: 1000 }));
      const list = payload?.cards || payload || [];
      const items = Array.isArray(list) ? list : [];
      const toEmbed = items.map((c) => ({
        id: c.id || c._id,
        title: c.title || '',
        content: c.content || '',
      })).filter((c) => c.id);

      if (toEmbed.length === 0) {
        toast.error('No cards to embed. Upload some files first.');
        setEmbedding(false);
        return;
      }

      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE}/api/ai/knowledge/embed`, { cards: toEmbed }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 300000,
      });
      setEmbedResult(res.data);
      if (typeof res.data.embeddedCount === 'number') {
        setEmbeddedCount(res.data.embeddedCount);
      } else {
        await fetchEmbeddedCount();
      }
      const { embedded, total, errors } = res.data;
      if (errors?.length > 0 && embedded === 0) {
        const firstErr = errors[0]?.error || 'Unknown error';
        toast.error(firstErr, { duration: 8000 });
      } else {
        toast.success(`Embedded ${embedded || 0}/${total || 0} cards`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Embed failed';
      toast.error(msg);
    } finally {
      setEmbedding(false);
    }
  };

  const handleAsk = async (e) => {
    e?.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE}/api/ai/knowledge/ask`,
        { question: question.trim(), topK: 5 },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
      );
      setAnswer(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Ask failed';
      toast.error(msg);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Embed your cards and ask questions over your data using AI.
        </p>
      </div>

      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Embed my cards</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Index your cards so you can search them with natural language. Run this after adding new cards.
        </p>
        {embeddedCount !== null && (
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {embeddedCount} {EMBEDDED_COUNT_LABEL}
          </p>
        )}
        <button
          onClick={handleEmbed}
          disabled={embedding}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg"
        >
          {embedding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
          {embedding ? 'Embedding...' : 'Embed my cards'}
        </button>
        {embedResult && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            <p>Embedded {embedResult.embedded}/{embedResult.total} cards</p>
            {embedResult.errors?.length > 0 && (
              <p className="mt-2 text-amber-600 dark:text-amber-400">
                First error: {embedResult.errors[0]?.error || 'Unknown'}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ask a question</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Ask anything based on your embedded cards. AI answers only from your knowledge base.
        </p>
        <form onSubmit={handleAsk} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What are the key takeaways from my notes?"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg"
            >
              {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              {asking ? 'Asking...' : 'Ask'}
            </button>
          </div>
        </form>
        {answer && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{answer.answer}</p>
            {answer.sources?.length > 0 && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Based on {answer.sources.length} card(s)
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
