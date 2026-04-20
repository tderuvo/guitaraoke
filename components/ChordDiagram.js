"use client";
import { lookupChord } from '../lib/chords';

const W = 72, H = 90;
const PAD_L = 10, PAD_R = 10, PAD_T = 20, PAD_B = 10;
const PLOT_W = W - PAD_L - PAD_R;   // 52
const PLOT_H = H - PAD_T - PAD_B;   // 60
const NUM_STRINGS = 6;
const NUM_FRETS = 4;
const STR_GAP = PLOT_W / (NUM_STRINGS - 1);   // ~10.4
const FRET_GAP = PLOT_H / NUM_FRETS;           // 15

const sx = i => PAD_L + i * STR_GAP;          // x of string i (0=lowE, 5=highE)
const fy = f => PAD_T + f * FRET_GAP;          // y of fret-line f (0=nut, 4=bottom)
const dotY = f => fy(f - 1) + FRET_GAP / 2;   // y center of fret f (1-based)
const DOT_R = FRET_GAP * 0.33;

export default function ChordDiagram({ name, compact = false }) {
  const chord = lookupChord(name);

  // Unknown chord — show name only
  if (!chord) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 2, opacity: 0.7 }}>
        <div style={{ width: W, height: H, display: 'flex', alignItems: 'center',
          justifyContent: 'center', border: '1px dashed #4B5563', borderRadius: 6,
          fontSize: 11, color: '#9CA3AF' }}>
          ?
        </div>
        <span style={{ fontSize: compact ? 10 : 11, fontWeight: 700,
          color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }}>
          {name}
        </span>
      </div>
    );
  }

  const { frets, barre } = chord;

  // Determine display window
  const usedFrets = frets.filter(f => f > 0);
  const minFret = usedFrets.length ? Math.min(...usedFrets) : 1;
  const maxFret = usedFrets.length ? Math.max(...usedFrets) : 4;
  const openPos = minFret === 1 || maxFret <= 4;    // show nut
  const windowStart = openPos ? 1 : minFret;         // first fret of display window

  // Normalize fret to display row (1-4)
  const norm = f => f - windowStart + 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', overflow: 'visible' }}>

        {/* Nut (thick top bar) or fret-number indicator */}
        {openPos ? (
          <rect x={PAD_L - 1} y={PAD_T - 3} width={PLOT_W + 2} height={3.5}
            fill="#F9FAFB" rx={1} />
        ) : (
          <text x={PAD_L - 8} y={dotY(1) + 4} fontSize="9" fontWeight="600"
            fill="#9CA3AF" textAnchor="middle">
            {windowStart}
          </text>
        )}

        {/* Fret lines */}
        {[0, 1, 2, 3, 4].map(f => (
          <line key={f} x1={PAD_L} y1={fy(f)} x2={PAD_L + PLOT_W} y2={fy(f)}
            stroke={f === 0 ? '#4B5563' : '#374151'} strokeWidth={f === 0 ? 0.8 : 0.7} />
        ))}

        {/* Strings */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <line key={i} x1={sx(i)} y1={fy(0)} x2={sx(i)} y2={fy(NUM_FRETS)}
            stroke="#4B5563" strokeWidth={i === 0 ? 1.4 : 0.9} />
        ))}

        {/* Barre bar */}
        {barre && norm(barre.fret) >= 1 && norm(barre.fret) <= 4 && (
          <rect
            x={sx(barre.from) - DOT_R * 0.5}
            y={dotY(norm(barre.fret)) - DOT_R}
            width={sx(barre.to) - sx(barre.from) + DOT_R}
            height={DOT_R * 2}
            fill="#0D9488"
            rx={DOT_R}
          />
        )}

        {/* Finger dots */}
        {frets.map((f, i) => {
          if (f <= 0) return null;
          const row = norm(f);
          if (row < 1 || row > NUM_FRETS) return null;
          // Skip strings covered by barre at same fret
          if (barre && f === barre.fret && i >= barre.from && i <= barre.to) return null;
          return (
            <circle key={i} cx={sx(i)} cy={dotY(row)} r={DOT_R}
              fill="#0D9488" />
          );
        })}

        {/* Open / muted markers */}
        {frets.map((f, i) => {
          if (f === 0) return (
            <text key={i} x={sx(i)} y={PAD_T - 6} fontSize="9" textAnchor="middle"
              fill="#6EE7B7" fontWeight="700">o</text>
          );
          if (f === -1) return (
            <text key={i} x={sx(i)} y={PAD_T - 6} fontSize="9" textAnchor="middle"
              fill="#F87171" fontWeight="700">×</text>
          );
          return null;
        })}
      </svg>

      {/* Chord name label */}
      <span style={{
        fontSize: compact ? 10 : 12,
        fontWeight: 700,
        color: '#F9FAFB',
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '-0.02em',
      }}>
        {name}
      </span>
    </div>
  );
}
