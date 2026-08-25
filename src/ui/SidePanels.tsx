import { CONFIG } from '../sim/config';
import { CONTINENTS } from '../sim/mapData';
import type { CitySnapshot, UiSnapshot } from '../sim/engine';
import { clock, compact, money } from './format';

interface CloseProps {
  onClose: () => void;
}

const continentNames = new Map(CONTINENTS.map((continent) => [continent.id, continent.name]));

export function TrainsPanel({
  snap,
  onBuyTrain,
  onUpgradeLine,
  onSelectLine,
  onClose,
}: CloseProps & {
  snap: UiSnapshot;
  onBuyTrain: (id: string) => void;
  onUpgradeLine: (id: string) => void;
  onSelectLine: (id: string) => void;
}) {
  return (
    <aside className="panel">
      <div className="panel__head">
        <div>
          <p className="panel__eyebrow">Rolling stock</p>
          <h2 className="panel__title">{snap.trainCount} trains</h2>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close panel">
          ✕
        </button>
      </div>

      {snap.railways.length === 0 ? (
        <p className="empty">Lay track first — trains need somewhere to run.</p>
      ) : (
        [...continentNames.entries()].map(([continentId, continentName]) => {
          const lines = snap.railways
            .filter((line) => {
              const from = snap.cities.find((city) => city.id === line.fromId);
              const to = snap.cities.find((city) => city.id === line.toId);
              return from?.continent === continentId || to?.continent === continentId;
            })
            .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
          if (lines.length === 0) return null;
          return (
            <section key={continentId} className="panel-section">
              <p className="panel__eyebrow">{continentName}</p>
              <ul className="line-list">
                {lines.map((line) => {
            const full = line.trains >= line.capacity;
            const broke = snap.money < CONFIG.trainCost;
            const canUpgrade = line.level < 3;
            const upgradeBroke = snap.money < line.upgradeCost;
            return (
              <li key={line.id} className="line-list__row">
                <button className="line-list__link" onClick={() => onSelectLine(line.id)}>
                  <span className="line-list__name">
                    {line.from} → {line.to}
                  </span>
                  <span className="line-list__meta">
                    {Math.round(line.distance)} km · L{line.level} ({line.speedMultiplier}×) · {line.trains}/{line.capacity} trains
                  </span>
                </button>
                <button
                  className="btn btn--small"
                  disabled={full || broke}
                  onClick={() => onBuyTrain(line.id)}
                >
                  {full ? 'Full' : `Train ${money(CONFIG.trainCost)}`}
                </button>
                <button
                  className="btn btn--small btn--ghost"
                  disabled={!canUpgrade || upgradeBroke}
                  onClick={() => onUpgradeLine(line.id)}
                >
                  {canUpgrade ? `Upgrade ${money(line.upgradeCost)}` : 'Bullet'}
                </button>
              </li>
            );
                })}
              </ul>
            </section>
          );
        })
      )}
    </aside>
  );
}

export function StationsPanel({
  snap,
  onSelectStation,
  onClose,
}: CloseProps & { snap: UiSnapshot; onSelectStation: (id: string) => void }) {
  const stations = [...snap.cities].sort(
    (a, b) => a.continent.localeCompare(b.continent) || a.name.localeCompare(b.name),
  );

  return (
    <aside className="panel">
      <div className="panel__head">
        <div>
          <p className="panel__eyebrow">Stations</p>
          <h2 className="panel__title">All stations</h2>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close panel">
          ✕
        </button>
      </div>
      <ul className="station-list">
        {stations.map((station: CitySnapshot) => (
          <li key={station.id} className="station-list__row">
            <button className="line-list__link" onClick={() => onSelectStation(station.id)}>
              <span className="line-list__name">{station.name}</span>
              <span className="line-list__meta">
                {continentNames.get(station.continent)} · L{station.stationLevel} · {money(station.stationRevenue)} earned
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function StatsPanel({ snap, onClose }: CloseProps & { snap: UiSnapshot }) {
  const pressured = [...snap.cities]
    .sort((a, b) => b.waiting / b.capacity - a.waiting / a.capacity)
    .slice(0, 6);

  return (
    <aside className="panel">
      <div className="panel__head">
        <div>
          <p className="panel__eyebrow">Operations</p>
          <h2 className="panel__title">Statistics</h2>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close panel">
          ✕
        </button>
      </div>

      <dl className="facts">
        <div className="facts__item">
          <dt>Treasury</dt>
          <dd>{money(snap.money)}</dd>
        </div>
        <div className="facts__item">
          <dt>Total earned</dt>
          <dd>{money(snap.revenue)}</dd>
        </div>
        <div className="facts__item">
          <dt>Income / min</dt>
          <dd>{money(snap.revenuePerMinute)}</dd>
        </div>
        <div className="facts__item">
          <dt>Delivered</dt>
          <dd>{compact(snap.delivered)}</dd>
        </div>
        <div className="facts__item">
          <dt>Network health</dt>
          <dd>{snap.networkHealth}%</dd>
        </div>
        <div className="facts__item">
          <dt>Running time</dt>
          <dd>{clock(snap.elapsed)}</dd>
        </div>
      </dl>

      <p className="panel__eyebrow">Most pressure</p>
      <ul className="pressure">
        {pressured.map((c) => (
          <li key={c.id} className={`pressure__row pressure__row--${c.status}`}>
            <span>{c.name}</span>
            <span className="pressure__bar">
              <i style={{ width: `${Math.min(100, (c.waiting / c.capacity) * 100)}%` }} />
            </span>
            <span className="pressure__num">{Math.round(c.waiting)}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
