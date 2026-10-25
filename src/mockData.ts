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
  musicxml_optimized: true,
  notes: [
    // Compás 1 - Piano (cuartas perfectamente cuantizadas)
    { pitch: 60, start: 0.000, end: 0.500, instrument: 'acoustic_piano', velocity: 80 },
    { pitch: 64, start: 0.500, end: 1.000, instrument: 'acoustic_piano', velocity: 75 },
    { pitch: 67, start: 1.000, end: 1.500, instrument: 'acoustic_piano', velocity: 82 },
    { pitch: 72, start: 1.500, end: 2.000, instrument: 'acoustic_piano', velocity: 78 },
    // Compás 2 - Piano
    { pitch: 60, start: 2.000, end: 2.500, instrument: 'acoustic_piano', velocity: 80 },
    { pitch: 64, start: 2.500, end: 3.000, instrument: 'acoustic_piano', velocity: 76 },
    { pitch: 67, start: 3.000, end: 3.500, instrument: 'acoustic_piano', velocity: 81 },
    { pitch: 72, start: 3.500, end: 4.000, instrument: 'acoustic_piano', velocity: 79 },
    // Compás 3 - Violín (cuartas cuantizadas)
    { pitch: 65, start: 4.000, end: 4.500, instrument: 'violin', velocity: 70 },
    { pitch: 69, start: 4.500, end: 5.000, instrument: 'violin', velocity: 72 },
    { pitch: 72, start: 5.000, end: 5.500, instrument: 'violin', velocity: 74 },
    { pitch: 77, start: 5.500, end: 6.000, instrument: 'violin', velocity: 71 },
    // Compás 4 - Violín
    { pitch: 65, start: 6.000, end: 6.500, instrument: 'violin', velocity: 73 },
    { pitch: 69, start: 6.500, end: 7.000, instrument: 'violin', velocity: 75 },
    { pitch: 72, start: 7.000, end: 7.500, instrument: 'violin', velocity: 77 },
    { pitch: 77, start: 7.500, end: 8.000, instrument: 'violin', velocity: 74 },
    // Compás 5 - Flauta (corcheas cuantizadas)
    { pitch: 74, start: 8.000, end: 8.250, instrument: 'flutes', velocity: 68 },
    { pitch: 76, start: 8.250, end: 8.500, instrument: 'flutes', velocity: 70 },
    { pitch: 77, start: 8.500, end: 8.750, instrument: 'flutes', velocity: 72 },
    { pitch: 79, start: 8.750, end: 9.000, instrument: 'flutes', velocity: 71 },
    { pitch: 81, start: 9.000, end: 9.250, instrument: 'flutes', velocity: 73 },
    { pitch: 79, start: 9.250, end: 9.500, instrument: 'flutes', velocity: 70 },
    { pitch: 77, start: 9.500, end: 9.750, instrument: 'flutes', velocity: 69 },
    { pitch: 76, start: 9.750, end: 10.000, instrument: 'flutes', velocity: 68 },
  ],
  duration_seconds: 30.5,
  note_count: 128,
  tempo_bpm: 120,
  timing: {
    requested: 'quantized',
    applied: 'quantized',
  },
  time_grid: {
    beats_per_bar: 4,
    meter_source: 'detected',
    pickup_beats: 0,
    score_origin_seconds: 0,
    tempo_bpm: 120,
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
 * Quantize a time value to the nearest grid position
 * @param time - Time in seconds
 * @param bpm - Tempo in BPM
 * @param subdivision - Grid subdivision (1 = quarter, 0.5 = eighth, 0.25 = sixteenth)
 */
function quantizeTime(time: number, bpm: number, subdivision: number = 0.25): number {
  const beatDuration = 60 / bpm; // Duration of one beat in seconds
  const gridDuration = beatDuration * subdivision; // Duration of grid cell
  return Math.round(time / gridDuration) * gridDuration;
}

/**
 * Generate varied mock results based on config with perfect quantization
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
  const bpm = config.tempo?.bpm || 120;
  baseResult.tempo_bpm = bpm;
  if (baseResult.time_grid) {
    baseResult.time_grid.tempo_bpm = bpm;
    baseResult.time_grid.tempo_source = config.tempo?.bpm ? 'caller' : 'detected';
  }
  
  // Quantize notes if timing is 'quantized'
  if (config.timing === 'quantized') {
    baseResult.notes = baseResult.notes.map(note => ({
      ...note,
      start: quantizeTime(note.start, bpm, 0.25), // Quantize to sixteenth notes
      end: quantizeTime(note.end, bpm, 0.25),
    }));
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
