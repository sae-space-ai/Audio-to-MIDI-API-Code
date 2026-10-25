import { Download, Music, Clock, Hash, Zap, FileText } from 'lucide-react';
import { SyncResult } from '../types';
import { generateMidiFile, generateMusicXml, createDownloadUrl } from '../fileGenerators';
import { useEffect, useState, useRef } from 'react';

interface ResultsPanelProps {
  result: SyncResult;
}

export default function ResultsPanel({ result }: ResultsPanelProps) {
  const [downloadUrls, setDownloadUrls] = useState<{
    midi?: string;
    musicxml?: string;
  }>({});
  const urlsRef = useRef<{ midi?: string; musicxml?: string }>({});

  // Generate real downloadable files
  useEffect(() => {
    // Revoke previous URLs
    if (urlsRef.current.midi) URL.revokeObjectURL(urlsRef.current.midi);
    if (urlsRef.current.musicxml) URL.revokeObjectURL(urlsRef.current.musicxml);

    if (result.notes && result.notes.length > 0) {
      const midiBlob = generateMidiFile(result.notes, result.tempo_bpm, 'Audio-to-MIDI Transcription');
      const musicxmlBlob = generateMusicXml(result.notes, result.tempo_bpm, 'Audio-to-MIDI Transcription');
      
      const midiUrl = createDownloadUrl(midiBlob);
      const musicxmlUrl = createDownloadUrl(musicxmlBlob);
      
      urlsRef.current = { midi: midiUrl, musicxml: musicxmlUrl };
      setDownloadUrls({ midi: midiUrl, musicxml: musicxmlUrl });
    }

    // Cleanup on unmount
    return () => {
      if (urlsRef.current.midi) URL.revokeObjectURL(urlsRef.current.midi);
      if (urlsRef.current.musicxml) URL.revokeObjectURL(urlsRef.current.musicxml);
    };
  }, [result]);

  const downloadLinks = [
    downloadUrls.midi && { url: downloadUrls.midi, label: 'MIDI File', ext: '.mid', icon: '🎵', filename: 'transcription.mid' },
    downloadUrls.musicxml && { url: downloadUrls.musicxml, label: 'MusicXML', ext: '.musicxml', icon: '📄', filename: 'transcription.musicxml' },
    result.score_bundle_url && { url: result.score_bundle_url, label: 'Score Bundle (ZIP)', ext: '.zip', icon: '📦', filename: 'score_bundle.zip' },
    result.score_manifest_url && { url: result.score_manifest_url, label: 'Score Manifest', ext: '.json', icon: '📋', filename: 'score_manifest.json' },
  ].filter(Boolean) as { url: string; label: string; ext: string; icon: string; filename: string }[];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-5">
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Results</h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Clock className="w-4 h-4" />} label="Duration" value={`${result.duration_seconds.toFixed(1)}s`} />
        <StatCard icon={<Hash className="w-4 h-4" />} label="Notes" value={result.note_count.toString()} />
        <StatCard icon={<Zap className="w-4 h-4" />} label="Tempo" value={`${result.tempo_bpm} BPM`} />
        <StatCard icon={<Music className="w-4 h-4" />} label="Model" value={result.model} />
      </div>

      {/* Time Grid Info */}
      {result.time_grid && (
        <div className="bg-black/20 rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Time Grid</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Meter</span>
              <span className="text-gray-300">{result.time_grid.beats_per_bar}/4</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Source</span>
              <span className="text-gray-300 capitalize">{result.time_grid.meter_source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tempo</span>
              <span className="text-gray-300">{result.time_grid.tempo_bpm} BPM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tempo Source</span>
              <span className="text-gray-300 capitalize">{result.time_grid.tempo_source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pickup Beats</span>
              <span className="text-gray-300">{result.time_grid.pickup_beats}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tempo Curve</span>
              <span className="text-gray-300">{result.time_grid.tempo_curve ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Timing Info */}
      <div className="bg-black/20 rounded-xl p-4 space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Timing</h4>
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <div>
            <span className="text-gray-500">Requested: </span>
            <span className="text-indigo-300 capitalize">{result.timing.requested}</span>
          </div>
          <div>
            <span className="text-gray-500">Applied: </span>
            <span className={`capitalize ${result.timing.applied === result.timing.requested ? 'text-emerald-300' : 'text-amber-300'}`}>
              {result.timing.applied}
            </span>
          </div>
        </div>
        {result.timing.fallback_reason && (
          <p className="text-xs text-amber-400/80 mt-1">
            ⚠️ Fallback: {result.timing.fallback_reason}
          </p>
        )}
        {result.timing.preserved_articulations !== undefined && result.timing.preserved_articulations > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Preserved articulations: {result.timing.preserved_articulations}
          </p>
        )}
      </div>

      {/* MusicXML Optimization */}
      <div className="flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs text-gray-400">
          MusicXML optimized: <span className={result.musicxml_optimized ? 'text-emerald-300' : 'text-gray-500'}>
            {result.musicxml_optimized ? 'Yes' : 'No'}
          </span>
        </span>
      </div>

      {/* Download Links */}
      {downloadLinks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Downloads</h4>
          {downloadLinks.map((link, i) => (
            <a
              key={i}
              href={link.url}
              download={link.filename}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/30 transition-all group cursor-pointer"
            >
              <span className="text-xl">{link.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 group-hover:text-white">{link.label}</p>
                <p className="text-xs text-gray-500">{link.ext} • Click to download</p>
              </div>
              <Download className="w-4 h-4 text-gray-400 group-hover:text-indigo-400 transition-colors" />
            </a>
          ))}
        </div>
      )}

      {/* Score PDFs */}
      {result.score_pdfs && result.score_pdfs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Score PDFs</h4>
          {result.score_pdfs.map((pdf, i) => (
            <a
              key={i}
              href={pdf.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/30 transition-all group"
            >
              <span className="text-xl">🎼</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 group-hover:text-white">{pdf.label}</p>
              </div>
              <Download className="w-4 h-4 text-gray-400 group-hover:text-indigo-400 transition-colors" />
            </a>
          ))}
        </div>
      )}

      {/* Notes Preview */}
      {result.notes && result.notes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Notes Preview ({Math.min(result.notes.length, 10)} of {result.note_count})
          </h4>
          <div className="bg-black/20 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">Pitch</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">Start</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">End</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">Instrument</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">Vel</th>
                  </tr>
                </thead>
                <tbody>
                  {result.notes.slice(0, 10).map((note: { pitch: number; start: number; end: number; instrument: string; velocity: number }, i: number) => (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-3 py-1.5 text-indigo-300 font-mono">{note.pitch}</td>
                      <td className="px-3 py-1.5 text-gray-400 font-mono">{note.start.toFixed(2)}s</td>
                      <td className="px-3 py-1.5 text-gray-400 font-mono">{note.end.toFixed(2)}s</td>
                      <td className="px-3 py-1.5 text-gray-300 capitalize">{note.instrument}</td>
                      <td className="px-3 py-1.5 text-gray-400 font-mono">{note.velocity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-black/20 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
