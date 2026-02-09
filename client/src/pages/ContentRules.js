import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadUser } from '../store/slices/authSlice';
import { toast } from 'react-hot-toast';
import {
  Settings2,
  Save,
  RotateCcw,
  Plus,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { isAdmin } from '../utils/permissions';

const CARD_TYPE_LABELS = {
  concept: 'Concept',
  action: 'Action',
  quote: 'Quote',
  checklist: 'Checklist',
  mindmap: 'Mindmap',
};

const ContentRules = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState({
    cardTypeKeywords: {},
    categoryKeywords: {},
    actionVerbs: [],
  });
  const [expandedSections, setExpandedSections] = useState({
    cardTypes: true,
    categories: true,
    actionVerbs: true,
  });
  const [newKeywordInputs, setNewKeywordInputs] = useState({});
  const [newActionVerb, setNewActionVerb] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!user) {
      dispatch(loadUser());
    }
    if (user && !isAdmin(user)) {
      toast.error('Access denied: Only administrators can manage content rules');
      navigate('/dashboard');
      return;
    }
    fetchRules();
  }, [dispatch, user, navigate]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/content/rules', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRules({
        cardTypeKeywords: res.data.cardTypeKeywords || {},
        categoryKeywords: res.data.categoryKeywords || {},
        actionVerbs: Array.isArray(res.data.actionVerbs) ? res.data.actionVerbs : [],
      });
      setHasChanges(false);
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.put('/api/content/rules', rules, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Rules saved successfully');
      setHasChanges(false);
    } catch (err) {
      const details = err.response?.data?.details;
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to save rules';
      toast.error(details?.length ? `${msg}: ${details.join(', ')}` : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all rules to defaults? This cannot be undone.')) return;
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/content/rules/reset', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRules({
        cardTypeKeywords: res.data.rules?.cardTypeKeywords || res.data.cardTypeKeywords || {},
        categoryKeywords: res.data.rules?.categoryKeywords || res.data.categoryKeywords || {},
        actionVerbs: Array.isArray(res.data.rules?.actionVerbs) ? res.data.rules.actionVerbs : (res.data.actionVerbs || []),
      });
      toast.success('Rules reset to defaults');
      setHasChanges(false);
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to reset rules');
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = (section, key, value) => {
    const trimmed = (value || '').trim().toLowerCase();
    if (!trimmed) return;
    setRules((prev) => {
      const next = { ...prev };
      if (section === 'cardTypeKeywords') {
        const arr = [...(next.cardTypeKeywords[key] || [])];
        if (arr.includes(trimmed)) return prev;
        arr.push(trimmed);
        next.cardTypeKeywords = { ...next.cardTypeKeywords, [key]: arr };
      } else if (section === 'categoryKeywords') {
        const arr = [...(next.categoryKeywords[key] || [])];
        if (arr.includes(trimmed)) return prev;
        arr.push(trimmed);
        next.categoryKeywords = { ...next.categoryKeywords, [key]: arr };
      }
      return next;
    });
    setNewKeywordInputs((prev) => ({ ...prev, [`${section}-${key}`]: '' }));
    setHasChanges(true);
  };

  const removeKeyword = (section, key, index) => {
    setRules((prev) => {
      const next = { ...prev };
      if (section === 'cardTypeKeywords') {
        const arr = [...(next.cardTypeKeywords[key] || [])];
        arr.splice(index, 1);
        next.cardTypeKeywords = { ...next.cardTypeKeywords, [key]: arr };
      } else if (section === 'categoryKeywords') {
        const arr = [...(next.categoryKeywords[key] || [])];
        arr.splice(index, 1);
        next.categoryKeywords = { ...next.categoryKeywords, [key]: arr };
      }
      return next;
    });
    setHasChanges(true);
  };

  const addActionVerb = () => {
    const trimmed = newActionVerb.trim().toLowerCase();
    if (!trimmed) return;
    setRules((prev) => {
      const arr = [...(prev.actionVerbs || [])];
      if (arr.includes(trimmed)) return prev;
      return { ...prev, actionVerbs: [...arr, trimmed] };
    });
    setNewActionVerb('');
    setHasChanges(true);
  };

  const removeActionVerb = (index) => {
    setRules((prev) => {
      const arr = [...(prev.actionVerbs || [])];
      arr.splice(index, 1);
      return { ...prev, actionVerbs: arr };
    });
    setHasChanges(true);
  };

  const addCategory = () => {
    const name = window.prompt('New category name:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (rules.categoryKeywords[trimmed]) {
      toast.error('Category already exists');
      return;
    }
    setRules((prev) => ({
      ...prev,
      categoryKeywords: { ...prev.categoryKeywords, [trimmed]: [] },
    }));
    setHasChanges(true);
  };

  const removeCategory = (key) => {
    if (!window.confirm(`Remove category "${key}" and all its keywords?`)) return;
    setRules((prev) => {
      const next = { ...prev };
      const cats = { ...next.categoryKeywords };
      delete cats[key];
      next.categoryKeywords = cats;
      return next;
    });
    setHasChanges(true);
  };

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!user || !isAdmin(user)) return null;
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Processing Rules</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage keywords used to classify cards and categorize content when uploading files
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Card Types */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <button
            onClick={() => toggleSection('cardTypes')}
            className="w-full flex items-center gap-2 px-4 py-3 text-left font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            {expandedSections.cardTypes ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            Card Type Keywords
          </button>
          {expandedSections.cardTypes && (
            <div className="p-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700">
              {Object.entries(rules.cardTypeKeywords || {}).map(([type, keywords]) => (
                <div key={type} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {CARD_TYPE_LABELS[type] || type}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(keywords || []).map((kw, i) => (
                      <span
                        key={`${type}-${i}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-sm"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => removeKeyword('cardTypeKeywords', type, i)}
                          className="p-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Add keyword"
                        value={newKeywordInputs[`cardTypeKeywords-${type}`] || ''}
                        onChange={(e) => setNewKeywordInputs((prev) => ({ ...prev, [`cardTypeKeywords-${type}`]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword('cardTypeKeywords', type, newKeywordInputs[`cardTypeKeywords-${type}`]))}
                        className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => addKeyword('cardTypeKeywords', type, newKeywordInputs[`cardTypeKeywords-${type}`])}
                        className="p-1 rounded bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => toggleSection('categories')}
              className="flex-1 flex items-center gap-2 px-4 py-3 text-left font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              {expandedSections.categories ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              Category Keywords
            </button>
            <button
              onClick={addCategory}
              className="mx-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Add category"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {expandedSections.categories && (
            <div className="p-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700 max-h-[500px] overflow-y-auto">
              {Object.entries(rules.categoryKeywords || {}).map(([cat, keywords]) => (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{cat}</label>
                    <button
                      type="button"
                      onClick={() => removeCategory(cat)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove category
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(keywords || []).map((kw, i) => (
                      <span
                        key={`${cat}-${i}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-sm"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => removeKeyword('categoryKeywords', cat, i)}
                          className="p-0.5 rounded hover:bg-emerald-200 dark:hover:bg-emerald-800"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Add keyword"
                        value={newKeywordInputs[`categoryKeywords-${cat}`] || ''}
                        onChange={(e) => setNewKeywordInputs((prev) => ({ ...prev, [`categoryKeywords-${cat}`]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword('categoryKeywords', cat, newKeywordInputs[`categoryKeywords-${cat}`]))}
                        className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => addKeyword('categoryKeywords', cat, newKeywordInputs[`categoryKeywords-${cat}`])}
                        className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-300"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Verbs */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <button
            onClick={() => toggleSection('actionVerbs')}
            className="w-full flex items-center gap-2 px-4 py-3 text-left font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            {expandedSections.actionVerbs ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            Action Verbs
          </button>
          {expandedSections.actionVerbs && (
            <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Imperative verbs that indicate action items (e.g., create, build, review)
              </p>
              <div className="flex flex-wrap gap-2">
                {(rules.actionVerbs || []).map((v, i) => (
                  <span
                    key={`av-${i}`}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-sm"
                  >
                    {v}
                    <button
                      type="button"
                      onClick={() => removeActionVerb(i)}
                      className="p-0.5 rounded hover:bg-amber-200 dark:hover:bg-amber-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Add verb"
                    value={newActionVerb}
                    onChange={(e) => setNewActionVerb(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addActionVerb())}
                    className="w-28 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addActionVerb}
                    className="p-1 rounded bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-700 dark:text-amber-300"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentRules;
