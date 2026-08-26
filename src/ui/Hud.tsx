import type { UiSnapshot } from '../sim/engine';
import { clock, compact, money } from './format';

interface Props {
  snap: UiSnapshot;
  paused: boolean;
  speed: number;
}

export function Hud({ snap, paused, speed }: Props) {
  const waiting = snap.cities.reduce((sum, c) => sum + c.waiting, 0);
  const health = snap.networkHealth;
  const healthClass = health >= 70 ? 'ok' : health >= 40 ? 'warn' : 'bad';

  const jammed = snap.overloadedCount;
  const pressure = Math.min(100, (snap.overloadTimer / snap.overloadLimit) * 100);
  const secondsLeft = Math.max(
    0,
    Math.ceil((snap.overloadLimit - snap.overloadTimer) / Math.max(1, jammed)),
  );

  return (
    <header className="hud">
      <div className="hud__brand">
        <span className="hud__mark">VB</span>
        <span className="hud__title">Verrand Basin Railway</span>
      </div>

      {jammed > 0 && (
        <div className="hud__alert" role="status">
          <span className="hud__alert-title">
            {jammed} station{jammed === 1 ? '' : 's'} overloaded
          </span>
          <span className="hud__alert-bar">
            <i style={{ width: `${pressure}%` }} />
          </span>
          <span className="hud__alert-time">{secondsLeft}s</span>
        </div>
      )}

      <div className="hud__stats">
        <Stat label="Treasury" value={money(snap.money)} tone="brass" />
        <Stat label="Waiting" value={compact(waiting)} />
        <Stat label="Trains" value={`${snap.trainCount}`} />
        <Stat label="Lines" value={`${snap.railwayCount}`} />
        <Stat label="Delivered" value={compact(snap.delivered)} />
        <Stat label="Income / min" value={money(snap.revenuePerMinute)} />
        <Stat label="Network" value={`${health}%`} tone={healthClass} />
        <Stat label="Clock" value={paused ? 'PAUSED' : `${clock(snap.elapsed)} · ${speed}×`} />
      </div>
    </header>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`stat${tone ? ` stat--${tone}` : ''}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}
