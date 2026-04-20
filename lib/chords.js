/**
 * Chord fingering database
 * frets: [lowE, A, D, G, B, highE]  (-1 = muted, 0 = open, 1-12 = fret)
 * barre: { fret, from, to }  (string indices, 0=lowE, 5=highE)
 */
export const CHORD_DB = {
  // ── Major ──────────────────────────────────────────────────
  'C':      { frets: [-1, 3, 2, 0, 1, 0] },
  'C#':     { frets: [-1, 4, 6, 6, 6, 4], barre: { fret: 4, from: 1, to: 5 } },
  'Db':     { frets: [-1, 4, 6, 6, 6, 4], barre: { fret: 4, from: 1, to: 5 } },
  'D':      { frets: [-1, -1, 0, 2, 3, 2] },
  'D#':     { frets: [-1, -1, 1, 3, 4, 3] },
  'Eb':     { frets: [-1, -1, 1, 3, 4, 3] },
  'E':      { frets: [0, 2, 2, 1, 0, 0] },
  'F':      { frets: [1, 3, 3, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 } },
  'F#':     { frets: [2, 4, 4, 3, 2, 2], barre: { fret: 2, from: 0, to: 5 } },
  'Gb':     { frets: [2, 4, 4, 3, 2, 2], barre: { fret: 2, from: 0, to: 5 } },
  'G':      { frets: [3, 2, 0, 0, 0, 3] },
  'G#':     { frets: [4, 6, 6, 5, 4, 4], barre: { fret: 4, from: 0, to: 5 } },
  'Ab':     { frets: [4, 6, 6, 5, 4, 4], barre: { fret: 4, from: 0, to: 5 } },
  'A':      { frets: [-1, 0, 2, 2, 2, 0] },
  'A#':     { frets: [-1, 1, 3, 3, 3, 1], barre: { fret: 1, from: 1, to: 5 } },
  'Bb':     { frets: [-1, 1, 3, 3, 3, 1], barre: { fret: 1, from: 1, to: 5 } },
  'B':      { frets: [-1, 2, 4, 4, 4, 2], barre: { fret: 2, from: 1, to: 5 } },

  // ── Minor ──────────────────────────────────────────────────
  'Cm':     { frets: [-1, 3, 5, 5, 4, 3], barre: { fret: 3, from: 1, to: 5 } },
  'C#m':    { frets: [-1, 4, 6, 6, 5, 4], barre: { fret: 4, from: 1, to: 5 } },
  'Dbm':    { frets: [-1, 4, 6, 6, 5, 4], barre: { fret: 4, from: 1, to: 5 } },
  'Dm':     { frets: [-1, -1, 0, 2, 3, 1] },
  'D#m':    { frets: [-1, -1, 1, 3, 4, 2] },
  'Ebm':    { frets: [-1, -1, 1, 3, 4, 2] },
  'Em':     { frets: [0, 2, 2, 0, 0, 0] },
  'Fm':     { frets: [1, 3, 3, 1, 1, 1], barre: { fret: 1, from: 0, to: 5 } },
  'F#m':    { frets: [2, 4, 4, 2, 2, 2], barre: { fret: 2, from: 0, to: 5 } },
  'Gbm':    { frets: [2, 4, 4, 2, 2, 2], barre: { fret: 2, from: 0, to: 5 } },
  'Gm':     { frets: [3, 5, 5, 3, 3, 3], barre: { fret: 3, from: 0, to: 5 } },
  'G#m':    { frets: [4, 6, 6, 4, 4, 4], barre: { fret: 4, from: 0, to: 5 } },
  'Abm':    { frets: [4, 6, 6, 4, 4, 4], barre: { fret: 4, from: 0, to: 5 } },
  'Am':     { frets: [-1, 0, 2, 2, 1, 0] },
  'A#m':    { frets: [-1, 1, 3, 3, 2, 1], barre: { fret: 1, from: 1, to: 5 } },
  'Bbm':    { frets: [-1, 1, 3, 3, 2, 1], barre: { fret: 1, from: 1, to: 5 } },
  'Bm':     { frets: [-1, 2, 4, 4, 3, 2], barre: { fret: 2, from: 1, to: 5 } },

  // ── Dominant 7th ────────────────────────────────────────────
  'C7':     { frets: [-1, 3, 2, 3, 1, 0] },
  'D7':     { frets: [-1, -1, 0, 2, 1, 2] },
  'E7':     { frets: [0, 2, 0, 1, 0, 0] },
  'F7':     { frets: [1, 3, 1, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 } },
  'G7':     { frets: [3, 2, 0, 0, 0, 1] },
  'A7':     { frets: [-1, 0, 2, 0, 2, 0] },
  'B7':     { frets: [-1, 2, 1, 2, 0, 2] },
  'Bb7':    { frets: [-1, 1, 3, 1, 3, 1], barre: { fret: 1, from: 1, to: 5 } },

  // ── Minor 7th ───────────────────────────────────────────────
  'Am7':    { frets: [-1, 0, 2, 0, 1, 0] },
  'Bm7':    { frets: [-1, 2, 0, 2, 0, 2] },
  'Cm7':    { frets: [-1, 3, 5, 3, 4, 3], barre: { fret: 3, from: 1, to: 5 } },
  'Dm7':    { frets: [-1, -1, 0, 2, 1, 1] },
  'Em7':    { frets: [0, 2, 0, 0, 0, 0] },
  'Fm7':    { frets: [1, 3, 1, 1, 1, 1], barre: { fret: 1, from: 0, to: 5 } },
  'Gm7':    { frets: [3, 5, 3, 3, 3, 3], barre: { fret: 3, from: 0, to: 5 } },
  'F#m7':   { frets: [2, 4, 2, 2, 2, 2], barre: { fret: 2, from: 0, to: 5 } },

  // ── Major 7th ───────────────────────────────────────────────
  'Cmaj7':  { frets: [-1, 3, 2, 0, 0, 0] },
  'Dmaj7':  { frets: [-1, -1, 0, 2, 2, 2] },
  'Emaj7':  { frets: [0, 2, 1, 1, 0, 0] },
  'Fmaj7':  { frets: [-1, -1, 3, 2, 1, 0] },
  'Gmaj7':  { frets: [3, 2, 0, 0, 0, 2] },
  'Amaj7':  { frets: [-1, 0, 2, 1, 2, 0] },

  // ── Suspended ───────────────────────────────────────────────
  'Csus2':  { frets: [-1, 3, 0, 0, 1, 0] },
  'Dsus2':  { frets: [-1, -1, 0, 2, 3, 0] },
  'Dsus4':  { frets: [-1, -1, 0, 2, 3, 3] },
  'Esus4':  { frets: [0, 2, 2, 2, 0, 0] },
  'Asus2':  { frets: [-1, 0, 2, 2, 0, 0] },
  'Asus4':  { frets: [-1, 0, 2, 2, 3, 0] },
  'Gsus4':  { frets: [3, 3, 0, 0, 1, 3] },

  // ── Add9 ────────────────────────────────────────────────────
  'Cadd9':  { frets: [-1, 3, 2, 0, 3, 0] },
  'Dadd9':  { frets: [-1, -1, 0, 2, 3, 0] },
  'Gadd9':  { frets: [3, 2, 0, 2, 0, 3] },
  'Eadd9':  { frets: [0, 2, 2, 1, 0, 2] },

  // ── Slash / Bass-note chords ─────────────────────────────────
  'C/G':    { frets: [3, 3, 2, 0, 1, 0] },
  'C/E':    { frets: [0, 3, 2, 0, 1, 0] },
  'C/B':    { frets: [-1, 2, 2, 0, 1, 0] },
  'D/F#':   { frets: [2, -1, 0, 2, 3, 2] },
  'D/A':    { frets: [-1, 0, 0, 2, 3, 2] },
  'G/B':    { frets: [-1, 2, 0, 0, 0, 3] },
  'G/F#':   { frets: [2, 2, 0, 0, 0, 3] },
  'A/C#':   { frets: [-1, 4, 2, 2, 2, 0] },
  'A/E':    { frets: [0, 0, 2, 2, 2, 0] },
  'E/G#':   { frets: [4, 2, 2, 1, 0, 0] },
  'Em/B':   { frets: [-1, 2, 2, 0, 0, 0] },
  'Am/C':   { frets: [-1, 3, 2, 2, 1, 0] },
  'Am/E':   { frets: [0, 0, 2, 2, 1, 0] },
  'F/C':    { frets: [-1, 3, 3, 2, 1, 1], barre: { fret: 1, from: 4, to: 5 } },
  'Dm/F':   { frets: [1, -1, 0, 2, 3, 1] },
};

/**
 * Look up a chord, trying several fallback normalizations.
 * Returns { frets, barre } or null if not found.
 */
export function lookupChord(name) {
  if (!name) return null;

  // Direct hit
  if (CHORD_DB[name]) return CHORD_DB[name];

  // Normalize: replace 'maj' shorthand, trim whitespace
  const normalized = name.trim().replace(/\bM\b/, 'maj');
  if (CHORD_DB[normalized]) return CHORD_DB[normalized];

  // Enharmonic aliases
  const aliases = {
    'C#': 'Db', 'Db': 'C#',
    'D#': 'Eb', 'Eb': 'D#',
    'F#': 'Gb', 'Gb': 'F#',
    'G#': 'Ab', 'Ab': 'G#',
    'A#': 'Bb', 'Bb': 'A#',
  };

  // Try swapping enharmonic root
  const rootMatch = name.match(/^([A-G][b#]?)(.*)/);
  if (rootMatch) {
    const alt = aliases[rootMatch[1]];
    if (alt) {
      const altName = alt + rootMatch[2];
      if (CHORD_DB[altName]) return CHORD_DB[altName];
    }
  }

  return null;
}
