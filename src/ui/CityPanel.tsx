import { CONFIG } from '../sim/config';
import type { CitySnapshot, RailwaySnapshot } from '../sim/engine';
import { compact, money } from './format';

interface Props {
  city: CitySnapshot;
  lines: RailwaySnapshot[];
  money: number;
  onBuyTrain: (railwayId: string) => void;
  onStartLine: (cityId: string) => void;
  onClose: () => void;
}

const STATUS_LABEL = {
  healthy: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
  overloaded: 'Overloaded',
} as const;

export function CityPanel({ city, lines, money: cash, onBuyTrain, onStartLine, onClose }: Props) {
  const ratio = Math.min(1.35, city.waiting / city.capacity);

  return (
    <aside className="panel">
      <div className="panel__head">
        <div>
          <p className="panel__eyebrow">Station</p>
          <h2 className="panel__title">{city.name}</h2>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close station panel">
          ✕
        </button>
      </div>

      <div className={`gauge gauge--${city.status}`}>
        <div className="gauge__bar">
          <span style={{ width: `${Math.min(100, ratio * 100)}%` }} />
        </div>
        <div className="gauge__row">
          <span className="gauge__count">
            {Math.round(city.waiting).toLocaleString()} / {city.capacity.toLocaleString()}
          </span>
          <span className="gauge__status">{STATUS_LABEL[city.status]}</span>
        </div>
      </div>

      <dl className="facts">
        <Fact label="Population" value={compact(city.population)} />
        <Fact label="Waiting" value={Math.round(city.waiting).toLocaleString()} />
        <Fact label="Capacity" value={city.capacity.toLocaleString()} />
        <Fact label="Lines" value={`${city.railways}`} />
        <Fact label="Trains on lines" value={`${city.trains}`} />
        <Fact label="Inbound now" value={`${city.inbound}`} />
      </dl>

      <p className="panel__eyebrow">Connections</p>
      {lines.length === 0 ? (
        <p className="empty">
          No track here yet. Passengers will keep piling up until this station is on the network.
        </p>
      ) : (
        <ul className="line-list">
          {lines.map((line) => {
            const other = line.fromId === city.id ? line.to : line.from;
            const full = line.trains >= line.capacity;
            const broke = cash < CONFIG.trainCost;
            return (
              <li key={line.id} className="line-list__row">
                <div>
                  <span className="line-list__name">{other}</span>
                  <span className="line-list__meta">
                    {Math.round(line.distance)} km · {line.trains}/{line.capacity} trains
                  </span>
                </div>
                <button
                  className="btn btn--small"
                  disabled={full || broke}
                  onClick={() => onBuyTrain(line.id)}
                  title={full ? 'Line at train capacity' : `Buy a train for ${money(CONFIG.trainCost)}`}
                >
                  {full ? 'Full' : `Train ${money(CONFIG.trainCost)}`}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button className="btn btn--wide" onClick={() => onStartLine(city.id)}>
        Build a line from {city.name}
      </button>
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="facts__item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
