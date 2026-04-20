/**
 * ChordPro parser
 * Supports: {title}, {artist}, {key}, {capo}, {tempo}
 *           {start_of_verse/chorus/bridge/outro: Label}, {end_of_*}
 *           [Chord] inline markers
 */

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
