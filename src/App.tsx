import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Upload, Settings, Loader2, AlertCircle, Key, FileAudio, Waves, Zap } from 'lucide-react';
import FileUpload from './components/FileUpload';
import ConfigPanel from './components/ConfigPanel';
import JobStatus from './components/JobStatus';
import ResultsPanel from './components/ResultsPanel';
import { JobConfig, SyncResult, AsyncJobStatus, PreflightResult, ApiMode } from './types';

type AppState = 'idle' | 'uploading' | 'preflight' | 'processing' | 'completed' | 'error';

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
  });
  const [appState, setAppState] = useState<AppState>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<AsyncJobStatus | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem('mirelo_api_key', key);
  };

  const resetState = () => {
    setAppState('idle');
    setJobId(null);
    setJobStatus(null);
    setResult(null);
    setPreflight(null);
    setError(null);
  };

  const uploadAsset = useCallback(async (file: File, token: string): Promise<string> => {
    const contentType = file.type || 'application/octet-stream';
    
    const ticketRes = await fetch('https://api.mirelo.ai/v2/assets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content_type: contentType }),
    });
    
    if (!ticketRes.ok) {
      const errText = await ticketRes.text();
      throw new Error(`Failed to get upload ticket: ${ticketRes.status} - ${errText}`);
    }
    
    const ticket = await ticketRes.json();
    
    const uploadRes = await fetch(ticket.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
    
    if (!uploadRes.ok) {
      throw new Error(`Failed to upload file: ${uploadRes.status}`);
    }
    
    return ticket.asset_id;
  }, []);

  const buildRequestBody = useCallback((assetId: string) => {
    const body: Record<string, unknown> = {
      audio: { type: 'asset', asset_id: assetId },
      timing: config.timing,
      optimize_musicxml: config.optimize_musicxml,
      score_pdfs: config.score_pdfs,
      page_size: config.page_size,
    };
    
    if (config.tempo) {
      body.tempo = config.tempo;
    }
    
    if (config.instruments.length > 0) {
      body.instruments = config.instruments;
    }
    
    return body;
  }, [config]);

  const runPreflight = useCallback(async (token: string): Promise<PreflightResult> => {
    // We need to know the duration - for now we'll estimate or skip
    const res = await fetch('https://api.mirelo.ai/v2/audio-to-midi/v1.0/preflight?duration_ms=30000', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!res.ok) {
      throw new Error(`Preflight failed: ${res.status}`);
    }
    
    return res.json();
  }, []);

  const pollJob = useCallback(async (id: string, token: string): Promise<void> => {
    for (let i = 0; i < 300; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const res = await fetch(`https://api.mirelo.ai/v2/audio-to-midi/v1.0/jobs/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error(`Failed to poll job: ${res.status}`);
      }
      
      const job = await res.json();
      setJobStatus(job);
      
      if (job.status === 'succeeded') {
        setResult(job.result);
        setAppState('completed');
        return;
      }
      
      if (job.status === 'failed' || job.status === 'error') {
        throw new Error(job.error || 'Job failed');
      }
    }
    
    throw new Error('Job timed out after 5 minutes');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!apiKey || !audioFile) return;
    
    setAppState('uploading');
    setError(null);
    
    try {
      // Upload audio file
      const assetId = await uploadAsset(audioFile, apiKey);
      
      // Preflight check if enabled
      if (config.usePreflight) {
        setAppState('preflight');
        const pf = await runPreflight(apiKey);
        setPreflight(pf);
      }
      
      setAppState('processing');
      const body = buildRequestBody(assetId);
      
      if (apiMode === 'sync') {
        // Synchronous request
        const res = await fetch('https://api.mirelo.ai/v2/audio-to-midi/v1.0/sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Sync request failed: ${res.status} - ${errText}`);
        }
        
        const data = await res.json();
        setResult(data);
        setAppState('completed');
      } else {
        // Async request
        const jobRes = await fetch('https://api.mirelo.ai/v2/audio-to-midi/v1.0/jobs', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        if (!jobRes.ok) {
          const errText = await jobRes.text();
          throw new Error(`Failed to create job: ${jobRes.status} - ${errText}`);
        }
        
        const job = await jobRes.json();
        setJobId(job.job_id);
        setJobStatus(job);
        
        await pollJob(job.job_id, apiKey);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      setAppState('error');
    }
  }, [apiKey, audioFile, config, apiMode, uploadAsset, buildRequestBody, runPreflight, pollJob]);

  const isProcessing = appState === 'uploading' || appState === 'preflight' || appState === 'processing';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Audio-to-MIDI Pro</h1>
              <p className="text-xs text-gray-400">Mirelo AI • v1.0</p>
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
              Stored locally in your browser. Never sent to third-party servers.
            </p>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
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

            {/* File Upload */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <FileAudio className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Audio File</h2>
              </div>
              <FileUpload
                file={audioFile}
                onFileChange={setAudioFile}
                disabled={isProcessing}
              />
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
                onClick={!isProcessing && appState !== 'completed' ? handleSubmit : resetState}
                disabled={(!apiKey || !audioFile) && !isProcessing && appState !== 'completed'}
                className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  (!apiKey || !audioFile) && !isProcessing && appState !== 'completed'
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : isProcessing
                    ? 'bg-indigo-600/50 text-indigo-200 cursor-wait'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {appState === 'uploading' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading audio...</>
                ) : appState === 'preflight' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Checking cost estimate...</>
                ) : appState === 'processing' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {apiMode === 'sync' ? 'Transcribing...' : 'Processing job...'}</>
                ) : appState === 'completed' || appState === 'error' ? (
                  <><Upload className="w-4 h-4" /> Start New Conversion</>
                ) : (
                  <><Waves className="w-4 h-4" /> Transcribe to MIDI</>
                )}
              </button>
              {(!apiKey || !audioFile) && appState === 'idle' && (
                <p className="mt-2 text-xs text-gray-500 text-center">
                  {!apiKey && !audioFile ? 'Enter your API key and upload an audio file to begin' :
                   !apiKey ? 'Enter your API key to continue' : 'Upload an audio file to continue'}
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
              {(jobStatus || appState === 'idle' || appState === 'uploading' || appState === 'preflight') && (
                <motion.section
                  key="status"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: 0.3 }}
                >
                  <JobStatus status={jobStatus} appState={appState} jobId={jobId} apiMode={apiMode} />
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
                    <p className="text-sm text-red-200/80">{error}</p>
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
                  Upload an audio file and configure your settings. The AI will transcribe your audio into MIDI, MusicXML, and optional sheet music PDFs.
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
                <div className="mt-6 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                  <p className="text-xs text-indigo-300/70">
                    💡 <strong>Tip:</strong> Use <em>performance</em> timing to preserve the natural feel, or <em>quantized</em> for clean notation on a rhythmic grid.
                  </p>
                </div>
              </motion.section>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-gray-600">
          <span>Audio-to-MIDI Pro</span>
          <span>API by Mirelo AI • a2m-1.1</span>
        </div>
      </footer>
    </div>
  );
}
