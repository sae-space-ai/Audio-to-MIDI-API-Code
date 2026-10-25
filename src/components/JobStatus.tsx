import { Loader2, CheckCircle2, Clock, AlertCircle, Zap, Timer } from 'lucide-react';
import { AsyncJobStatus, ApiMode, SyncResult } from '../types';

interface JobStatusProps {
  status: AsyncJobStatus | null;
  appState: string;
  jobId: string | null;
  apiMode: ApiMode;
  progressMessage?: string;
  result?: SyncResult | null;
  demoMode?: boolean;
}

export default function JobStatus({ status, appState, jobId, apiMode, progressMessage = '', result, demoMode = false }: JobStatusProps) {
  if (appState === 'idle' && !status) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Status</h3>
        </div>
        <p className="text-sm text-gray-500">
          {demoMode ? '🎭 Demo ready — upload audio to simulate transcription' : 'Waiting for transcription...'}
        </p>
        <div className="mt-4 p-3 rounded-xl bg-black/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Mode</span>
            <span className="text-gray-300 font-medium">
              {demoMode ? '🎭 Demo' : apiMode === 'sync' ? '⚡ Synchronous' : '🔄 Asynchronous'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Endpoint</span>
            <code className="text-indigo-300 text-[10px]">
              {demoMode ? '(simulated)' : apiMode === 'sync' ? '/v2/audio-to-midi/v1.0/sync' : '/v2/audio-to-midi/v1.0/jobs'}
            </code>
          </div>
          {demoMode && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">API Key</span>
              <span className="text-emerald-400 text-[10px]">✓ Not required</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (appState === 'uploading') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Uploading</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-sm text-gray-300">{progressMessage || 'Uploading audio to Mirelo assets...'}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse w-2/3 transition-all duration-500" />
          </div>
          <div className="text-[10px] text-gray-600 space-y-0.5">
            <p>1. POST /v2/assets → get upload ticket</p>
            <p>2. PUT presigned URL → upload file</p>
            <p>3. Receive asset_id</p>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'preflight') {
    return (
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">Preflight Check</h3>
        </div>
        <p className="text-sm text-gray-300">{progressMessage || 'Checking cost estimate...'}</p>
        <div className="mt-3 text-[10px] text-gray-500">
          <p>GET /v2/audio-to-midi/v1.0/preflight?duration_ms=...</p>
        </div>
      </div>
    );
  }

  if (appState === 'processing' && apiMode === 'sync') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Transcribing (Sync)</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-sm text-gray-300">{progressMessage || 'Sync request in progress...'}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 animate-pulse w-1/2" />
          </div>
          <div className="p-3 rounded-xl bg-black/20 text-[10px] text-gray-500 space-y-1">
            <p>POST /v2/audio-to-midi/v1.0/sync</p>
            <p>Headers: Authorization, Content-Type, Idempotency-Key</p>
            <p>Connection stays open until result is ready.</p>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'processing' && status) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Processing (Async)</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Job ID</span>
            <code className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded font-mono truncate max-w-[200px]">
              {status.job_id}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Status</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
              status.status === 'queued' ? 'text-blue-300 bg-blue-500/10' :
              status.status === 'processing' ? 'text-yellow-300 bg-yellow-500/10' :
              'text-gray-300 bg-gray-500/10'
            }`}>
              {status.status}
            </span>
          </div>
          {status.created_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Created</span>
              <span className="text-xs text-gray-400">
                {new Date(status.created_at).toLocaleTimeString()}
              </span>
            </div>
          )}
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 animate-pulse w-1/2" />
          </div>
          <p className="text-xs text-gray-500 text-center">
            Polling GET /v2/audio-to-midi/v1.0/jobs/{status.job_id?.slice(0, 12)}...
          </p>
        </div>
      </div>
    );
  }

  if (appState === 'completed') {
    return (
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-emerald-300 uppercase tracking-wider">
            {apiMode === 'sync' ? 'Sync Complete' : 'Job Succeeded'}
          </h3>
        </div>
        <div className="space-y-2">
          {jobId && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Job ID</span>
              <code className="text-xs text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded font-mono truncate max-w-[200px]">
                {jobId}
              </code>
            </div>
          )}
          {status?.created_at && status?.completed_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Duration</span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {Math.round((new Date(status.completed_at).getTime() - new Date(status.created_at).getTime()) / 1000)}s
              </span>
            </div>
          )}
          {result && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Notes detected</span>
                <span className="text-xs text-emerald-300">{result.note_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Duration</span>
                <span className="text-xs text-emerald-300">{result.duration_seconds.toFixed(1)}s</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (appState === 'error') {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-semibold text-red-300 uppercase tracking-wider">Failed</h3>
        </div>
        {jobId && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Job ID</span>
            <code className="text-xs text-red-300 bg-red-500/10 px-2 py-0.5 rounded font-mono truncate max-w-[200px]">
              {jobId}
            </code>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          You can retry the request or adjust your settings.
        </p>
      </div>
    );
  }

  return null;
}
