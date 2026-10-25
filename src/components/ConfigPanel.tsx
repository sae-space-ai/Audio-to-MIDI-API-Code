import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { JobConfig, AVAILABLE_INSTRUMENTS, INSTRUMENT_CATEGORIES } from '../types';

interface ConfigPanelProps {
  config: JobConfig;
  onChange: (config: JobConfig) => void;
  disabled?: boolean;
}

export default function ConfigPanel({ config, onChange, disabled }: ConfigPanelProps) {
  const [showInstruments, setShowInstruments] = useState(false);
  const [showTempo, setShowTempo] = useState(!!config.tempo);

  const toggleInstrument = (id: string) => {
    const instruments = config.instruments.includes(id)
      ? config.instruments.filter(i => i !== id)
      : [...config.instruments, id];
    onChange({ ...config, instruments });
  };

  const selectAll = () => {
    onChange({ ...config, instruments: AVAILABLE_INSTRUMENTS.map(i => i.id) });
  };

  const clearAll = () => {
    onChange({ ...config, instruments: [] });
  };

  const toggleTempo = () => {
    if (showTempo) {
      onChange({ ...config, tempo: null });
      setShowTempo(false);
    } else {
      onChange({ ...config, tempo: { mode: 'fixed' } });
      setShowTempo(true);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-5">
      {/* Timing Mode */}
      <div>
        <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          Timing Mode
          {config.timing === 'quantized' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-normal">
              ✓ Recommended
            </span>
          )}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChange({ ...config, timing: 'performance' })}
            disabled={disabled}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              config.timing === 'performance'
                ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-200'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            🎵 Performance
          </button>
          <button
            onClick={() => onChange({ ...config, timing: 'quantized' })}
            disabled={disabled}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              config.timing === 'quantized'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            🎯 Quantized
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          {config.timing === 'performance'
            ? 'Preserves natural timing with a tempo map'
            : 'Perfect quantization to rhythmic grid (sixteenth notes)'}
        </p>
      </div>

      {/* Tempo Override */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="text-sm font-medium text-gray-300">Fixed Tempo</label>
            <p className="text-xs text-gray-500 mt-0.5">Override detected tempo with a constant BPM</p>
          </div>
          <button
            onClick={toggleTempo}
            disabled={disabled}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
              showTempo ? 'bg-indigo-500' : 'bg-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                showTempo ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        {showTempo && (
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={30}
              max={300}
              value={config.tempo?.bpm || ''}
              onChange={(e) => {
                const bpm = e.target.value ? Number(e.target.value) : undefined;
                onChange({ ...config, tempo: { mode: 'fixed', bpm } });
              }}
              placeholder="Auto-detect"
              className="w-28 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
            />
            <span className="text-xs text-gray-500">BPM (30–300, empty = auto)</span>
          </div>
        )}
      </div>

      {/* Page Size */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Page Size</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChange({ ...config, page_size: 'a4' })}
            disabled={disabled}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              config.page_size === 'a4'
                ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-200'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            📐 A4 (210×297mm)
          </button>
          <button
            onClick={() => onChange({ ...config, page_size: 'letter' })}
            disabled={disabled}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              config.page_size === 'letter'
                ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-200'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            📄 Letter (8.5×11in)
          </button>
        </div>
      </div>

      {/* Optimize MusicXML */}
      <div className="flex items-center justify-between">
        <div className="pr-4">
          <label className="text-sm font-medium text-gray-300">Optimize MusicXML</label>
          <p className="text-xs text-gray-500 mt-0.5">Better staff assignment, beaming & spacing</p>
        </div>
        <button
          onClick={() => onChange({ ...config, optimize_musicxml: !config.optimize_musicxml })}
          disabled={disabled}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            config.optimize_musicxml || config.score_pdfs ? 'bg-indigo-500' : 'bg-gray-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
              config.optimize_musicxml || config.score_pdfs ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Score PDFs */}
      <div className="flex items-center justify-between">
        <div className="pr-4">
          <label className="text-sm font-medium text-gray-300">Generate Score PDFs</label>
          <p className="text-xs text-gray-500 mt-0.5">Engraved sheet music (implies optimize)</p>
        </div>
        <button
          onClick={() => onChange({ ...config, score_pdfs: !config.score_pdfs })}
          disabled={disabled}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            config.score_pdfs ? 'bg-indigo-500' : 'bg-gray-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
              config.score_pdfs ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Preflight */}
      <div className="flex items-center justify-between">
        <div className="pr-4">
          <label className="text-sm font-medium text-gray-300">Preflight Check</label>
          <p className="text-xs text-gray-500 mt-0.5">Estimate credits & time before committing</p>
        </div>
        <button
          onClick={() => onChange({ ...config, usePreflight: !config.usePreflight })}
          disabled={disabled}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            config.usePreflight ? 'bg-indigo-500' : 'bg-gray-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
              config.usePreflight ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Instruments */}
      <div>
        <button
          onClick={() => setShowInstruments(!showInstruments)}
          disabled={disabled}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              Instruments
              {config.instruments.length === AVAILABLE_INSTRUMENTS.length && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-normal">
                  ✓ All Selected
                </span>
              )}
            </label>
            <p className="text-xs text-gray-500 mt-0.5">
              {config.instruments.length === AVAILABLE_INSTRUMENTS.length
                ? 'All instruments included — deselect those not in your audio'
                : `${config.instruments.length} of ${AVAILABLE_INSTRUMENTS.length} selected`}
            </p>
          </div>
          {showInstruments ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {showInstruments && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                disabled={disabled}
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-all disabled:opacity-50 font-medium"
              >
                ✓ Select All ({AVAILABLE_INSTRUMENTS.length})
              </button>
              <button
                onClick={clearAll}
                disabled={disabled}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {INSTRUMENT_CATEGORIES.map((cat) => {
                const instruments = AVAILABLE_INSTRUMENTS.filter(i => i.category === cat.id);
                return (
                  <div key={cat.id}>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">{cat.label}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {instruments.map((inst) => (
                        <button
                          key={inst.id}
                          onClick={() => toggleInstrument(inst.id)}
                          disabled={disabled}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                            config.instruments.includes(inst.id)
                              ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-200'
                              : 'bg-white/[0.03] border border-white/5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
                          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span className="text-sm">{inst.emoji}</span>
                          <span className="truncate">{inst.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {config.instruments.length < AVAILABLE_INSTRUMENTS.length && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 text-sm flex-shrink-0">⚠️</span>
                  <div className="text-[11px] text-amber-300/90 leading-relaxed">
                    <p className="font-semibold mb-1">Removing instruments:</p>
                    <ul className="space-y-0.5 text-amber-400/80">
                      <li>• Deselect instruments <strong>not present</strong> in your audio</li>
                      <li>• Keep instruments that <strong>are playing</strong> in the audio</li>
                      <li>• If unsure, keep all selected for best results</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={selectAll}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-all font-medium disabled:opacity-50"
                >
                  ✓ Restore All Instruments
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
