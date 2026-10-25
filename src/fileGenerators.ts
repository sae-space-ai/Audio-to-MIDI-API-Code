import { NoteData } from './types';

/**
 * Generate a real MIDI file as a downloadable blob
 * MIDI format: Standard MIDI File (SMF) Type 1
 */
export function generateMidiFile(
  notes: NoteData[],
  tempoBpm: number,
  title: string = 'Transcription'
): Blob {
  const bytes: number[] = [];
  
  // Helper to write variable-length quantity
  function writeVarLen(value: number): number[] {
    const result: number[] = [];
    let v = value;
    result.unshift(v & 0x7F);
    while ((v >>= 7)) {
      result.unshift((v & 0x7F) | 0x80);
    }
    return result;
  }
  
  // Helper to write string as bytes
  function writeString(str: string): number[] {
    return Array.from(str).map(c => c.charCodeAt(0));
  }
  
  // Helper to write 32-bit integer
  function writeInt32(value: number): number[] {
    return [
      (value >> 24) & 0xFF,
      (value >> 16) & 0xFF,
      (value >> 8) & 0xFF,
      value & 0xFF,
    ];
  }
  
  // Helper to write 16-bit integer
  function writeInt16(value: number): number[] {
    return [(value >> 8) & 0xFF, value & 0xFF];
  }
  
  // Ticks per quarter note
  const ticksPerQuarter = 480;
  const microsecondsPerBeat = Math.round(60000000 / tempoBpm);
  
  // Convert seconds to ticks
  function secToTicks(sec: number): number {
    return Math.round(sec * ticksPerQuarter * (tempoBpm / 60));
  }
  
  // Build track data
  const trackData: number[] = [];
  
  // Track name
  trackData.push(0); // delta time
  trackData.push(0xFF, 0x03); // meta event: track name
  const nameBytes = writeString(title);
  trackData.push(...writeVarLen(nameBytes.length));
  trackData.push(...nameBytes);
  
  // Tempo meta event
  trackData.push(0); // delta time
  trackData.push(0xFF, 0x51, 0x03); // meta event: tempo
  trackData.push((microsecondsPerBeat >> 16) & 0xFF);
  trackData.push((microsecondsPerBeat >> 8) & 0xFF);
  trackData.push(microsecondsPerBeat & 0xFF);
  
  // Time signature: 4/4
  trackData.push(0);
  trackData.push(0xFF, 0x58, 0x04);
  trackData.push(4, 2, 24, 8); // 4/4 time
  
  // Sort notes by start time
  const sortedNotes = [...notes].sort((a, b) => a.start - b.start);
  
  // Create events: note on and note off
  interface MidiEvent {
    tick: number;
    data: number[];
  }
  
  const events: MidiEvent[] = [];
  
  for (const note of sortedNotes) {
    const startTick = secToTicks(note.start);
    const endTick = secToTicks(note.end);
    const velocity = Math.min(127, Math.max(1, note.velocity));
    const pitch = Math.min(127, Math.max(0, note.pitch));
    
    // Note On
    events.push({
      tick: startTick,
      data: [0x90, pitch, velocity], // channel 0, note on
    });
    
    // Note Off
    events.push({
      tick: endTick,
      data: [0x80, pitch, 0], // channel 0, note off
    });
  }
  
  // Sort events by tick
  events.sort((a, b) => a.tick - b.tick);
  
  // Write events with delta times
  let lastTick = 0;
  for (const event of events) {
    const delta = event.tick - lastTick;
    trackData.push(...writeVarLen(delta));
    trackData.push(...event.data);
    lastTick = event.tick;
  }
  
  // End of track
  trackData.push(...writeVarLen(0));
  trackData.push(0xFF, 0x2F, 0x00);
  
  // Build complete MIDI file
  // Header chunk
  bytes.push(...writeString('MThd'));
  bytes.push(...writeInt32(6)); // header length
  bytes.push(...writeInt16(1)); // format type 1
  bytes.push(...writeInt16(1)); // number of tracks
  bytes.push(...writeInt16(ticksPerQuarter)); // ticks per quarter
  
  // Track chunk
  bytes.push(...writeString('MTrk'));
  bytes.push(...writeInt32(trackData.length));
  bytes.push(...trackData);
  
  return new Blob([new Uint8Array(bytes)], { type: 'audio/midi' });
}

/**
 * Generate a real MusicXML file as a downloadable blob
 */
export function generateMusicXml(
  notes: NoteData[],
  tempoBpm: number,
  title: string = 'Transcription'
): Blob {
  // MIDI note to pitch name
  function midiToPitch(midi: number): { step: string; octave: number; alter?: number } {
    const noteNames = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
    const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
    const octave = Math.floor(midi / 12) - 1;
    const step = noteNames[midi % 12];
    const alter = alters[midi % 12];
    return { step, octave, alter: alter || undefined };
  }
  
  // Convert seconds to divisions (assuming 480 divisions per quarter)
  const divisions = 480;
  function secToDivisions(sec: number): number {
    return Math.round(sec * divisions * (tempoBpm / 60));
  }
  
  // Sort notes by start time
  const sortedNotes = [...notes].sort((a, b) => a.start - b.start);
  
  // Build note elements
  let noteElements = '';
  for (const note of sortedNotes) {
    const pitch = midiToPitch(note.pitch);
    const duration = secToDivisions(note.end - note.start);
    
    noteElements += `      <note>
        <pitch>
          <step>${pitch.step}</step>
          ${pitch.alter ? `<alter>${pitch.alter}</alter>` : ''}
          <octave>${pitch.octave}</octave>
        </pitch>
        <duration>${duration}</duration>
        <type>quarter</type>
        <velocity>${note.velocity}</velocity>
      </note>\n`;
  }
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>${title}</work-title>
  </work>
  <identification>
    <creator type="composer">Generated by Audio-to-MIDI Pro</creator>
    <encoding>
      <software>Audio-to-MIDI Pro</software>
      <encoding-date>${new Date().toISOString().split('T')[0]}</encoding-date>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Transcription</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <direction placement="above">
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>${tempoBpm}</per-minute>
          </metronome>
        </direction-type>
        <sound tempo="${tempoBpm}"/>
      </direction>
${noteElements}    </measure>
  </part>
</score-partwise>`;
  
  return new Blob([xml], { type: 'application/xml' });
}

/**
 * Create a downloadable blob URL
 */
export function createDownloadUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revoke a blob URL to free memory
 */
export function revokeDownloadUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
