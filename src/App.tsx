import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Upload, Settings, Loader2, AlertCircle, Key, FileAudio, Waves, Zap, CheckCircle2, Link2 } from 'lucide-react';
import FileUpload from './components/FileUpload';
import ConfigPanel from './components/ConfigPanel';
import JobStatus from './components/JobStatus';
import ResultsPanel from './components/ResultsPanel';
import { JobConfig, SyncResult, AsyncJobStatus, PreflightResult, ApiMode } from './types';

type AppState = 'idle' | 'uploading' | 'preflight' | 'processing' | 'completed' | 'error';

const API_BASE = 'https://api.mirelo.ai';

function generateIdempotencyKey(): string {
  return `a2m-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Get audio duration in milliseconds using Web Audio API
 */
async function getAudioDurationMs(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      const durationMs = Math.round(audio.duration * 1000);
      URL.revokeObjectURL(url);
      resolve(durationMs);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      // Fallback: estimate based on file size (rough: ~10MB per minute for WAV)
      const estimatedMs = Math.round((file.size / (10 * 1024 * 1024)) * 60 * 1000);
      resolve(Math.max(estimatedMs, 5000));
    });
    
    audio.src = url;
  });
}

/**
 * Build the request body according to the API documentation
 */
function buildRequestBody(
  audio: { type: 'asset'; asset_id: string } | { type: 'url'; audio_url: string },
  config: JobConfig
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    audio,
    timing: config.timing,
  };

  // Tempo: only include if set
  if (config.tempo) {
    const tempo: Record<string, unknown> = { mode: config.tempo.mode };
    if (config.tempo.bpm !== undefined && config.tempo.bpm !== null) {
      tempo.bpm = config.tempo.bpm;
    }
    body.tempo = tempo;
  }

  // optimize_musicxml: only include if true (default is false)
  if (config.optimize_musicxml || config.score_pdfs) {
    body.optimize_musicxml = true;
  }

  // score_pdfs: only include if true (default is false)
  if (config.score_pdfs) {
    body.score_pdfs = true;
  }

  // page_size: only include if not default (a4)
  if (config.page_size !== 'a4') {
    body.page_size = config.page_size;
  }

  // instruments: only include if non-empty
  if (config.instruments.length > 0) {
    body.instruments = config.instruments;
  }

  return body;
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('mirelo_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [apiMode, setApiMode] = useState<ApiMode>('sync');
  const [config, setConfig] = useState<JobConfig>({
    timing: 'performance',
    tempo: null,
    optimize_musicxml: false,
    score_pdfs: false,
    page_size: 'a4',
    instruments: [],
    usePreflight: false,
    audioSource: 'file',
    audioUrl: '',
  });
  const [appState, setAppState] = useState<AppState>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<AsyncJobStatus | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem('mirelo_api_key', key);
  };

  const resetState = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setAppState('idle');
    setJobId(null);
    setJobStatus(null);
    setResult(null);
    setPreflight(null);
    setError(null);
    setProgressMessage('');
  }, []);

  /**
   * Upload audio file to Mirelo assets and return asset_id
   */
  const uploadAsset = useCallback(async (file: File, token: string, signal: AbortSignal): Promise<string> => {
    const contentType = file.type || 'application/octet-stream';
    
    // Step 1: Get upload ticket
    const ticketRes = await fetch(`${API_BASE}/v2/assets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content_type: contentType }),
      signal,
    });
    
    if (!ticketRes.ok) {
      const errText = await ticketRes.text();
      throw new Error(`Upload ticket failed (${ticketRes.status}): ${errText}`);
    }
    
    const ticket = await ticketRes.json();
    
    // Step 2: Upload file to presigned URL
    const uploadRes = await fetch(ticket.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
      signal,
    });
    
    if (!uploadRes.ok) {
      throw new Error(`File upload failed (${uploadRes.status})`);
    }
    
    return ticket.asset_id;
  }, []);

  /**
   * Run preflight check to estimate cost
   */
  const runPreflight = useCallback(async (token: string, durationMs: number, signal: AbortSignal): Promise<PreflightResult> => {
    const params = new URLSearchParams({ duration_ms: String(durationMs) });
    
    const res = await fetch(`${API_BASE}/v2/audio-to-midi/v1.0/preflight?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal,
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Preflight failed (${res.status}): ${errText}`);
    }
    
    return res.json();
  }, []);

  /**
   * Poll async job until completion
   */
  const pollJob = useCallback(async (id: string, token: string, signal: AbortSignal): Promise<void> => {
    for (let i = 0; i < 300; i++) {
      if (signal.aborted) throw new Error('Request cancelled');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const res = await fetch(`${API_BASE}/v2/audio-to-midi/v1.0/jobs/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal,
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Poll failed (${res.status}): ${errText}`);
      }
      
      const job: AsyncJobStatus = await res.json();
      setJobStatus(job);
      
      if (job.status === 'succeeded') {
        if (job.result) {
          setResult(job.result);
        }
        setAppState('completed');
        setProgressMessage('');
        return;
      }
      
      if (job.status === 'failed') {
        throw new Error(job.error || 'Job failed');
      }
    }
    
    throw new Error('Job timed out after 5 minutes. You can check status later with job ID: ' + id);
  }, []);

  /**
   * Main submission handler
   */
  const handleSubmit = useCallback(async () => {
    if (!apiKey) {
      setError('Please enter your API key');
      setAppState('error');
      return;
    }

    // Validate audio source
    if (config.audioSource === 'file' && !audioFile) {
      setError('Please upload an audio file');
      setAppState('error');
      return;
    }
    if (config.audioSource === 'url' && !config.audioUrl.trim()) {
      setError('Please enter an audio URL');
      setAppState('error');
      return;
    }
    if (config.audioSource === 'url' && !config.audioUrl.startsWith('http')) {
      setError('Audio URL must start with http:// or https://');
      setAppState('error');
      return;
    }

    // Validate instruments warning
    if (config.instruments.length > 0 && config.instruments.length < 3) {
      // Just a warning, not blocking
    }

    // Create abort controller
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setAppState('uploading');
    setError(null);
    setProgressMessage('');

    try {
      let audioParam: { type: 'asset'; asset_id: string } | { type: 'url'; audio_url: string };
      let durationMs = 30000; // default fallback

      if (config.audioSource === 'file' && audioFile) {
        // Get real duration for preflight
        setProgressMessage('Analyzing audio duration...');
        try {
          durationMs = await getAudioDurationMs(audioFile);
        } catch {
          durationMs = 30000;
        }

        // Upload file
        setProgressMessage('Uploading audio file...');
        const assetId = await uploadAsset(audioFile, apiKey, signal);
        audioParam = { type: 'asset', asset_id: assetId };
      } else {
        // Use URL directly
        audioParam = { type: 'url', audio_url: config.audioUrl.trim() };
        // Can't get duration from URL without fetching, use default
        durationMs = 30000;
      }

      // Preflight check if enabled
      if (config.usePreflight) {
        setAppState('preflight');
        setProgressMessage('Checking cost estimate...');
        const pf = await runPreflight(apiKey, durationMs, signal);
        setPreflight(pf);
        setProgressMessage(`Estimated: ${pf.credits} credits, ~${(pf.estimated_ms / 1000).toFixed(1)}s`);
      }

      // Build request body
      const body = buildRequestBody(audioParam, config);

      setAppState('processing');

      if (apiMode === 'sync') {
        // Synchronous request
        setProgressMessage('Transcribing audio... (connection stays open)');
        const idempotencyKey = generateIdempotencyKey();
        
        const res = await fetch(`${API_BASE}/v2/audio-to-midi/v1.0/sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(body),
          signal,
        });
        
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Transcription failed (${res.status}): ${errText}`);
        }
        
        const data: SyncResult = await res.json();
        setResult(data);
        setAppState('completed');
        setProgressMessage('');
      } else {
        // Async request - create job
        setProgressMessage('Creating job...');
        const jobRes = await fetch(`${API_BASE}/v2/audio-to-midi/v1.0/jobs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal,
        });
        
        if (!jobRes.ok) {
          const errText = await jobRes.text();
          throw new Error(`Job creation failed (${jobRes.status}): ${errText}`);
        }
        
        const job = await jobRes.json();
        setJobId(job.job_id);
        setJobStatus(job);
        setProgressMessage(`Job ${job.job_id} created. Polling for results...`);
        
        // Poll for results
        await pollJob(job.job_id, apiKey, signal);
      }
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request cancelled');
      } else {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(message);
      }
      setAppState('error');
      setProgressMessage('');
    }
  }, [apiKey, audioFile, config, apiMode, uploadAsset, runPreflight, pollJob]);

  const isProcessing = appState === 'uploading' || appState === 'preflight' || appState === 'processing';
  const canSubmit = apiKey && (
    (config.audioSource === 'file' && audioFile) ||
    (config.audioSource === 'url' && config.audioUrl.trim().startsWith('http'))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50 bg-gray-950/80">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Audio-to-MIDI Pro</h1>
              <p className="text-xs text-gray-400">Mirelo AI • a2m-1.1</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
              <Zap className="w-3 h-3" />
              Sync & Async
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* API Key Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">API Key</h2>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-mono"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              🔒 Stored locally in your browser. Sent only to api.mirelo.ai for authentication.
            </p>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* API Mode */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Request Mode</h2>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setApiMode('sync')}
                    disabled={isProcessing}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                      apiMode === 'sync'
                        ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-200'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-semibold">⚡ Synchronous</div>
                    <div className="text-xs mt-0.5 opacity-70">Wait for result</div>
                  </button>
                  <button
                    onClick={() => setApiMode('async')}
                    disabled={isProcessing}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                      apiMode === 'async'
                        ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-200'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-semibold">🔄 Asynchronous</div>
                    <div className="text-xs mt-0.5 opacity-70">Submit & poll</div>
                  </button>
                </div>
              </div>
            </motion.section>

            {/* Audio Source */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <FileAudio className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Audio Source</h2>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfig({ ...config, audioSource: 'file' })}
                    disabled={isProcessing}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      config.audioSource === 'file'
                        ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-200'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload File
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, audioSource: 'url' })}
                    disabled={isProcessing}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      config.audioSource === 'url'
                        ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-200'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Public URL
                  </button>
                </div>

                {config.audioSource === 'file' ? (
                  <FileUpload
                    file={audioFile}
                    onFileChange={setAudioFile}
                    disabled={isProcessing}
                  />
                ) : (
                  <div>
                    <input
                      type="url"
                      value={config.audioUrl}
                      onChange={(e) => setConfig({ ...config, audioUrl: e.target.value })}
                      placeholder="https://example.com/audio.wav"
                      disabled={isProcessing}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Must be a publicly accessible audio URL (WAV, MP3, FLAC, etc.)
                    </p>
                  </div>
                )}
              </div>
            </motion.section>

            {/* Configuration */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Configuration</h2>
              </div>
              <ConfigPanel config={config} onChange={setConfig} disabled={isProcessing} />
            </motion.section>

            {/* Submit Button */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <button
                onClick={
                  isProcessing 
                    ? resetState 
                    : appState === 'completed' 
                    ? resetState 
                    : appState === 'error' 
                    ? () => { resetState(); setTimeout(handleSubmit, 50); }
                    : handleSubmit
                }
                disabled={!isProcessing && !canSubmit && appState === 'idle'}
                className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  !isProcessing && !canSubmit && appState === 'idle'
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : isProcessing
                    ? 'bg-red-600/80 hover:bg-red-600 text-white cursor-pointer'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {appState === 'uploading' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading audio...</>
                ) : appState === 'preflight' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Checking cost estimate...</>
                ) : appState === 'processing' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {apiMode === 'sync' ? 'Transcribing...' : 'Processing job...'}</>
                ) : appState === 'completed' ? (
                  <><CheckCircle2 className="w-4 h-4" /> Start New Conversion</>
                ) : appState === 'error' ? (
                  <><Upload className="w-4 h-4" /> Retry</>
                ) : (
                  <><Waves className="w-4 h-4" /> Transcribe to MIDI</>
                )}
              </button>
              {isProcessing && progressMessage && (
                <p className="mt-2 text-xs text-indigo-300 text-center">{progressMessage}</p>
              )}
              {!isProcessing && !canSubmit && appState === 'idle' && (
                <p className="mt-2 text-xs text-gray-500 text-center">
                  {!apiKey ? 'Enter your API key to begin' : 
                   config.audioSource === 'file' ? 'Upload an audio file to continue' : 
                   'Enter a public audio URL to continue'}
                </p>
              )}
            </motion.section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {/* Preflight Result */}
              {preflight && (
                <motion.section
                  key="preflight"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">Preflight Estimate</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-black/20 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Credits</p>
                        <p className="text-lg font-bold text-white">{preflight.credits}</p>
                      </div>
                      <div className="bg-black/20 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Est. Time</p>
                        <p className="text-lg font-bold text-white">{(preflight.estimated_ms / 1000).toFixed(1)}s</p>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {/* Job Status */}
              {(jobStatus || appState === 'idle' || appState === 'uploading' || appState === 'preflight' || appState === 'processing') && (
                <motion.section
                  key="status"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: 0.3 }}
                >
                  <JobStatus status={jobStatus} appState={appState} jobId={jobId} apiMode={apiMode} progressMessage={progressMessage} result={result} />
                </motion.section>
              )}

              {/* Error */}
              {error && (
                <motion.section
                  key="error"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <h3 className="font-semibold text-red-300">Error</h3>
                    </div>
                    <p className="text-sm text-red-200/80 break-all">{error}</p>
                    {error.includes('CORS') && (
                      <p className="text-xs text-amber-300/80 mt-2">
                        💡 This may be a CORS issue. The Mirelo API may require requests from an allowed origin. Consider using a backend proxy.
                      </p>
                    )}
                  </div>
                </motion.section>
              )}

              {/* Results */}
              {result && (
                <motion.section
                  key="results"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <ResultsPanel result={result} />
                </motion.section>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {appState === 'idle' && !result && !error && !preflight && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                  <Music className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Ready to Transcribe</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Upload an audio file or provide a URL. The AI will transcribe your audio into MIDI, MusicXML, and optional sheet music PDFs.
                </p>
                <div className="mt-6 grid grid-cols-4 gap-3 text-center">
                  <div className="bg-black/20 rounded-xl p-3">
                    <div className="text-xl mb-1">🎵</div>
                    <p className="text-[10px] text-gray-500">MIDI</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3">
                    <div className="text-xl mb-1">📄</div>
                    <p className="text-[10px] text-gray-500">MusicXML</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3">
                    <div className="text-xl mb-1">🎼</div>
                    <p className="text-[10px] text-gray-500">PDFs</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3">
                    <div className="text-xl mb-1">📊</div>
                    <p className="text-[10px] text-gray-500">Notes</p>
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                    <p className="text-xs text-indigo-300/70">
                      💡 <strong>Performance</strong> timing preserves natural feel. <strong>Quantized</strong> snaps to a rhythmic grid.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <p className="text-xs text-purple-300/70">
                      🎯 Leave instruments empty for auto-detection. A partial list may cause issues.
                    </p>
                  </div>
                </div>
              </motion.section>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-600 gap-2">
          <span>Audio-to-MIDI Pro — Full-featured transcription client</span>
          <span>API by Mirelo AI • Endpoint: /v2/audio-to-midi/v1.0</span>
        </div>
      </footer>
    </div>
  );
}
