export type TimingMode = 'performance' | 'quantized';
export type PageSize = 'a4' | 'letter';
export type ApiMode = 'sync' | 'async';
export type AudioSource = 'file' | 'url';

export interface TempoConfig {
  mode: 'fixed';
  bpm?: number;
}

export interface JobConfig {
  timing: TimingMode;
  tempo: TempoConfig | null;
  optimize_musicxml: boolean;
  score_pdfs: boolean;
  page_size: PageSize;
  instruments: string[];
  usePreflight: boolean;
  audioSource: AudioSource;
  audioUrl: string;
}

export interface NoteData {
  pitch: number;
  start: number;
  end: number;
  instrument: string;
  velocity: number;
}

export interface SyncResult {
  model: string;
  midi_url?: string;
  musicxml_url?: string;
  musicxml_optimized: boolean;
  notes: NoteData[];
  duration_seconds: number;
  note_count: number;
  tempo_bpm: number;
  timing: {
    requested: string;
    applied: string;
    fallback_reason?: string;
    preserved_articulations?: number;
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
  score_bundle_url?: string;
  score_manifest_url?: string;
  score_pdfs?: Array<{ url: string; label: string }>;
}

export interface AsyncJobStatus {
  job_id: string;
  status: 'processing' | 'succeeded' | 'failed' | 'queued';
  created_at?: string;
  completed_at?: string;
  result?: SyncResult;
  error?: string;
}

export interface PreflightResult {
  credits: number;
  estimated_ms: number;
}

export const AVAILABLE_INSTRUMENTS = [
  { id: 'acoustic_piano', label: 'Acoustic Piano', emoji: '🎹', category: 'keys' },
  { id: 'electric_piano', label: 'Electric Piano', emoji: '🎹', category: 'keys' },
  { id: 'chromatic_percussion', label: 'Chromatic Percussion', emoji: '🔔', category: 'keys' },
  { id: 'organ', label: 'Organ', emoji: '🎹', category: 'keys' },
  { id: 'acoustic_guitar', label: 'Acoustic Guitar', emoji: '🎸', category: 'guitar' },
  { id: 'clean_electric_guitar', label: 'Clean Electric Guitar', emoji: '🎸', category: 'guitar' },
  { id: 'distorted_electric_guitar', label: 'Distorted Guitar', emoji: '🎸', category: 'guitar' },
  { id: 'acoustic_bass', label: 'Acoustic Bass', emoji: '🎸', category: 'guitar' },
  { id: 'electric_bass', label: 'Electric Bass', emoji: '🎸', category: 'guitar' },
  { id: 'violin', label: 'Violin', emoji: '🎻', category: 'strings' },
  { id: 'viola', label: 'Viola', emoji: '🎻', category: 'strings' },
  { id: 'cello', label: 'Cello', emoji: '🎻', category: 'strings' },
  { id: 'contrabass', label: 'Contrabass', emoji: '🎻', category: 'strings' },
  { id: 'orchestral_harp', label: 'Orchestral Harp', emoji: '🎵', category: 'strings' },
  { id: 'string_ensemble', label: 'String Ensemble', emoji: '🎼', category: 'strings' },
  { id: 'synth_strings', label: 'Synth Strings', emoji: '🎼', category: 'strings' },
  { id: 'voice', label: 'Voice', emoji: '🎤', category: 'voice' },
  { id: 'trumpet', label: 'Trumpet', emoji: '🎺', category: 'brass' },
  { id: 'trombone', label: 'Trombone', emoji: '🎺', category: 'brass' },
  { id: 'tuba', label: 'Tuba', emoji: '🎺', category: 'brass' },
  { id: 'french_horn', label: 'French Horn', emoji: '🎺', category: 'brass' },
  { id: 'brass_section', label: 'Brass Section', emoji: '🎺', category: 'brass' },
  { id: 'soprano_and_alto_sax', label: 'Soprano/Alto Sax', emoji: '🎷', category: 'woodwind' },
  { id: 'tenor_sax', label: 'Tenor Sax', emoji: '🎷', category: 'woodwind' },
  { id: 'baritone_sax', label: 'Baritone Sax', emoji: '🎷', category: 'woodwind' },
  { id: 'oboe', label: 'Oboe', emoji: '🎵', category: 'woodwind' },
  { id: 'english_horn', label: 'English Horn', emoji: '🎵', category: 'woodwind' },
  { id: 'bassoon', label: 'Bassoon', emoji: '🎵', category: 'woodwind' },
  { id: 'clarinet', label: 'Clarinet', emoji: '🎵', category: 'woodwind' },
  { id: 'flutes', label: 'Flutes', emoji: '🪈', category: 'woodwind' },
  { id: 'synth_lead', label: 'Synth Lead', emoji: '🎛️', category: 'synth' },
  { id: 'synth_pad', label: 'Synth Pad', emoji: '🎛️', category: 'synth' },
  { id: 'drums', label: 'Drums', emoji: '🥁', category: 'percussion' },
  { id: 'timpani', label: 'Timpani', emoji: '🥁', category: 'percussion' },
  { id: 'orchestra_hit', label: 'Orchestra Hit', emoji: '🎼', category: 'percussion' },
] as const;

export const INSTRUMENT_CATEGORIES = [
  { id: 'keys', label: 'Keys' },
  { id: 'guitar', label: 'Guitar & Bass' },
  { id: 'strings', label: 'Strings' },
  { id: 'voice', label: 'Voice' },
  { id: 'brass', label: 'Brass' },
  { id: 'woodwind', label: 'Woodwind' },
  { id: 'synth', label: 'Synth' },
  { id: 'percussion', label: 'Percussion' },
] as const;
