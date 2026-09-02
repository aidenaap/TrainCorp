import type { BuildMode, DraftSummary } from '../build/trackBuilder';
import { money } from './format';

interface Props {
  draft: DraftSummary;
  /** Running cost of everything laid so far plus the live preview. */
  cost: number | null;
  affordable: boolean;
  onMode: (mode: BuildMode) => void;
  onUndo: () => void;
  onCancel: () => void;
}

function StraightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M3 19 L21 5" stroke="currentColor" strokeWidth="2.2" fill="none" />
      <circle cx="3" cy="19" r="2.2" fill="currentColor" />
      <circle cx="21" cy="5" r="2.2" fill="currentColor" />
    </svg>
  );
}

function CurveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M3 19 C 3 9, 11 5, 21 5" stroke="currentColor" strokeWidth="2.2" fill="none" />
      <circle cx="3" cy="19" r="2.2" fill="currentColor" />
      <circle cx="21" cy="5" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function TrackTools({ draft, cost, affordable, onMode, onUndo, onCancel }: Props) {
  if (!draft.active) return null;

  const hint = draft.error
    ? draft.error
    : draft.adjusted
      ? 'Radius widened so a train can hold the curve.'
      : draft.sectionCount === 0
        ? 'Place a section, then finish on another station.'
        : 'Click a station to finish · Shift snaps the angle.';

  return (
    <div className="tracktools">
      <div className="tracktools__modes">
        <button
          type="button"
          className={`tracktools__mode${draft.mode === 'straight' ? ' is-active' : ''}`}
          onClick={() => onMode('straight')}
          title="Straight section (S)"
        >
          <StraightIcon />
          <span>Straight</span>
        </button>
        <button
          type="button"
          className={`tracktools__mode${draft.mode === 'curve' ? ' is-active' : ''}`}
          onClick={() => onMode('curve')}
          title="Curved section (C) — turns may not exceed 90°"
        >
          <CurveIcon />
          <span>Curve</span>
        </button>
      </div>

      <div className="tracktools__meta">
        <span className="tracktools__stat">
          {draft.sectionCount} section{draft.sectionCount === 1 ? '' : 's'}
        </span>
        <span className="tracktools__stat">{Math.round(draft.length)} km</span>
        {cost !== null && (
          <span className={`tracktools__stat${affordable ? '' : ' is-bad'}`}>{money(cost)}</span>
        )}
      </div>

      <p className={`tracktools__hint${draft.error ? ' is-bad' : ''}`}>{hint}</p>

      <div className="tracktools__actions">
        <button type="button" onClick={onUndo} disabled={!draft.canUndo}>
          Undo section
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
