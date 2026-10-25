import { Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { JobStatus as JobStatusType } from '../types';

interface JobStatusProps {
  status: JobStatusType | null;
  appState: string;
  jobId: string | null;
}

export default function JobStatus({ status, appState, jobId }: JobStatusProps) {
  if (appState === 'idle' && !status) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Job Status</h3>
        </div>
        <p className="text-sm text-gray-500">Waiting for conversion...</p>
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
            <span className="text-sm text-gray-300">Uploading audio file...</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse w-2/3" />
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
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Processing</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Job ID</span>
            <code className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded font-mono">
              {status.job_id?.slice(0, 16)}...
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Status</span>
            <span className="text-xs font-medium text-yellow-300 bg-yellow-500/10 px-2 py-0.5 rounded-full capitalize">
              {status.status}
            </span>
          </div>
          {status.created_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Started</span>
              <span className="text-xs text-gray-400">
                {new Date(status.created_at).toLocaleTimeString()}
              </span>
            </div>
          )}
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 animate-pulse w-1/2" />
          </div>
          <p className="text-xs text-gray-500 text-center">
            AI is analyzing your audio and generating MIDI notation...
          </p>
        </div>
      </div>
    );
  }

  if (appState === 'completed' && status) {
    return (
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-emerald-300 uppercase tracking-wider">Completed</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Job ID</span>
            <code className="text-xs text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
              {status.job_id?.slice(0, 16)}...
            </code>
          </div>
          {status.created_at && status.completed_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Duration</span>
              <span className="text-xs text-gray-400">
                {Math.round((new Date(status.completed_at).getTime() - new Date(status.created_at).getTime()) / 1000)}s
              </span>
            </div>
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
            <code className="text-xs text-red-300 bg-red-500/10 px-2 py-0.5 rounded font-mono">
              {jobId.slice(0, 16)}...
            </code>
          </div>
        )}
      </div>
    );
  }

  return null;
}
