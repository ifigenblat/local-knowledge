import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Save, X, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { isSuperAdmin } from '../utils/permissions';
import { checkAIStatusAsync } from '../store/slices/cardSlice';

const CLOUD_PROVIDER_PRESETS = {
  openai: { url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  groq: { url: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant' },
  together: { url: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3-8b-chat-hf' },
  lmstudio: { url: 'http://localhost:1234/v1', model: 'llama-3-8b' },
  localai: { url: 'http://localhost:8080/v1', model: 'llama-3-8b' },
  llamacpp: { url: 'http://localhost:8081/v1', model: 'llama-3-8b' },
  custom: { url: '', model: '' },
};

/** Cloud-only services (remote API); shown in "Cloud" dropdown only. */
const CLOUD_SERVICES = [
  { value: 'openai', label: 'OpenAI (e.g. gpt-4o-mini)' },
  { value: 'groq', label: 'Groq (free tier, fast)' },
  { value: 'together', label: 'Together' },
  { value: 'custom', label: 'Custom (enter URL and model)' },
];
/** Local-only services (run on this machine); shown in "Local" dropdown only. */
const LOCAL_SERVICES = [
  { value: 'ollama', label: 'Ollama (recommended)' },
  { value: 'lmstudio', label: 'LM Studio (GPU-friendly)' },
  { value: 'localai', label: 'LocalAI (Docker)' },
  { value: 'llamacpp', label: 'llama.cpp (local server)' },
];
/** Providers that require an API key (cloud only). */
const PROVIDERS_WITH_API_KEY = ['openai', 'groq', 'together', 'custom'];

const PROVIDER_INSTRUCTIONS = {
  ollama: {
    freeOrPaid: 'Free (local)',
    text: 'Install Ollama from ollama.com, run "ollama pull llama3.2" (or another model), then "ollama serve". Set OLLAMA_ENABLED=true in ai-service. No API key.',
  },
  openai: {
    freeOrPaid: 'Paid (pay-as-you-go)',
    text: 'Get an API key at platform.openai.com → API Keys → Create new secret key. Billing must be set up.',
  },
  groq: {
    freeOrPaid: 'Free tier available',
    text: 'Sign up at console.groq.com → API Keys → Create API Key. Copy the key; it is shown only once.',
  },
  together: {
    freeOrPaid: 'Free credits / Paid',
    text: 'Sign up at together.ai, then get your API key from the dashboard. Free credits may be available for new accounts.',
  },
  lmstudio: {
    freeOrPaid: 'Free (local)',
    text: 'Install LM Studio from lmstudio.ai. Download a model, then start the local server (default port 1234). No API key.',
  },
  localai: {
    freeOrPaid: 'Free (local)',
    text: 'Run LocalAI (e.g. Docker on port 8080). See localai.io for setup. No API key.',
  },
  llamacpp: {
    freeOrPaid: 'Free (local)',
    text: 'Run the llama.cpp server (e.g. --port 8081). See github.com/ggerganov/llama.cpp. No API key.',
  },
  custom: {
    freeOrPaid: 'Depends on endpoint',
    text: 'Enter your Base URL, model name, and API key if your endpoint requires one.',
  },
};

/** Processing limits: defaults and max values (must match backend). */
const PROCESSING_DEFAULTS = {
  maxExtractedTextChars: 500000,
  aiChunkChars: 6000,
  aiChunkDelayMs: 300,
  aiMaxTextLength: 100000,
  ollamaChunkChars: 1500,
};
const PROCESSING_MAX = {
  maxExtractedTextChars: 2000000,
  aiChunkChars: 20000,
  aiChunkDelayMs: 5000,
  aiMaxTextLength: 200000,
  ollamaChunkChars: 4000,
};

/** Install & run steps for each local AI option (super admin). runAction: API action for "Run" button. */
const LOCAL_AI_INSTALL = {
  ollama: {
    title: 'Ollama (recommended for Mac/Linux)',
    port: 11434,
    runAction: 'install_ollama',
    steps: [
      { label: 'Install (from project root: services/)', command: 'cd services && chmod +x scripts/local-ai/install-ollama.sh && ./scripts/local-ai/install-ollama.sh' },
      { label: 'Or install manually: macOS', command: 'brew install ollama' },
      { label: 'Or: Linux', command: 'curl -fsSL https://ollama.com/install.sh | sh' },
      { label: 'Start the server', command: 'ollama serve' },
      { label: 'Pull a model (one-time, in another terminal)', command: 'ollama pull llama3.2' },
      { label: 'In this app', text: 'Select Where does the AI run: Locally, Local service: Ollama. Click Save. Set OLLAMA_ENABLED=true and OLLAMA_MODEL=llama3.2 (or your model) when starting the AI service (e.g. in start-all.sh or .env).' },
    ],
  },
  localai: {
    title: 'LocalAI (Docker)',
    port: 8080,
    runAction: 'start_localai',
    steps: [
      { label: 'Start LocalAI (from project root: services/)', command: 'cd services && chmod +x scripts/local-ai/start-localai.sh && ./scripts/local-ai/start-localai.sh' },
      { label: 'Or with Docker directly', command: 'docker run -d -p 8080:8080 --name localknowledge-localai quay.io/go-skynet/local-ai:latest' },
      { label: 'In this app', text: 'Select Where does the AI run: Locally, Local service: LocalAI. Base URL: http://localhost:8080/v1. Save. You may need to load a model in LocalAI (see localai.io).' },
    ],
  },
  llamacpp: {
    title: 'llama.cpp (Docker)',
    port: 8081,
    runAction: 'start_llamacpp',
    downloadAction: 'download_llamacpp_model',
    steps: [
      { label: '1. Download a GGUF model (run once)', text: 'Click "Download sample model" below, or run the command in a terminal from project services/.' },
      { label: 'Or run in terminal (from services/)', command: 'mkdir -p .models/llamacpp && curl -fL -o .models/llamacpp/Llama-3.2-1B-Instruct-Q4_K_M.gguf "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf"' },
      { label: '2. Start llama.cpp server', text: 'Set port below if needed (e.g. 8081), then click "Start server".' },
      { label: '3. In this app', text: 'Select Where does the AI run: Locally, Local service: llama.cpp. Base URL: http://localhost:8081/v1 (or your port). Save.' },
    ],
  },
  lmstudio: {
    title: 'LM Studio (desktop app, port 1234)',
    port: 1234,
    runAction: null,
    steps: [
      { label: 'Install', text: 'Download LM Studio from lmstudio.ai and install.' },
      { label: 'Run', text: 'Open LM Studio, download a model, then start the local server (default port 1234).' },
      { label: 'In this app', text: 'Select Where does the AI run: Locally, Local service: LM Studio. Base URL: http://localhost:1234/v1. Save.' },
    ],
  },
};

const AISettings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [aiProviderSettings, setAiProviderSettings] = useState({
    aiProvider: 'ollama',
    cloudProvider: 'openai',
    cloudApiUrl: '',
    cloudModel: '',
    cloudApiKey: '',
  });
  /** 'local' = run on this machine, 'cloud' = remote API. Drives which services show in second dropdown. */
  const [runLocation, setRunLocation] = useState('local');
  /** Selected service: for local = ollama|lmstudio|localai|llamacpp, for cloud = openai|groq|together|custom. */
  const [service, setService] = useState('ollama');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [cloudApiKeyMasked, setCloudApiKeyMasked] = useState('');
  const [savedCloudProvider, setSavedCloudProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [installPanelOpen, setInstallPanelOpen] = useState(null);
  const [customPorts, setCustomPorts] = useState({ localai: '8080', llamacpp: '8081' });
  const [runState, setRunState] = useState({ action: null, loading: false, result: null });
  const [processingLimits, setProcessingLimits] = useState({
    maxExtractedTextChars: PROCESSING_DEFAULTS.maxExtractedTextChars,
    aiChunkChars: PROCESSING_DEFAULTS.aiChunkChars,
    aiChunkDelayMs: PROCESSING_DEFAULTS.aiChunkDelayMs,
    aiMaxTextLength: PROCESSING_DEFAULTS.aiMaxTextLength,
    ollamaChunkChars: PROCESSING_DEFAULTS.ollamaChunkChars,
  });
  const [processingExpanded, setProcessingExpanded] = useState(false);

  useEffect(() => {
    if (!user || !isSuperAdmin(user)) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    axios.get('/api/users/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const ap = res.data.aiProvider || 'ollama';
        const cp = res.data.cloudProvider || 'openai';
        const isLocalOllama = ap === 'ollama';
        const isLocalOther = ap === 'openai' && ['lmstudio', 'localai', 'llamacpp'].includes(cp);
        const runLoc = isLocalOllama || isLocalOther ? 'local' : 'cloud';
        const svc = isLocalOllama ? 'ollama' : cp;
        setRunLocation(runLoc);
        setService(svc);
        setAiProviderSettings({
          aiProvider: ap,
          cloudProvider: cp,
          cloudApiUrl: res.data.cloudApiUrl || (CLOUD_PROVIDER_PRESETS[cp]?.url || ''),
          cloudModel: res.data.cloudModel || (CLOUD_PROVIDER_PRESETS[cp]?.model || ''),
          cloudApiKey: '',
        });
        setHasApiKey(res.data.hasApiKey ?? false);
        setCloudApiKeyMasked(res.data.cloudApiKeyMasked ?? '');
        setSavedCloudProvider(cp);
        setProcessingLimits({
          maxExtractedTextChars: typeof res.data.maxExtractedTextChars === 'number' ? res.data.maxExtractedTextChars : PROCESSING_DEFAULTS.maxExtractedTextChars,
          aiChunkChars: typeof res.data.aiChunkChars === 'number' ? res.data.aiChunkChars : PROCESSING_DEFAULTS.aiChunkChars,
          aiChunkDelayMs: typeof res.data.aiChunkDelayMs === 'number' ? res.data.aiChunkDelayMs : PROCESSING_DEFAULTS.aiChunkDelayMs,
          aiMaxTextLength: typeof res.data.aiMaxTextLength === 'number' ? res.data.aiMaxTextLength : PROCESSING_DEFAULTS.aiMaxTextLength,
          ollamaChunkChars: typeof res.data.ollamaChunkChars === 'number' ? res.data.ollamaChunkChars : PROCESSING_DEFAULTS.ollamaChunkChars,
        });
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const aiProvider = runLocation === 'local' && service === 'ollama' ? 'ollama' : 'openai';
      const cloudProvider = runLocation === 'local' && service === 'ollama' ? (aiProviderSettings.cloudProvider || 'openai') : service;
      const payload = {
        aiProvider,
        cloudProvider,
        cloudApiUrl: aiProviderSettings.cloudApiUrl,
        cloudModel: aiProviderSettings.cloudModel,
      };
      if (aiProviderSettings.cloudApiKey && aiProviderSettings.cloudApiKey.trim()) {
        payload.cloudApiKey = aiProviderSettings.cloudApiKey.trim();
      }
      payload.maxExtractedTextChars = Math.min(PROCESSING_MAX.maxExtractedTextChars, Math.max(10000, Number(processingLimits.maxExtractedTextChars) || PROCESSING_DEFAULTS.maxExtractedTextChars));
      payload.aiChunkChars = Math.min(PROCESSING_MAX.aiChunkChars, Math.max(1000, Number(processingLimits.aiChunkChars) || PROCESSING_DEFAULTS.aiChunkChars));
      payload.aiChunkDelayMs = Math.min(PROCESSING_MAX.aiChunkDelayMs, Math.max(0, Number(processingLimits.aiChunkDelayMs) || PROCESSING_DEFAULTS.aiChunkDelayMs));
      payload.aiMaxTextLength = Math.min(PROCESSING_MAX.aiMaxTextLength, Math.max(10000, Number(processingLimits.aiMaxTextLength) || PROCESSING_DEFAULTS.aiMaxTextLength));
      payload.ollamaChunkChars = Math.min(PROCESSING_MAX.ollamaChunkChars, Math.max(500, Number(processingLimits.ollamaChunkChars) || PROCESSING_DEFAULTS.ollamaChunkChars));
      const res = await axios.put('/api/users/settings', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('AI provider setting saved');
      setAiProviderSettings((prev) => ({ ...prev, cloudApiKey: '' }));
      setHasApiKey(res.data.hasApiKey ?? false);
      setCloudApiKeyMasked(res.data.cloudApiKeyMasked ?? '');
      setSavedCloudProvider(res.data.cloudProvider ?? null);
      const ap = res.data.aiProvider || 'ollama';
      const cp = res.data.cloudProvider || 'openai';
      setRunLocation(ap === 'ollama' || ['lmstudio', 'localai', 'llamacpp'].includes(cp) ? 'local' : 'cloud');
      setService(ap === 'ollama' ? 'ollama' : cp);
      dispatch(checkAIStatusAsync());
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  const handleRunLocationChange = (e) => {
    const loc = e.target.value;
    setRunLocation(loc);
    const firstService = loc === 'local' ? 'ollama' : 'openai';
    setService(firstService);
    const preset = CLOUD_PROVIDER_PRESETS[firstService];
    setAiProviderSettings((prev) => ({
      ...prev,
      cloudProvider: firstService,
      cloudApiUrl: preset ? preset.url : prev.cloudApiUrl,
      cloudModel: preset ? preset.model : prev.cloudModel,
    }));
  };

  const handleServiceChange = (e) => {
    const v = e.target.value;
    setService(v);
    const preset = CLOUD_PROVIDER_PRESETS[v];
    setAiProviderSettings((prev) => ({
      ...prev,
      cloudProvider: v,
      cloudApiUrl: preset ? preset.url : prev.cloudApiUrl,
      cloudModel: preset ? preset.model : prev.cloudModel,
    }));
  };

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const copyCommand = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard')).catch(() => toast.error('Copy failed'));
  };

  const defaultInstallPanel = () => {
    if (runLocation === 'local' && service === 'ollama') return 'ollama';
    if (service === 'localai') return 'localai';
    if (service === 'llamacpp') return 'llamacpp';
    if (service === 'lmstudio') return 'lmstudio';
    return 'ollama';
  };

  const runLocalSetup = async (action, port) => {
    if (runState.loading) return;
    setRunState({ action, loading: true, result: null });
    try {
      const token = localStorage.getItem('token');
      const body = { action };
      if (port != null && port !== '') body.port = parseInt(port, 10);
      const isDownload = action === 'download_llamacpp_model';
      const res = await axios.post('/api/admin/run-local-ai-setup', body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: isDownload ? 320000 : 130000,
      });
      const data = res.data || {};
      setRunState({ action, loading: false, result: data });
      if (data.ok) {
        const shortMsg = action === 'download_llamacpp_model' ? 'Download complete. See Output for details.' : 'Done. See Output for details.';
        toast.success(shortMsg);
        if (port != null && (action === 'start_localai' || action === 'start_llamacpp')) {
          const baseUrl = `http://localhost:${port}/v1`;
          setRunLocation('local');
          setService(action === 'start_localai' ? 'localai' : 'llamacpp');
          setAiProviderSettings((prev) => ({
            ...prev,
            cloudApiUrl: baseUrl,
            cloudProvider: action === 'start_localai' ? 'localai' : 'llamacpp',
          }));
        }
      } else {
        toast.error('Failed. See Output below for details.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Request failed';
      setRunState({ action, loading: false, result: { ok: false, error: msg, stdout: '', stderr: err.response?.data?.stderr || '' } });
      toast.error('Request failed. See Output below for details.');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isSuperAdmin(user)) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AI Provider Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose which AI to use when &quot;Use AI to create cards&quot; is enabled on the Upload page.
          </p>
        </div>
        <button
          onClick={handleClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        ) : (
          <form onSubmit={handleSave}>
            <div className="space-y-4">
              <div>
                <label htmlFor="runLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Where does the AI run?
                </label>
                <select
                  id="runLocation"
                  value={runLocation}
                  onChange={handleRunLocationChange}
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="local">Locally (on this machine) – no data sent out</option>
                  <option value="cloud">In the cloud (remote API) – paid or free tier</option>
                </select>
              </div>

              <div>
                <label htmlFor="service" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {runLocation === 'local' ? 'Local service' : 'Cloud service'}
                </label>
                <select
                  id="service"
                  value={service}
                  onChange={handleServiceChange}
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {runLocation === 'local'
                    ? LOCAL_SERVICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)
                    : CLOUD_SERVICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 p-3">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {PROVIDER_INSTRUCTIONS[service]?.freeOrPaid ?? (runLocation === 'cloud' ? 'Paid or free tier' : 'Free (local)')}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {PROVIDER_INSTRUCTIONS[service]?.text ?? (runLocation === 'cloud' ? 'Enter API key and model below.' : 'See Install & run local AI below.')}
                  </p>
                </div>
              </div>

              {(runLocation === 'cloud' || (runLocation === 'local' && service !== 'ollama')) && (
                <>
                  <div>
                    <label htmlFor="cloudApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API key
                    </label>
                    {(() => {
                      const usesApiKey = PROVIDERS_WITH_API_KEY.includes(service);
                      const showStars = usesApiKey && hasApiKey && !aiProviderSettings.cloudApiKey && service === savedCloudProvider;
                      return (
                        <>
                          <input
                            type="password"
                            id="cloudApiKey"
                            value={showStars ? (cloudApiKeyMasked || '••••••••') : aiProviderSettings.cloudApiKey}
                            onChange={(e) => setAiProviderSettings((prev) => ({ ...prev, cloudApiKey: e.target.value }))}
                            placeholder={
                              !usesApiKey
                                ? 'No API key needed'
                                : showStars
                                  ? 'Enter new key to replace'
                                  : hasApiKey && service !== savedCloudProvider
                                    ? 'Enter API key for this provider'
                                    : 'Enter your API key'
                            }
                            className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono"
                            autoComplete="off"
                          />
                          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                            {!usesApiKey
                              ? 'This provider does not require an API key.'
                              : showStars
                                ? 'Enter a new key to replace, or leave blank to keep.'
                                : hasApiKey && service !== savedCloudProvider
                                  ? 'API key on file is for another provider. Enter a key for this provider or switch back.'
                                  : 'Please obtain an API key from the provider above.'}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <label htmlFor="cloudApiUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Base URL
                    </label>
                    <input
                      type="url"
                      id="cloudApiUrl"
                      value={aiProviderSettings.cloudApiUrl}
                      onChange={(e) => setAiProviderSettings((prev) => ({ ...prev, cloudApiUrl: e.target.value }))}
                      placeholder="https://api.openai.com/v1"
                      className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="cloudModel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      id="cloudModel"
                      value={aiProviderSettings.cloudModel}
                      onChange={(e) => setAiProviderSettings((prev) => ({ ...prev, cloudModel: e.target.value }))}
                      placeholder="gpt-4o-mini"
                      className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </>
              )}

              <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setProcessingExpanded(!processingExpanded)}
                  className="flex items-center justify-between w-full text-left font-medium text-gray-700 dark:text-gray-300"
                >
                  <span>Processing limits (chunking &amp; memory)</span>
                  {processingExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Defaults and max values. Lower values reduce memory use; higher allow larger files.
                </p>
                {processingExpanded && (
                  <div className="mt-3 space-y-3 pl-0">
                    <div>
                      <label htmlFor="maxExtractedTextChars" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max extracted text per file (chars)</label>
                      <input
                        type="number"
                        id="maxExtractedTextChars"
                        min={10000}
                        max={PROCESSING_MAX.maxExtractedTextChars}
                        value={processingLimits.maxExtractedTextChars}
                        onChange={(e) => setProcessingLimits((p) => ({ ...p, maxExtractedTextChars: e.target.value }))}
                        className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Default {PROCESSING_DEFAULTS.maxExtractedTextChars.toLocaleString()}. Max {PROCESSING_MAX.maxExtractedTextChars.toLocaleString()}.</p>
                    </div>
                    <div>
                      <label htmlFor="aiChunkChars" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chunk size sent to AI (chars)</label>
                      <input
                        type="number"
                        id="aiChunkChars"
                        min={1000}
                        max={PROCESSING_MAX.aiChunkChars}
                        value={processingLimits.aiChunkChars}
                        onChange={(e) => setProcessingLimits((p) => ({ ...p, aiChunkChars: e.target.value }))}
                        className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Default {PROCESSING_DEFAULTS.aiChunkChars.toLocaleString()}. Max {PROCESSING_MAX.aiChunkChars.toLocaleString()}. Lower = less memory per request.</p>
                    </div>
                    <div>
                      <label htmlFor="aiChunkDelayMs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delay between chunks (ms)</label>
                      <input
                        type="number"
                        id="aiChunkDelayMs"
                        min={0}
                        max={PROCESSING_MAX.aiChunkDelayMs}
                        value={processingLimits.aiChunkDelayMs}
                        onChange={(e) => setProcessingLimits((p) => ({ ...p, aiChunkDelayMs: e.target.value }))}
                        className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Default {PROCESSING_DEFAULTS.aiChunkDelayMs}. Max {PROCESSING_MAX.aiChunkDelayMs}. Reduces rate limits.</p>
                    </div>
                    <div>
                      <label htmlFor="aiMaxTextLength" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AI service max text per request (chars)</label>
                      <input
                        type="number"
                        id="aiMaxTextLength"
                        min={10000}
                        max={PROCESSING_MAX.aiMaxTextLength}
                        value={processingLimits.aiMaxTextLength}
                        onChange={(e) => setProcessingLimits((p) => ({ ...p, aiMaxTextLength: e.target.value }))}
                        className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Default {PROCESSING_DEFAULTS.aiMaxTextLength.toLocaleString()}. Max {PROCESSING_MAX.aiMaxTextLength.toLocaleString()}. Should be ≥ chunk size.</p>
                    </div>
                    <div>
                      <label htmlFor="ollamaChunkChars" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ollama sub-chunk size (chars)</label>
                      <input
                        type="number"
                        id="ollamaChunkChars"
                        min={500}
                        max={PROCESSING_MAX.ollamaChunkChars}
                        value={processingLimits.ollamaChunkChars}
                        onChange={(e) => setProcessingLimits((p) => ({ ...p, ollamaChunkChars: e.target.value }))}
                        className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Default {PROCESSING_DEFAULTS.ollamaChunkChars}. Max {PROCESSING_MAX.ollamaChunkChars}. For local Ollama only; lower avoids OOM.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Install & run local AI</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Run these steps on the machine where the app runs. Then select the provider above and Save.
        </p>
        <div className="space-y-2">
          {Object.entries(LOCAL_AI_INSTALL).map(([key, info]) => {
            const isOpen = installPanelOpen === key || (installPanelOpen === null && defaultInstallPanel() === key);
            return (
              <div key={key} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setInstallPanelOpen(isOpen ? null : key)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium"
                >
                  <span>{info.title}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">port {info.port}</span>
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {isOpen && (
                  <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 space-y-3">
                    {info.runAction && (
                      <div className="flex flex-wrap items-end gap-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                        {(key === 'localai' || key === 'llamacpp') && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Port (avoid conflicts)</label>
                            <input
                              type="number"
                              min={1024}
                              max={65535}
                              value={customPorts[key] ?? info.port}
                              onChange={(e) => setCustomPorts((p) => ({ ...p, [key]: e.target.value }))}
                              className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                        )}
                        {info.downloadAction && (
                          <button
                            type="button"
                            disabled={runState.loading}
                            onClick={() => runLocalSetup(info.downloadAction)}
                            className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {runState.loading && runState.action === info.downloadAction ? 'Downloading…' : 'Download sample model'}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={runState.loading}
                          onClick={() => runLocalSetup(info.runAction, (key === 'localai' || key === 'llamacpp') ? (customPorts[key] || info.port) : undefined)}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {runState.loading && runState.action === info.runAction ? 'Running…' : key === 'ollama' ? 'Run install' : 'Start server'}
                        </button>
                        {runState.loading && runState.action === info.downloadAction && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">(Download can take 2–5 min)</span>
                        )}
                        {runState.result && (runState.action === info.runAction || runState.action === info.downloadAction) && (runState.result.stdout || runState.result.stderr || runState.result.error) && (
                          <details className="w-full mt-1" open={!runState.result.ok}>
                            <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                              Output {!runState.result.ok && '(error)'}
                            </summary>
                            <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                              {runState.result.error && `Error: ${runState.result.error}\n\n`}
                              {runState.result.stdout}
                              {runState.result.stderr ? `\n${runState.result.stderr}` : ''}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                    {info.steps.map((step, i) => (
                      <div key={i}>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{step.label}</p>
                        {step.command ? (
                          <div className="relative group">
                            <pre className="text-xs bg-gray-100 dark:bg-gray-900 rounded p-3 pr-10 overflow-x-auto font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all">
                              {step.command}
                            </pre>
                            <button
                              type="button"
                              onClick={() => copyCommand(step.command)}
                              className="absolute top-2 right-2 p-1.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                              title="Copy"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{step.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Full guide: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">services/LOCAL_AI_SETUP.md</code> in the project.
        </p>
      </div>
    </div>
  );
};

export default AISettings;
