import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Upload, Settings, Loader2, CheckCircle2, AlertCircle, Download, Key, FileAudio, Waves } from 'lucide-react';
import FileUpload from './components/FileUpload';
import ConfigPanel from './components/ConfigPanel';
import JobStatus from './components/JobStatus';
import ResultsPanel from './components/ResultsPanel';
import { JobConfig, JobResult, JobStatus as JobStatusType } from './types';

type AppState = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('mirelo_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [config, setConfig] = useState<JobConfig>({
    timing: 'quantized',
    instruments: [],
    score_pdfs: true,
  });
  const [appState, setAppState] = useState<AppState>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusType | null>(null);
  const [result, setResult] = useState<JobResult | null>(null);
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
    setError(null);
  };

  const uploadAsset = useCallback(async (file: File, token: string): Promise<string> => {
    const contentType = file.type || 'application/octet-stream';
    
    // Step 1: Get upload ticket
    const ticketRes = await fetch('https://api.mirelo.ai/v2/assets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content_type: contentType }),
    });
    
    if (!ticketRes.ok) {
      throw new Error(`Failed to get upload ticket: ${ticketRes.status}`);
    }
    
    const ticket = await ticketRes.json();
    
    // Step 2: Upload file to presigned URL
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
      
      setAppState('processing');
      
      // Create job
      const body: Record<string, unknown> = {
        timing: config.timing,
        score_pdfs: config.score_pdfs,
        audio: { type: 'asset', asset_id: assetId },
      };
      
      if (config.instruments.length > 0) {
        body.instruments = config.instruments;
      }
      
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
      
      // Poll for results
      await pollJob(job.job_id, apiKey);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      setAppState('error');
    }
  }, [apiKey, audioFile, config, uploadAsset, pollJob]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Audio to MIDI</h1>
              <p className="text-xs text-gray-400">Powered by Mirelo AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-gray-400">v1.0</span>
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
                  placeholder="Enter your Mirelo API key..."
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Your key is stored locally in your browser and never sent to any third-party server.
            </p>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Upload & Config */}
          <div className="space-y-8">
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
                disabled={appState === 'uploading' || appState === 'processing'}
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
              <ConfigPanel config={config} onChange={setConfig} />
            </motion.section>

            {/* Submit Button */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <button
                onClick={appState === 'idle' || appState === 'error' ? handleSubmit : resetState}
                disabled={!apiKey || !audioFile}
                className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  !apiKey || !audioFile
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : appState === 'uploading' || appState === 'processing'
                    ? 'bg-indigo-600/50 text-indigo-200 cursor-wait'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
                }`}
              >
                {(appState === 'uploading' || appState === 'processing') ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {appState === 'uploading' ? 'Uploading...' : 'Processing...'}
                  </>
                ) : appState === 'completed' || appState === 'error' ? (
                  <>
                    <Upload className="w-4 h-4" />
                    Start New Conversion
                  </>
                ) : (
                  <>
                    <Waves className="w-4 h-4" />
                    Convert to MIDI
                  </>
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

          {/* Right Column - Status & Results */}
          <div className="space-y-8">
            <AnimatePresence mode="wait">
              {/* Job Status */}
              {(jobStatus || appState === 'idle') && (
                <motion.section
                  key="status"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: 0.3 }}
                >
                  <JobStatus status={jobStatus} appState={appState} jobId={jobId} />
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
            {appState === 'idle' && !result && !error && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                  <Music className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Ready to Convert</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                  Upload an audio file and configure your settings. The AI will transcribe your audio into MIDI notation with instrument detection.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl mb-1">🎵</div>
                    <p className="text-xs text-gray-500">MIDI Output</p>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">📄</div>
                    <p className="text-xs text-gray-500">MusicXML</p>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">🎼</div>
                    <p className="text-xs text-gray-500">Score PDFs</p>
                  </div>
                </div>
              </motion.section>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-gray-600">
          <span>Audio to MIDI Converter</span>
          <span>API by Mirelo AI</span>
        </div>
      </footer>
    </div>
  );
}
