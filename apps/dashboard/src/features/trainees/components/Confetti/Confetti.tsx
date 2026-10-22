import type { CSSProperties } from 'react';
import './Confetti.css';

const PIECES = 36;
// The golden angle spreads the pieces evenly around the medal without randomness (a pure render).
const GOLDEN_ANGLE = 2.39996;

interface Piece {
  x: number;
  y: number;
  turn: number;
  /** 0–1: each piece flies a little longer than the one before (--confetti-spread). */
  lag: number;
}

const PIECE_PATHS: Piece[] = Array.from({ length: PIECES }, (_, index) => {
  const angle = index * GOLDEN_ANGLE;
  const distance = 70 + ((index * 37) % 90);
  return {
    x: Math.round(Math.cos(angle) * distance),
    // A little gravity: everything ends lower than it would on a circle.
    y: Math.round(Math.sin(angle) * distance + 40),
    turn: (index * 83) % 540,
    lag: (index % 7) / 6,
  };
});

/**
 * One burst of confetti from the medal, in the category's colors (--ach-color, --ach-light) and
 * the brand's. Mounted once per opening of an unlocked badge; never with reduced motion (CSS).
 * MIRRORED in apps/mobile/src/features/achievements/components/Confetti — change both.
 */
export function Confetti() {
  return (
    <span className="confetti" aria-hidden="true">
      {PIECE_PATHS.map((piece, index) => (
        <i
          key={index}
          className="confetti-piece"
          // Computed values, not styling: where this piece flies and how long it takes.
          style={{ '--confetti-x': `${piece.x}px`, '--confetti-y': `${piece.y}px`, '--confetti-turn': `${piece.turn}deg`, '--confetti-lag': piece.lag } as CSSProperties}
        />
      ))}
    </span>
  );
}
