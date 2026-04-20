/**
 * ChordPro parser
 * Supports: {title}, {artist}, {key}, {capo}, {tempo}
 *           {start_of_verse/chorus/bridge/outro: Label}, {end_of_*}
 *           [Chord] inline markers
 * Also accepts plain-text chord-above-lyric format (UG / Chordie style)
 * via detectAndNormalize().
 */

// Matches a single token that looks like a chord: C, Dm, F#m7, Bb/F, Asus4, etc.
const CHORD_RE = /^[A-G][#b]?(m|maj|min|sus|add|dim|aug|aug5|m7b5|\d)*(\/[A-G][#b]?)?$/;

function isChordToken(word) {
  return CHORD_RE.test(word.trim());
}

function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Every non-empty token on the line must be a chord
  const tokens = trimmed.split(/\s+/);
  return tokens.length > 0 && tokens.every(isChordToken);
}

function isSectionHeader(line) {
  // Bare [Verse], [Chorus 2], [Bridge], etc. — whole line is a bracket label
  return /^\[([^\]]+)\]$/.test(line.trim());
}

function isChordPro(text) {
  return /\{[a-z_]+[^}]*\}/.test(text) || /\[[A-G][^\]]*\]/.test(text);
}

/**
 * Detect format and return normalised ChordPro text.
 * Returns { text: string, detectedFormat: 'chordpro' | 'plaintext' }
 */
export function detectAndNormalize(raw) {
  if (isChordPro(raw)) {
    return { text: raw, detectedFormat: 'chordpro' };
  }
  return { text: plaintextToChordPro(raw), detectedFormat: 'plaintext' };
}

function sectionTypeFromLabel(label) {
  const l = label.toLowerCase();
  if (l.includes('chorus'))  return 'chorus';
  if (l.includes('bridge'))  return 'bridge';
  if (l.includes('outro'))   return 'outro';
  if (l.includes('intro'))   return 'intro';
  if (l.includes('pre'))     return 'pre_chorus';
  if (l.includes('solo'))    return 'solo';
  return 'verse';
}

/**
 * Merge a chord-line + lyric-line into a ChordPro inline string.
 * Uses character offsets from the chord line to insert [Chord] markers.
 */
function mergeChordLyricLines(chordLine, lyricLine) {
  // Find each chord and its start position in the chord line
  const entries = [];
  let i = 0;
  while (i < chordLine.length) {
    if (chordLine[i] === ' ') { i++; continue; }
    let j = i;
    while (j < chordLine.length && chordLine[j] !== ' ') j++;
    const word = chordLine.slice(i, j);
    if (isChordToken(word)) entries.push({ chord: word, pos: i });
    i = j;
  }

  if (!entries.length) return lyricLine || '';

  // Build result by inserting [Chord] at character positions into lyricLine
  let result = '';
  let lyricPos = 0;
  const lyric = lyricLine || '';

  for (let k = 0; k < entries.length; k++) {
    const { chord, pos } = entries[k];
    const nextPos = k + 1 < entries.length ? entries[k + 1].pos : Infinity;
    // Lyric slice from lyricPos up to nextPos (or end)
    const end = Math.min(nextPos, lyric.length);
    const slice = lyric.slice(lyricPos, end);
    result += `[${chord}]${slice}`;
    lyricPos = end;
  }
  // Any remaining lyric after last chord
  if (lyricPos < lyric.length) result += lyric.slice(lyricPos);

  return result;
}

