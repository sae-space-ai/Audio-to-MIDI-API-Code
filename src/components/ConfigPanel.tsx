import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { JobConfig, AVAILABLE_INSTRUMENTS } from '../types';

interface ConfigPanelProps {
  config: JobConfig;
  onChange: (config: JobConfig) => void;
}

export default function ConfigPanel({ config, onChange }: ConfigPanelProps) {
  const [showInstruments, setShowInstruments] = useState(false);

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

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-5">
      {/* Timing Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Timing Mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChange({ ...config, timing: 'quantized' })}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              config.timing === 'quantized'
                ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-200'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
            }`}
          >
            🎯 Quantized
          </button>
          <button
            onClick={() => onChange({ ...config, timing: 'free' })}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              config.timing === 'free'
                ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-200'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
            }`}
          >
            🎵 Free
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          {config.timing === 'quantized'
            ? 'Notes snapped to a rhythmic grid for clean notation'
            : 'Preserves exact timing from the original audio'}
        </p>
      </div>

      {/* Score PDFs */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-300">Generate Score PDFs</label>
          <p className="text-xs text-gray-500 mt-0.5">Creates printable sheet music</p>
        </div>
        <button
          onClick={() => onChange({ ...config, score_pdfs: !config.score_pdfs })}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            config.score_pdfs ? 'bg-indigo-500' : 'bg-gray-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
              config.score_pdfs ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Instruments */}
      <div>
        <button
          onClick={() => setShowInstruments(!showInstruments)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <label className="text-sm font-medium text-gray-300">Instruments</label>
            <p className="text-xs text-gray-500 mt-0.5">
              {config.instruments.length === 0
                ? 'Auto-detect (all instruments)'
                : `${config.instruments.length} selected`}
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
                className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {AVAILABLE_INSTRUMENTS.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => toggleInstrument(inst.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                    config.instruments.includes(inst.id)
                      ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-200'
                      : 'bg-white/[0.03] border border-white/5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
                  }`}
                >
                  <span>{inst.emoji}</span>
                  <span className="truncate">{inst.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
