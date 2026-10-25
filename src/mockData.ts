import { SyncResult, PreflightResult, AsyncJobStatus } from './types';

/**
 * Mock data for demo mode - simulates realistic API responses
 */

export const MOCK_PREFLIGHT: PreflightResult = {
  credits: 2,
  estimated_ms: 4200,
};

export const MOCK_SYNC_RESULT: SyncResult = {
  model: 'a2m-1.1',
  midi_url: 'https://cdn.mirelo.ai/demo/transcription.mid',
  musicxml_url: 'https://cdn.mirelo.ai/demo/transcription.musicxml',
  musicxml_optimized: false,
  notes: [
    { pitch: 60, start: 0.0, end: 0.5, instrument: 'acoustic_piano', velocity: 80 },
    { pitch: 64, start: 0.5, end: 1.0, instrument: 'acoustic_piano', velocity: 75 },
    { pitch: 67, start: 1.0, end: 1.5, instrument: 'acoustic_piano', velocity: 82 },
    { pitch: 72, start: 1.5, end: 2.0, instrument: 'acoustic_piano', velocity: 78 },
    { pitch: 60, start: 2.0, end: 2.5, instrument: 'acoustic_piano', velocity: 80 },
    { pitch: 64, start: 2.5, end: 3.0, instrument: 'acoustic_piano', velocity: 76 },
    { pitch: 67, start: 3.0, end: 3.5, instrument: 'acoustic_piano', velocity: 81 },
    { pitch: 72, start: 3.5, end: 4.0, instrument: 'acoustic_piano', velocity: 79 },
    { pitch: 65, start: 4.0, end: 4.5, instrument: 'violin', velocity: 70 },
    { pitch: 69, start: 4.5, end: 5.0, instrument: 'violin', velocity: 72 },
    { pitch: 72, start: 5.0, end: 5.5, instrument: 'violin', velocity: 74 },
    { pitch: 77, start: 5.5, end: 6.0, instrument: 'violin', velocity: 71 },
  ],
  duration_seconds: 30.5,
  note_count: 128,
  tempo_bpm: 118,
  timing: {
    requested: 'performance',
    applied: 'performance',
  },
  time_grid: {
    beats_per_bar: 4,
    meter_source: 'detected',
    pickup_beats: 0,
    score_origin_seconds: 0,
    tempo_bpm: 118,
    tempo_source: 'detected',
    tempo_curve: false,
  },
};

export const MOCK_ASYNC_JOB: AsyncJobStatus = {
  job_id: 'job_demo123456789',
  status: 'processing',
  created_at: new Date().toISOString(),
};

/**
 * Simulate async delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random job ID
 */
export function generateMockJobId(): string {
  return `job_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate varied mock results based on config
 */
export function generateMockResult(config: {
  timing: 'performance' | 'quantized';
  instruments: string[];
  tempo?: { bpm?: number } | null;
}): SyncResult {
  const baseResult = { ...MOCK_SYNC_RESULT };
  
  // Adjust timing
  baseResult.timing.requested = config.timing;
  baseResult.timing.applied = config.timing;
  
  // Adjust tempo
  if (config.tempo?.bpm) {
    baseResult.tempo_bpm = config.tempo.bpm;
    if (baseResult.time_grid) {
      baseResult.time_grid.tempo_bpm = config.tempo.bpm;
      baseResult.time_grid.tempo_source = 'caller';
    }
  }
  
  // Adjust instruments in notes
  if (config.instruments.length > 0 && config.instruments.length < 35) {
    const availableInstruments = config.instruments;
    baseResult.notes = baseResult.notes.map((note, i) => ({
      ...note,
      instrument: availableInstruments[i % availableInstruments.length],
    }));
  }
  
  // Randomize note count slightly
  baseResult.note_count = 128 + Math.floor(Math.random() * 50);
  
  return baseResult;
}
