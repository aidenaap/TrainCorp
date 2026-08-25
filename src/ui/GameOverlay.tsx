import type { UiSnapshot } from '../sim/engine';
import { clock, compact, money } from './format';

interface Props {
  snap: UiSnapshot;
  onReplay: () => void;
}

export function GameOverlay({ snap, onReplay }: Props) {
  if (snap.outcome === 'playing') return null;
  const won = snap.outcome === 'won';

  return (
    <div className={`overlay overlay--${snap.outcome}`} role="dialog" aria-modal="true">
      <div className="overlay__card">
        <p className="overlay__eyebrow">{won ? 'Network complete' : 'Network collapsed'}</p>
        <h1 className="overlay__title">{won ? 'Congratulations' : 'Sorry'}</h1>
        <p className="overlay__body">
          {won
            ? 'Every continent is open and every station is on the network. The world runs on your rails.'
            : 'Overloaded platforms stayed jammed for too long and the network shut down.'}
        </p>

        <dl className="facts overlay__facts">
          <div className="facts__item">
            <dt>Time</dt>
            <dd>{clock(snap.elapsed)}</dd>
          </div>
          <div className="facts__item">
            <dt>Delivered</dt>
            <dd>{compact(snap.delivered)}</dd>
          </div>
          <div className="facts__item">
            <dt>Revenue</dt>
            <dd>{money(snap.revenue)}</dd>
          </div>
          <div className="facts__item">
            <dt>Lines</dt>
            <dd>{snap.railwayCount}</dd>
          </div>
        </dl>

        <div className="overlay__actions">
          <button className="btn btn--primary" onClick={onReplay}>
            Replay
          </button>
        </div>
      </div>
    </div>
  );
}