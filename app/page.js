"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { parseChordPro } from "../lib/chordpro";
import ChordDiagram from "../components/ChordDiagram";

// ─── Demo song ────────────────────────────────────────────────────────────────
const DEMO = `{title: Let It Be}
{artist: The Beatles}
{key: C}

{start_of_verse: Verse 1}
[Am]Let it [C/G]be, let it [F]be, let it [C]be
[C]Whisper words of [G]wisdom, let it [F]be[C/E][Dm][C]
{end_of_verse}

{start_of_chorus: Chorus}
[F]Let it [C]be, let it [G]be
[Am]Let it [F]be, let it [C]be
[G]Whisper words of [F]wisdom, let it [C]be
{end_of_chorus}

{start_of_verse: Verse 2}
[Am]And when the [C/G]broken-hearted [F]people
[C]Living in the [G]world a[F]gree[C/E][Dm][C]
[Am]There will be an [C/G]answer, let it [F]be[C]
[C]For though they may be [G]parted, there is
[F]Still a chance that [C]they will [G]see[F][C/E][Dm][C]
{end_of_verse}`;

// ─── Colours ─────────────────────────────────────────────────────────────────
const BG      = '#0B0F1A';
const SURFACE = '#111827';
const CARD    = '#1F2937';
const BORDER  = '#374151';
const TEAL    = '#0D9488';
const TEAL2   = '#14B8A6';
const WHITE   = '#F9FAFB';
const MUTED   = '#9CA3AF';
const DIM     = '#4B5563';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(secs) {
  const m = Math.floor((secs || 0) / 60);
  const s = Math.floor((secs || 0) % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Canvas video helpers (module-level, no React deps) ──────────────────────
function wrapText(ctx, text, x, y, maxWidth, lineH) {
  if (!text) return;
  const words = text.split(' ');
  let row = '', cy = y;
  for (const word of words) {
    const test = row + word + ' ';
    if (ctx.measureText(test).width > maxWidth && row) {
      ctx.fillText(row.trim(), x, cy);
      row = word + ' ';
      cy += lineH;
    } else {
      row = test;
    }
  }
  if (row.trim()) ctx.fillText(row.trim(), x, cy);
}

function drawKaraokeFrame(ctx, W, H, { song, lineIdx, currentTime, duration }) {
  const line     = song.lines[lineIdx];
  const nextLine = song.lines[lineIdx + 1];

  // Background
  ctx.fillStyle = '#0B0F1A';
  ctx.fillRect(0, 0, W, H);

  // Subtle top gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H * 0.4);
  grad.addColorStop(0, 'rgba(13,148,136,0.06)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Header bar
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, W, 64);
  ctx.font = '700 20px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#0D9488';
  ctx.textAlign = 'left';
  ctx.fillText('🎸 Guitaraoke', 32, 40);
  ctx.fillStyle = '#F9FAFB';
  ctx.font = '700 18px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(song.title || '', W - 32, 40);
  if (song.key) {
    ctx.font = '600 13px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#0D9488';
    ctx.fillText(`Key: ${song.key}`, W - 32, 58);
  }
  ctx.textAlign = 'left';

  if (!line) return;

  const cx = W / 2;

  // Section label pill
  if (line.sectionLabel) {
    ctx.font = '700 12px Inter, system-ui, sans-serif';
    const lw = ctx.measureText(line.sectionLabel.toUpperCase()).width + 28;
    ctx.fillStyle = 'rgba(13,148,136,0.18)';
    ctx.beginPath();
    ctx.roundRect(cx - lw / 2, 82, lw, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#14B8A6';
    ctx.textAlign = 'center';
    ctx.fillText(line.sectionLabel.toUpperCase(), cx, 100);
    ctx.textAlign = 'left';
  }

  // Inline chord + lyric layout
  const CHORD_Y = 270, LYRIC_Y = 350;
  const CHORD_FONT = '700 28px "JetBrains Mono","Courier New",monospace';
  const LYRIC_FONT = '700 50px Inter,system-ui,sans-serif';
  const LYRIC_SM   = '700 36px Inter,system-ui,sans-serif';

  ctx.font = LYRIC_FONT;
  const fullLyric = line.tokens.map(t => t.lyric).join('');
  const fits = ctx.measureText(fullLyric).width < W - 180;

  if (fits && line.tokens.some(t => t.chord)) {
    // Inline: chord above each syllable
    ctx.font = LYRIC_FONT;
    const meas = line.tokens.map(tok => ({
      chord: tok.chord,
      lyric: tok.lyric,
      lw: tok.lyric ? ctx.measureText(tok.lyric).width : 0,
    }));
    ctx.font = CHORD_FONT;
    for (const m of meas) m.cw = m.chord ? ctx.measureText(m.chord).width + 4 : 0;
    const totalW = meas.reduce((s, m) => s + Math.max(m.lw, m.cw) + 6, 0);
    let x = cx - totalW / 2;
    for (const m of meas) {
      const col = Math.max(m.lw, m.cw) + 6;
      if (m.chord) {
        ctx.font = CHORD_FONT;
        ctx.fillStyle = '#14B8A6';
        ctx.textAlign = 'left';
        ctx.fillText(m.chord, x, CHORD_Y);
      }
      if (m.lyric) {
        ctx.font = LYRIC_FONT;
        ctx.fillStyle = '#F9FAFB';
        ctx.textAlign = 'left';
        ctx.fillText(m.lyric, x, LYRIC_Y);
      }
      x += col;
    }
  } else {
    // Fallback: chords row + lyric row, both centred
    const chordStr = line.chords.join('   ');
    ctx.font = CHORD_FONT;
    ctx.fillStyle = '#14B8A6';
    ctx.textAlign = 'center';
    ctx.fillText(chordStr, cx, CHORD_Y);
    ctx.font = LYRIC_SM;
    ctx.fillStyle = '#F9FAFB';
    wrapText(ctx, fullLyric, cx, LYRIC_Y, W - 160, 50);
    ctx.textAlign = 'left';
  }

  // Next line (dimmed)
  if (nextLine) {
    const nl = nextLine.tokens.map(t => t.lyric).join('').trim();
    if (nl) {
      ctx.font = '400 28px Inter,system-ui,sans-serif';
      ctx.fillStyle = '#4B5563';
      ctx.textAlign = 'center';
      ctx.fillText(nl.length > 65 ? nl.slice(0, 63) + '…' : nl, cx, 430);
      ctx.textAlign = 'left';
    }
  }

  // Progress bar
  const barX = 60, barY = H - 52, barW = W - 120, barH = 5;
  ctx.fillStyle = '#1F2937';
  ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, barH / 2); ctx.fill();
  const pct = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  if (pct > 0) {
    ctx.fillStyle = '#0D9488';
    ctx.beginPath(); ctx.roundRect(barX, barY, Math.max(barH, barW * pct), barH, barH / 2); ctx.fill();
  }
  ctx.font = '400 13px "JetBrains Mono","Courier New",monospace';
  ctx.fillStyle = '#6B7280';
  ctx.textAlign = 'right';
  ctx.fillText(`${fmt(currentTime)} / ${fmt(duration)}`, W - barX, H - 18);
  ctx.textAlign = 'left';
}

// ─── Home screen ─────────────────────────────────────────────────────────────
function HomeView({ onStart }) {
  const [audioFile, setAudioFile] = useState(null);
  const [chordproText, setChordproText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [cpDragOver, setCpDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const audioInputRef = useRef(null);
  const cpFileRef = useRef(null);

  function handleAudioDrop(e) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('audio/')) setAudioFile(file);
  }
  function handleCpDrop(e) {
    e.preventDefault(); setCpDragOver(false);
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    const r = new FileReader(); r.onload = ev => setChordproText(ev.target.result); r.readAsText(file);
  }
  function handleCpFile(e) {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader(); r.onload = ev => setChordproText(ev.target.result); r.readAsText(file);
  }

  useEffect(() => {
    if (!chordproText.trim()) { setPreview(null); return; }
    try { setPreview(parseChordPro(chordproText)); setError(''); }
    catch { setError('Could not parse ChordPro — check the format.'); }
  }, [chordproText]);

  function handleStart() {
    if (!audioFile) { setError('Please upload an audio file.'); return; }
    if (!preview?.lines?.length) { setError('Please add a ChordPro chart.'); return; }
    onStart({ song: preview, audioUrl: URL.createObjectURL(audioFile) });
  }

  const canStart = !!audioFile && !!preview?.lines?.length;

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Inter, sans-serif' }}>
      <header style={{ borderBottom: `1px solid ${BORDER}`, padding: '1.25rem 2rem',
        display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '1.5rem' }}>🎸</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', color: WHITE, letterSpacing: '-0.03em' }}>
            Guitaraoke
          </div>
          <div style={{ fontSize: '0.75rem', color: MUTED }}>
            Karaoke for guitarists — lyrics, chords, and timing in sync
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, color: WHITE,
            letterSpacing: '-0.04em', marginBottom: '0.75rem', lineHeight: 1.1 }}>
            Play along.<br /><span style={{ color: TEAL2 }}>Never lose your place.</span>
          </h1>
          <p style={{ color: MUTED, fontSize: '1rem', lineHeight: 1.7, maxWidth: 520,
            margin: '0 auto 1.5rem' }}>
            Upload any song, paste a ChordPro chart, and Guitaraoke keeps your lyrics and
            chord diagrams in sync as you play.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { n:'1', icon:'♪', title:'Upload your song', body:'Drop any MP3, WAV, M4A, or OGG audio file onto the zone below.' },
            { n:'2', icon:'♬', title:'Add a ChordPro chart', body:'Paste ChordPro text or upload a .cho / .chordpro file. Works with any standard ChordPro format.' },
            { n:'3', icon:'🎸', title:'Tap to sync, then play', body:'Press Space to advance each line as the song plays. After syncing you can export a karaoke video.' },
          ].map(({ n, icon, title, body }) => (
            <div key={n} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: TEAL+'22',
                  border: `1px solid ${TEAL}55`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: TEAL }}>{n}</div>
                <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                <span style={{ fontWeight: 700, color: WHITE, fontSize: '0.9rem' }}>{title}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: MUTED, lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Audio */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: MUTED, marginBottom: 8 }}>Step 1 — Audio File</div>
            <label onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)} onDrop={handleAudioDrop}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 8, height: 160,
                border: `2px dashed ${dragOver ? TEAL : BORDER}`, borderRadius: 10,
                background: dragOver ? TEAL+'0C' : SURFACE, cursor: 'pointer', transition: 'all 0.15s' }}>
              <input ref={audioInputRef} type="file" accept="audio/*"
                onChange={e => setAudioFile(e.target.files[0])} style={{ display: 'none' }} />
              {audioFile ? (
                <><span style={{ fontSize: '1.8rem' }}>✓</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TEAL2 }}>{audioFile.name}</span>
                  <span style={{ fontSize: '0.75rem', color: MUTED }}>{(audioFile.size/1024/1024).toFixed(1)} MB — click to change</span></>
              ) : (
                <><span style={{ fontSize: '2rem' }}>♪</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: WHITE }}>Drop audio file here</span>
                  <span style={{ fontSize: '0.75rem', color: MUTED }}>or click to browse</span>
                  <span style={{ fontSize: '0.7rem', color: DIM }}>MP3 · WAV · M4A · OGG</span></>
              )}
            </label>
          </div>

          {/* ChordPro */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: MUTED }}>Step 2 — ChordPro Chart</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setChordproText(DEMO)} style={{ fontSize: '0.7rem', fontWeight: 600,
                  color: TEAL2, background: 'none', border: `1px solid ${TEAL}44`,
                  borderRadius: 20, padding: '0.2rem 0.65rem', cursor: 'pointer' }}>Load demo</button>
                <label onDragOver={e => { e.preventDefault(); setCpDragOver(true); }}
                  onDragLeave={() => setCpDragOver(false)} onDrop={handleCpDrop}
                  style={{ fontSize: '0.7rem', fontWeight: 600, color: MUTED, background: cpDragOver ? TEAL+'11' : 'none',
                    border: `1px solid ${BORDER}`, borderRadius: 20, padding: '0.2rem 0.65rem', cursor: 'pointer' }}>
                  <input ref={cpFileRef} type="file" accept=".cho,.chordpro,.txt"
                    onChange={handleCpFile} style={{ display: 'none' }} />
                  Upload file
                </label>
              </div>
            </div>
            <textarea value={chordproText} onChange={e => setChordproText(e.target.value)}
              placeholder={`{title: My Song}\n{key: G}\n\n{start_of_verse: Verse}\n[G]Words and [D]chords\n{end_of_verse}`}
              style={{ width: '100%', height: 154, background: SURFACE,
                border: `1px solid ${chordproText ? TEAL+'55' : BORDER}`, borderRadius: 10,
                padding: '0.75rem', color: WHITE, fontSize: '0.78rem', lineHeight: 1.7,
                resize: 'vertical', outline: 'none', transition: 'border-color 0.15s',
                fontFamily: 'JetBrains Mono, monospace' }} />
          </div>
        </div>

        {preview && (
          <div style={{ background: CARD, border: `1px solid ${TEAL}33`, borderRadius: 10,
            padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center',
              marginBottom: preview.lines.length ? 12 : 0 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: WHITE }}>{preview.title}</div>
                {preview.artist && <div style={{ fontSize: '0.8rem', color: MUTED }}>{preview.artist}</div>}
              </div>
              {preview.key && <div style={{ background: TEAL+'22', border: `1px solid ${TEAL}44`,
                borderRadius: 20, padding: '0.2rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, color: TEAL2 }}>
                Key: {preview.key}</div>}
              {preview.capo > 0 && <div style={{ background: DIM+'33', borderRadius: 20,
                padding: '0.2rem 0.75rem', fontSize: '0.72rem', color: MUTED }}>Capo {preview.capo}</div>}
              <div style={{ marginLeft: 'auto', fontSize: '0.78rem', color: MUTED }}>
                {preview.lines.length} lines · {[...new Set(preview.lines.flatMap(l => l.chords))].length} unique chords
              </div>
            </div>
            {preview.lines.length > 0 && (
              <div style={{ fontSize: '0.78rem', color: DIM, lineHeight: 1.6,
                borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
                <span style={{ color: MUTED, fontWeight: 600 }}>Preview: </span>
                {preview.lines.slice(0, 3).map((l, i) => (
                  <span key={i}>
                    {l.chords.map(c => <span key={c} style={{ color: TEAL2,
                      fontFamily: 'JetBrains Mono, monospace', marginRight: 4 }}>{c}</span>)}
                    <span style={{ color: MUTED, marginRight: 12 }}>{l.lyric}</span>
                  </span>
                ))}
                {preview.lines.length > 3 && <span style={{ color: DIM }}>…</span>}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ background: '#7F1D1D22', border: '1px solid #EF444444', borderRadius: 8,
            padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#FCA5A5' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={handleStart} disabled={!canStart} style={{
            padding: '0.9rem 3rem', borderRadius: 10, fontWeight: 800, fontSize: '1rem',
            border: 'none', letterSpacing: '-0.01em',
            background: canStart ? `linear-gradient(135deg, ${TEAL} 0%, #0891B2 100%)` : CARD,
            color: canStart ? WHITE : DIM, cursor: canStart ? 'pointer' : 'not-allowed',
            boxShadow: canStart ? `0 0 30px ${TEAL}44` : 'none', transition: 'all 0.2s' }}>
            🎸 Launch Guitaraoke
          </button>
        </div>

        <details style={{ marginTop: '2.5rem', background: SURFACE, border: `1px solid ${BORDER}`,
          borderRadius: 10, overflow: 'hidden' }}>
          <summary style={{ padding: '0.85rem 1.25rem', cursor: 'pointer',
            fontSize: '0.82rem', fontWeight: 600, color: MUTED, userSelect: 'none' }}>
            ChordPro format reference ↓
          </summary>
          <div style={{ padding: '1rem 1.25rem', borderTop: `1px solid ${BORDER}` }}>
            <pre style={{ fontSize: '0.78rem', color: MUTED, lineHeight: 1.8,
              fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap' }}>{`{title: Song Title}       ← Song title
{artist: Artist Name}     ← Artist
{key: G}                  ← Key signature
{capo: 2}                 ← Capo position

{start_of_verse: Verse 1} ← Section start (verse/chorus/bridge/outro)
[G]Words and [D]more      ← [Chord] before the syllable it lands on
[Em]lyrics [C]here
{end_of_verse}

{start_of_chorus: Chorus}
[C]Chorus [G]line
{end_of_chorus}`}</pre>
          </div>
        </details>
      </main>
    </div>
  );
}

// ─── Sync-complete overlay ────────────────────────────────────────────────────
function SyncCompleteOverlay({ lineCount, onPlayback, onExport, onResync }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(11,15,26,0.92)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: CARD, border: `1px solid ${TEAL}44`, borderRadius: 16,
        padding: '2.5rem 3rem', textAlign: 'center', maxWidth: 440, width: '90%' }}>

        {/* Icon */}
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>

        <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: WHITE,
          letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          Sync complete!
        </h2>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          {lineCount} lines tapped. What would you like to do?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Export to video — primary CTA */}
          <button onClick={onExport} style={{
            padding: '0.9rem 1.5rem', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem',
            border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${TEAL} 0%, #0891B2 100%)`,
            color: WHITE, boxShadow: `0 0 24px ${TEAL}44`, transition: 'all 0.15s',
          }}>
            🎬 Export karaoke video
          </button>

          {/* Play back */}
          <button onClick={onPlayback} style={{
            padding: '0.85rem 1.5rem', borderRadius: 10, fontWeight: 600, fontSize: '0.9rem',
            border: `1px solid ${BORDER}`, cursor: 'pointer',
            background: SURFACE, color: WHITE, transition: 'all 0.15s',
          }}>
            ▶ Play it back
          </button>

          {/* Re-sync */}
          <button onClick={onResync} style={{
            padding: '0.7rem 1.5rem', borderRadius: 10, fontWeight: 600, fontSize: '0.85rem',
            border: `1px solid ${BORDER}`, cursor: 'pointer',
            background: 'none', color: MUTED, transition: 'all 0.15s',
          }}>
            ↺ Re-sync from scratch
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Export-progress overlay ──────────────────────────────────────────────────
function ExportOverlay({ progress, onCancel }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(11,15,26,0.95)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: CARD, border: `1px solid ${TEAL}44`, borderRadius: 16,
        padding: '2.5rem 3rem', textAlign: 'center', maxWidth: 400, width: '90%' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎬</div>
        <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: WHITE,
          letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          Rendering video…
        </h2>
        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Playing through the song in real-time to capture your karaoke video.
          This takes as long as the song.
        </p>

        {/* Progress bar */}
        <div style={{ height: 8, background: BORDER, borderRadius: 4, marginBottom: '0.75rem', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`,
            background: `linear-gradient(90deg, ${TEAL}, #0891B2)`,
            borderRadius: 4, transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: TEAL2, marginBottom: '1.5rem',
          fontFamily: 'JetBrains Mono, monospace' }}>
          {progress}%
        </div>

        <button onClick={onCancel} style={{ padding: '0.6rem 1.5rem', borderRadius: 8,
          fontWeight: 600, fontSize: '0.82rem', border: `1px solid ${BORDER}`,
          background: 'none', color: MUTED, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Player ───────────────────────────────────────────────────────────────────
function PlayerView({ song, audioUrl, onBack }) {
  const audioRef   = useRef(null);
  const cancelRef  = useRef(false); // abort export
  const [playing, setPlaying]             = useState(false);
  const [currentTime, setCurrentTime]     = useState(0);
  const [duration, setDuration]           = useState(0);
  const [lineIdx, setLineIdx]             = useState(0);
  const [timestamps, setTimestamps]       = useState([]);
  const [syncMode, setSyncMode]           = useState(true);
  const [synced, setSynced]               = useState(false);
  const [syncDone, setSyncDone]           = useState(false);   // show completion overlay
  const [exporting, setExporting]         = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const lineRefs    = useRef([]);
  const containerRef = useRef(null);
  const lines = song.lines;
  const currentLine = lines[lineIdx] || null;

  // Audio events
  useEffect(() => {
    const audio = audioRef.current; if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd  = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  // Auto-advance from timestamps
  useEffect(() => {
    if (!synced || syncMode || !playing) return;
    const raw = timestamps.findLastIndex(t => t != null && currentTime >= t);
    if (raw >= 0) {
      const idx = Math.min(raw + 1, lines.length - 1);
      if (idx !== lineIdx) setLineIdx(idx);
    }
  }, [currentTime, synced, syncMode, playing, timestamps, lineIdx]);

  // Scroll active line into view
  useEffect(() => {
    lineRefs.current[lineIdx]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [lineIdx]);

  // Keyboard
  const handleKey = useCallback((e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (syncMode) {
        const t = audioRef.current?.currentTime ?? 0;
        const captured = [...timestamps];
        captured[lineIdx] = t;
        setTimestamps(captured);
        const next = lineIdx + 1;
        if (next < lines.length) {
          setLineIdx(next);
        } else {
          // ── All lines tapped — show completion overlay ──
          if (audioRef.current) audioRef.current.pause();
          setPlaying(false);
          setSyncDone(true);
        }
      }
    }
    if (e.code === 'ArrowLeft') setLineIdx(i => Math.max(0, i - 1));
    if (e.code === 'ArrowRight') setLineIdx(i => Math.min(lines.length - 1, i + 1));
    if (e.code === 'KeyP') togglePlay();
  }, [syncMode, lineIdx, lines.length, timestamps]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  function togglePlay() {
    const audio = audioRef.current; if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  }

  function seek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (audioRef.current) audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }

  function clickLine(idx) {
    setLineIdx(idx);
    if (synced && timestamps[idx] != null && audioRef.current)
      audioRef.current.currentTime = timestamps[idx];
  }

  function restartSync() {
    setTimestamps([]); setSynced(false); setSyncMode(true);
    setLineIdx(0); setSyncDone(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setPlaying(false);
  }

  // ── Handlers for sync-complete overlay choices ────────────
  function handlePlayback() {
    setSyncDone(false); setSynced(true); setSyncMode(false);
    setLineIdx(0);
    if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); }
    setPlaying(true);
  }

  // ── Video export ──────────────────────────────────────────
  async function startVideoExport() {
    setSyncDone(false);
    setExporting(true);
    setExportProgress(0);
    cancelRef.current = false;

    const W = 1280, H = 720;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Dedicated audio element keeps us away from any existing AudioContext
    const exportAudio = new Audio(audioUrl);
    exportAudio.crossOrigin = 'anonymous';

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    await audioCtx.resume();
    const source = audioCtx.createMediaElementSource(exportAudio);
    const dest   = audioCtx.createMediaStreamDestination();
    source.connect(dest); // audio → recorder only (silent to speakers)

    // Check browser support
    const mimeType = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']
      .find(t => MediaRecorder.isTypeSupported(t));
    if (!mimeType) {
      alert('Your browser does not support WebM recording. Please use Chrome or Edge.');
      setExporting(false); audioCtx.close(); return;
    }

    const combined = new MediaStream([
      ...canvas.captureStream(30).getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);
    const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 4_000_000 });
    const chunks = [];

    recorder.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      if (cancelRef.current) { setExporting(false); audioCtx.close(); return; }
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `${(song.title || 'guitaraoke').replace(/[^a-z0-9]/gi, '-')}-guitaraoke.webm`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      audioCtx.close();
      setExporting(false);
      setExportProgress(0);
      // Switch to playback mode after export
      setSynced(true); setSyncMode(false); setLineIdx(0);
    };

    // Wait for audio to be ready
    await new Promise(resolve => {
      exportAudio.addEventListener('canplaythrough', resolve, { once: true });
      exportAudio.load();
    });

    recorder.start(200);
    exportAudio.play();

    let animId;
    function renderLoop() {
      if (cancelRef.current) {
        cancelAnimationFrame(animId);
        exportAudio.pause();
        recorder.stop();
        return;
      }

      const t   = exportAudio.currentTime;
      const dur = exportAudio.duration || 1;
      setExportProgress(Math.min(99, Math.round((t / dur) * 100)));

      let idx = 0;
      for (let i = 0; i < timestamps.length; i++) {
        if (timestamps[i] != null && t >= timestamps[i]) idx = i + 1;
      }
      idx = Math.min(idx, lines.length - 1);

      drawKaraokeFrame(ctx, W, H, { song, lineIdx: idx, currentTime: t, duration: dur });

      if (!exportAudio.ended) {
        animId = requestAnimationFrame(renderLoop);
      }
    }

    exportAudio.addEventListener('ended', () => {
      cancelAnimationFrame(animId);
      // Draw final frame at 100%
      drawKaraokeFrame(ctx, W, H, { song, lineIdx: lines.length - 1,
        currentTime: exportAudio.duration, duration: exportAudio.duration });
      setExportProgress(100);
      setTimeout(() => recorder.stop(), 600);
    });

    animId = requestAnimationFrame(renderLoop);
  }

  // ── Line renderer ─────────────────────────────────────────
  function renderLine(line, idx) {
    const isActive = idx === lineIdx;
    const isPast   = idx < lineIdx;
    return (
      <div key={idx} ref={el => lineRefs.current[idx] = el} onClick={() => clickLine(idx)}
        style={{ padding: '0.65rem 1rem', borderRadius: 8, cursor: 'pointer',
          background: isActive ? TEAL+'14' : 'transparent',
          border: `1px solid ${isActive ? TEAL+'44' : 'transparent'}`,
          marginBottom: 4, transition: 'all 0.15s',
          opacity: isActive ? 1 : isPast ? 0.25 : 0.45 }}>
        {line.sectionLabel && (
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: TEAL2, marginBottom: 6 }}>
            {line.sectionLabel}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '0 2px' }}>
          {line.tokens.map((tok, ti) => (
            <span key={ti} style={{ display: 'inline-flex', flexDirection: 'column',
              alignItems: 'flex-start', marginRight: tok.chord ? 4 : 0 }}>
              {tok.chord && (
                <span style={{ fontFamily: 'JetBrains Mono, monospace',
                  fontSize: isActive ? '0.88rem' : '0.78rem', fontWeight: 700,
                  color: isActive ? TEAL2 : MUTED, marginBottom: 1, transition: 'all 0.15s' }}>
                  {tok.chord}
                </span>
              )}
              {tok.lyric && (
                <span style={{ fontSize: isActive ? '1.1rem' : '0.95rem',
                  fontWeight: isActive ? 600 : 400, color: isActive ? WHITE : MUTED,
                  lineHeight: 1.5, transition: 'all 0.15s' }}>
                  {tok.lyric}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column',
      background: BG, fontFamily: 'Inter, sans-serif', overflow: 'hidden', position: 'relative' }}>
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Overlays */}
      {syncDone && (
        <SyncCompleteOverlay
          lineCount={timestamps.filter(t => t != null).length}
          onPlayback={handlePlayback}
          onExport={startVideoExport}
          onResync={restartSync}
        />
      )}
      {exporting && (
        <ExportOverlay
          progress={exportProgress}
          onCancel={() => { cancelRef.current = true; }}
        />
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '0.75rem 1.5rem', borderBottom: `1px solid ${BORDER}`,
        background: SURFACE, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: `1px solid ${BORDER}`,
          borderRadius: 6, padding: '0.35rem 0.75rem', color: MUTED, fontSize: '0.8rem', fontWeight: 600 }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: WHITE, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>
            {song.title}
            {song.artist && <span style={{ fontWeight: 400, color: MUTED, marginLeft: 8, fontSize: '0.85rem' }}>— {song.artist}</span>}
          </div>
        </div>
        {song.key && (
          <div style={{ background: TEAL+'22', border: `1px solid ${TEAL}44`, borderRadius: 20,
            padding: '0.2rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, color: TEAL2 }}>
            Key: {song.key}
          </div>
        )}
        {song.capo > 0 && (
          <div style={{ background: DIM+'33', borderRadius: 20, padding: '0.2rem 0.65rem',
            fontSize: '0.7rem', color: MUTED }}>Capo {song.capo}</div>
        )}
        {/* Export shortcut once synced */}
        {synced && !exporting && (
          <button onClick={startVideoExport} style={{ fontSize: '0.75rem', fontWeight: 700,
            color: TEAL2, background: TEAL+'14', border: `1px solid ${TEAL}44`,
            borderRadius: 6, padding: '0.35rem 0.85rem', whiteSpace: 'nowrap' }}>
            🎬 Export video
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Scrolling lyrics */}
        <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
          {lines.map((line, idx) => renderLine(line, idx))}
          <div style={{ height: '40vh' }} />
        </div>

        {/* Chord panel */}
        <div style={{ width: 280, borderLeft: `1px solid ${BORDER}`, background: SURFACE,
          overflowY: 'auto', padding: '1.25rem', flexShrink: 0 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: MUTED, marginBottom: '1rem',
            paddingBottom: '0.5rem', borderBottom: `1px solid ${BORDER}` }}>
            Current chords
          </div>
          {currentLine?.chords?.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 0.5rem' }}>
              {currentLine.chords.map(chord => <ChordDiagram key={chord} name={chord} />)}
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: DIM }}>No chords on this line.</div>
          )}
          {lineIdx + 1 < lines.length && lines[lineIdx+1]?.chords?.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: DIM, marginBottom: '0.75rem',
                paddingBottom: '0.5rem', borderBottom: `1px solid ${BORDER}` }}>Up next</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 0.5rem', opacity: 0.5 }}>
                {lines[lineIdx+1].chords.map(chord => <ChordDiagram key={chord} name={chord} compact />)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{ borderTop: `1px solid ${BORDER}`, background: SURFACE,
        padding: '0.75rem 1.5rem', flexShrink: 0 }}>
        <div onClick={seek} style={{ height: 4, background: BORDER, borderRadius: 2,
          marginBottom: '0.75rem', cursor: 'pointer' }}>
          <div style={{ height: '100%', width: `${duration ? (currentTime/duration)*100 : 0}%`,
            background: TEAL, borderRadius: 2, transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={togglePlay} style={{ width: 40, height: 40, borderRadius: '50%',
            background: TEAL, border: 'none', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1rem', color: WHITE, flexShrink: 0 }}>
            {playing ? '❙❙' : '▶'}
          </button>
          <span style={{ fontSize: '0.78rem', color: MUTED, fontFamily: 'JetBrains Mono, monospace',
            whiteSpace: 'nowrap' }}>
            {fmt(currentTime)} / {fmt(duration)}
          </span>
          <div style={{ flex: 1, textAlign: 'center' }}>
            {syncMode ? (
              lineIdx === lines.length - 1 ? (
                <span style={{ fontSize: '0.78rem', color: '#FBBF24', fontWeight: 700 }}>
                  Last line — tap <kbd style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 4,
                    padding: '0.1rem 0.4rem', fontSize: '0.72rem', color: WHITE }}>Space</kbd> one more time to finish ✓
                </span>
              ) : (
                <span style={{ fontSize: '0.78rem', color: TEAL2, fontWeight: 600 }}>
                  Tap <kbd style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 4,
                    padding: '0.1rem 0.4rem', fontSize: '0.72rem', color: WHITE }}>Space</kbd> to advance •{' '}
                  Line {lineIdx + 1} / {lines.length}
                </span>
              )
            ) : (
              <span style={{ fontSize: '0.78rem', color: MUTED }}>
                {synced ? 'Auto-synced ✓' : 'Click any line or tap Space'}{' · '}
                <span style={{ fontSize: '0.75rem' }}>◀ ▶ to navigate</span>
              </span>
            )}
          </div>
          {synced && (
            <button onClick={restartSync} style={{ fontSize: '0.75rem', fontWeight: 600,
              color: MUTED, background: 'none', border: `1px solid ${BORDER}`,
              borderRadius: 6, padding: '0.3rem 0.75rem', whiteSpace: 'nowrap' }}>
              Re-sync
            </button>
          )}
          {!syncMode && (
            <button onClick={() => setSyncMode(true)} style={{ fontSize: '0.75rem', fontWeight: 600,
              color: TEAL2, background: 'none', border: `1px solid ${TEAL}44`,
              borderRadius: 6, padding: '0.3rem 0.75rem', whiteSpace: 'nowrap' }}>
              Manual mode
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  if (session) {
    return <PlayerView song={session.song} audioUrl={session.audioUrl} onBack={() => setSession(null)} />;
  }
  return <HomeView onStart={setSession} />;
}
