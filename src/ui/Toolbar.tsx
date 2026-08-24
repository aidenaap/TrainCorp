import { SPEED_OPTIONS, type SpeedOption } from '../sim/config';
import { money } from './format';

export interface PendingBuild {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  distance: number;
  cost: number;
  affordable: boolean;
}

interface Props {
  buildMode: boolean;
  buildStage: 'idle' | 'pickFirst' | 'pickSecond';
  paused: boolean;
  speed: SpeedOption;
  openPanel: 'trains' | 'stats' | null;
  onToggleBuild: () => void;
  onOpenPanel: (panel: 'trains' | 'stats') => void;
  onTogglePause: () => void;
  onSpeed: (speed: SpeedOption) => void;
  onReset: () => void;
}

export function Toolbar({
  buildMode,
  buildStage,
  paused,
  speed,
  openPanel,
  onToggleBuild,
  onOpenPanel,
  onTogglePause,
  onSpeed,
  onReset,
}: Props) {
  const hint =
    buildStage === 'pickFirst'
      ? 'Pick the first station'
      : buildStage === 'pickSecond'
        ? 'Pick the second station · Esc to cancel'
        : null;

  return (
    <footer className="toolbar">
      <div className="toolbar__group">
        <button className={`btn${buildMode ? ' btn--armed' : ''}`} onClick={onToggleBuild}>
          {buildMode ? 'Cancel build' : 'Build railway'}
        </button>
        <button
          className={`btn${openPanel === 'trains' ? ' btn--active' : ''}`}
          onClick={() => onOpenPanel('trains')}
        >
          Trains
        </button>
        <button
          className={`btn${openPanel === 'stats' ? ' btn--active' : ''}`}
          onClick={() => onOpenPanel('stats')}
        >
          Statistics
        </button>
        {hint && <span className="toolbar__hint">{hint}</span>}
      </div>

      <div className="toolbar__group">
        <button className={`btn${paused ? ' btn--armed' : ''}`} onClick={onTogglePause}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <div className="speed">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              className={`speed__btn${speed === s && !paused ? ' is-active' : ''}`}
              onClick={() => onSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>
        <button className="btn btn--ghost" onClick={onReset}>
          Reset
        </button>
      </div>
    </footer>
  );
}

export function BuildConfirm({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingBuild;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirm">
      <div className="confirm__route">
        <span className="confirm__eyebrow">New line</span>
        <span className="confirm__cities">
          {pending.fromName} → {pending.toName}
        </span>
        <span className="confirm__meta">
          {Math.round(pending.distance)} km · {money(pending.cost)}
        </span>
      </div>
      <div className="confirm__actions">
        <button className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn--primary" disabled={!pending.affordable} onClick={onConfirm}>
          {pending.affordable ? 'Lay track' : 'Not enough money'}
        </button>
      </div>
    </div>
  );
}
