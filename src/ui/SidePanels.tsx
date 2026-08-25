import { useMemo, useState } from 'react';
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

      <p className="line-list__meta panel-note">
        Bullet track <span className="line-list__trains">{snap.bulletUsed}/{snap.bulletLimit}</span>{' '}
        · unlock continents for more
      </p>

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
                  const atBullet = line.level >= 3;
                  const locked = line.bulletLocked;
                  const upgradeBroke = snap.money < line.upgradeCost;
                  return (
                    <li key={line.id} className="line-list__row">
                      <button className="line-list__link" onClick={() => onSelectLine(line.id)}>
                        <span className="line-list__name">
                          {line.from} → {line.to}
                        </span>
                        <span className="line-list__meta">
                          {Math.round(line.distance)} km · L{line.level} ({line.speedMultiplier}×) ·{' '}
                          <span className="line-list__trains">
                            {line.trains}/{line.capacity} trains
                          </span>
                        </span>
                      </button>
                      <button
                        className="btn btn--small btn--teal"
                        disabled={full || broke}
                        onClick={() => onBuyTrain(line.id)}
                        title={full ? 'Line at train capacity' : `Buy a train for ${money(CONFIG.trainCost)}`}
                      >
                        {full ? 'Full' : `Train ${money(CONFIG.trainCost)}`}
                      </button>
                      <button
                        className="btn btn--small btn--teal btn--ghost"
                        disabled={atBullet || locked || upgradeBroke}
                        onClick={() => onUpgradeLine(line.id)}
                        title={
                          atBullet
                            ? 'Already bullet train track'
                            : locked
                              ? 'Bullet track allowance full — unlock another continent'
                              : `Upgrade for ${money(line.upgradeCost)}`
                        }
                      >
                        {atBullet ? 'Bullet' : locked ? 'Locked' : `Upgrade ${money(line.upgradeCost)}`}
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

type StationSort = 'earnings' | 'continent';



export function StationsPanel({
  snap,
  onSelectStation,
  onUpgradeStation,
  onClose,
}: CloseProps & {
  snap: UiSnapshot;
  onSelectStation: (id: string) => void;
  onUpgradeStation: (id: string) => void;
}) {
  const [sort, setSort] = useState<StationSort>('earnings');

  const stations = useMemo(() => {
    const open = snap.cities.filter((c) => c.unlocked);
    return sort === 'earnings'
      ? open.sort((a, b) => b.stationRevenue - a.stationRevenue || a.name.localeCompare(b.name))
      : open.sort(
          (a, b) =>
            a.continent.localeCompare(b.continent) || b.stationRevenue - a.stationRevenue,
        );
  }, [snap.cities, sort]);

  return (
    <aside className="panel">
      <div className="panel__head">
        <div>
          <p className="panel__eyebrow">Stations</p>
          <h2 className="panel__title">All stations</h2>
        </div>
        <div className="panel__head-actions">
          <div className="pill" role="group" aria-label="Sort stations">
            <button
              className={`pill__btn${sort === 'earnings' ? ' is-active' : ''}`}
              onClick={() => setSort('earnings')}
            >
              Earnings
            </button>
            <button
              className={`pill__btn${sort === 'continent' ? ' is-active' : ''}`}
              onClick={() => setSort('continent')}
            >
              Continent
            </button>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close panel">
            ✕
          </button>
        </div>
      </div>

      <ul className="station-list">
        {stations.map((station: CitySnapshot, i: number) => {
          const maxed = station.stationUpgradeCost === 0;
          const broke = snap.money < station.stationUpgradeCost;
          return (
            <li key={station.id} className="station-list__row">
              <button className="line-list__link" onClick={() => onSelectStation(station.id)}>
                <span className="line-list__name">
                  {sort === 'earnings' && <span className="station-list__rank">{i + 1}</span>}
                  {station.name}
                </span>
                <span className="line-list__meta">
                  {continentNames.get(station.continent)} · L{station.stationLevel} ·{' '}
                  <span className="line-list__trains">{money(station.stationRevenue)}</span> earned
                </span>
              </button>
              <button
                className="btn btn--small btn--teal"
                disabled={maxed || broke}
                onClick={() => onUpgradeStation(station.id)}
                title={
                  maxed
                    ? 'Station fully upgraded'
                    : `Upgrade station for ${money(station.stationUpgradeCost)}`
                }
              >
                {maxed ? 'Max' : `L${station.stationLevel + 1} ${money(station.stationUpgradeCost)}`}
              </button>
            </li>
          );
        })}
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
