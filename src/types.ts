export interface JobConfig {
  timing: 'quantized' | 'free';
  instruments: string[];
  score_pdfs: boolean;
}

export interface JobStatus {
  job_id: string;
  status: 'processing' | 'succeeded' | 'failed' | 'queued';
  created_at?: string;
  completed_at?: string;
  result?: JobResult;
  error?: string;
}

export interface NoteData {
  pitch: number;
  start: number;
  end: number;
  instrument: string;
  velocity: number;
}

export interface JobResult {
  model: string;
  midi_url?: string;
  musicxml_url?: string;
  musicxml_optimized?: boolean;
  notes: NoteData[];
  duration_seconds: number;
  note_count: number;
  tempo_bpm: number;
  timing: {
    requested: string;
    applied: string;
  };
  time_grid?: {
    beats_per_bar: number;
    meter_source: string;
    pickup_beats: number;
    score_origin_seconds: number;
    tempo_bpm: number;
    tempo_source: string;
    tempo_curve: boolean;
  };
}

export const AVAILABLE_INSTRUMENTS = [
  { id: 'piano', label: 'Piano', emoji: '🎹' },
  { id: 'violin', label: 'Violin', emoji: '🎻' },
  { id: 'viola', label: 'Viola', emoji: '🎻' },
  { id: 'cello', label: 'Cello', emoji: '🎻' },
  { id: 'contrabass', label: 'Contrabass', emoji: '🎻' },
  { id: 'string_ensemble', label: 'String Ensemble', emoji: '🎼' },
  { id: 'trumpet', label: 'Trumpet', emoji: '🎺' },
  { id: 'trombone', label: 'Trombone', emoji: '🎺' },
  { id: 'tuba', label: 'Tuba', emoji: '🎺' },
  { id: 'french_horn', label: 'French Horn', emoji: '🎺' },
  { id: 'brass_section', label: 'Brass Section', emoji: '🎺' },
  { id: 'soprano_and_alto_sax', label: 'Soprano/Alto Sax', emoji: '🎷' },
  { id: 'tenor_sax', label: 'Tenor Sax', emoji: '🎷' },
  { id: 'baritone_sax', label: 'Baritone Sax', emoji: '🎷' },
  { id: 'oboe', label: 'Oboe', emoji: '🎵' },
  { id: 'english_horn', label: 'English Horn', emoji: '🎵' },
  { id: 'bassoon', label: 'Bassoon', emoji: '🎵' },
  { id: 'clarinet', label: 'Clarinet', emoji: '🎵' },
  { id: 'flutes', label: 'Flutes', emoji: '🪈' },
  { id: 'guitar', label: 'Guitar', emoji: '🎸' },
  { id: 'bass_guitar', label: 'Bass Guitar', emoji: '🎸' },
  { id: 'drums', label: 'Drums', emoji: '🥁' },
  { id: 'voice', label: 'Voice', emoji: '🎤' },
  { id: 'synth', label: 'Synthesizer', emoji: '🎛️' },
] as const;