function plaintextToChordPro(text) {
  const inputLines = text.split('\n');
  const out = [];
  let i = 0;
  let sectionOpen = false;

  // Try to extract title from first non-empty line if it doesn't look like chords/lyrics
  const firstContent = inputLines.find(l => l.trim());
  if (firstContent && !isChordLine(firstContent) && !isSectionHeader(firstContent)) {
    out.push(`{title: ${firstContent.trim()}}`);
    i = inputLines.indexOf(firstContent) + 1;
  }

  while (i < inputLines.length) {
    const line = inputLines[i];
    const trimmed = line.trim();

    // Blank line — close section
    if (!trimmed) {
      if (sectionOpen) {
        out.push('{end_of_verse}');
        sectionOpen = false;
      }
      i++;
      continue;
    }

    // Section header: [Verse 1], [Chorus], etc.
    if (isSectionHeader(trimmed)) {
      if (sectionOpen) out.push(`{end_of_verse}`);
      const label = trimmed.slice(1, -1).trim();
      const type  = sectionTypeFromLabel(label);
      out.push(`{start_of_${type}: ${label}}`);
      sectionOpen = true;
      i++;
      continue;
    }

    // Chord line followed by a lyric line
    if (isChordLine(trimmed)) {
      const nextLine = inputLines[i + 1] || '';
      const nextTrimmed = nextLine.trim();
      if (!sectionOpen) {
        out.push('{start_of_verse: Verse}');
        sectionOpen = true;
      }
      // If next line is also a chord line or section header, emit chords-only as a comment line
      if (isChordLine(nextTrimmed) || isSectionHeader(nextTrimmed) || !nextTrimmed) {
        // No lyric to pair with — emit chords as an instrumental line
        out.push(mergeChordLyricLines(line, ''));
        i++;
      } else {
        out.push(mergeChordLyricLines(line, nextLine));
        i += 2;
      }
      continue;
    }

    // Plain lyric line (no chords above)
    if (!sectionOpen) {
      out.push('{start_of_verse: Verse}');
      sectionOpen = true;
    }
    out.push(trimmed);
    i++;
  }

  if (sectionOpen) out.push('{end_of_verse}');

  return out.join('\n');
}

export function parseChordPro(text) {
  const meta = { title: 'Untitled', artist: '', key: '', capo: 0, tempo: 0 };
  const sections = [];
  let current = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();

    // Directive line: {key: value}
    const dir = line.match(/^\{([^:}]+)(?::([^}]*))?\}$/);
    if (dir) {
      const key = dir[1].trim().toLowerCase();
      const val = (dir[2] || '').trim();
      switch (key) {
        case 'title': case 't':   meta.title  = val; break;
        case 'artist': case 'a':  meta.artist = val; break;
        case 'key':               meta.key    = val; break;
        case 'capo':              meta.capo   = parseInt(val) || 0; break;
        case 'tempo': case 'bpm': meta.tempo  = parseInt(val) || 0; break;
        default:
          if (key.startsWith('start_of_')) {
            if (current) sections.push(current); // close any open section first
            const type = key.slice(9);
            current = { type, name: val || capitalize(type), lines: [] };
          } else if (key.startsWith('end_of_')) {
            if (current) { sections.push(current); current = null; }
          }
      }
      continue;
    }

    // Empty line — end implicit section
    if (!line) continue;

    // Lyric/chord line
    const tokens = parseLyricLine(line);
    if (!tokens.length) continue;

    if (!current) {
      current = { type: 'verse', name: 'Verse', lines: [] };
    }
    current.lines.push(tokens);
  }

  if (current) sections.push(current);

  // Flatten sections → player-ready line array
  const lines = [];
  for (const section of sections) {
    let labelEmitted = false;
    for (const tokens of section.lines) {
      const hasContent = tokens.some(t => t.chord || t.lyric.trim());
      if (!hasContent) continue;
      lines.push({
        sectionLabel: labelEmitted ? '' : section.name,
        sectionType:  section.type,
        tokens,
        chords: [...new Set(tokens.filter(t => t.chord).map(t => t.chord))],
        lyric:  tokens.map(t => t.lyric).join('').trim(),
      });
      labelEmitted = true;
    }
  }

  return { ...meta, sections, lines };
}

function parseLyricLine(line) {
  // Split on [Chord] markers, keeping the delimiters
  const parts = line.split(/(\[[^\]]+\])/);
  const tokens = [];
  let pendingChord = null;

  for (const part of parts) {
    const cm = part.match(/^\[([^\]]+)\]$/);
    if (cm) {
      if (pendingChord !== null) tokens.push({ chord: pendingChord, lyric: '' });
      pendingChord = cm[1].trim();
    } else {
      if (pendingChord !== null) {
        tokens.push({ chord: pendingChord, lyric: part });
        pendingChord = null;
      } else if (part) {
        tokens.push({ chord: null, lyric: part });
      }
    }
  }
  if (pendingChord !== null) tokens.push({ chord: pendingChord, lyric: '' });

  return tokens;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}
