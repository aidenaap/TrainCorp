import { useEffect, useState } from 'react';
import type { CitySnapshot } from '../sim/engine';
import { MAX_STATION_TIER, STATION_TIERS, tierPerks } from '../sim/stations';
import { money } from './format';

interface Props {
  city: CitySnapshot;
  money: number;
  onUpgrade: (cityId: string) => void;
}

export function StationUpgrades({ city, money: cash, onUpgrade }: Props) {
  const maxed = city.stationLevel >= MAX_STATION_TIER;
  const nextLevel = maxed ? MAX_STATION_TIER : city.stationLevel + 1;
  const [focus, setFocus] = useState(nextLevel);

  // Snap back to the next purchasable tier whenever the station (or its level) changes.
  useEffect(() => setFocus(nextLevel), [city.id, nextLevel]);

  return (
    <div className="stationup">
      <div className="stationup__head">
        <span className="stationup__level">Level {city.stationLevel}</span>
        <span className="stationup__earned">
          {money(city.stationRevenue)} earned ({city.ticketMultiplier.toFixed(2)}×)
        </span>
      </div>

      <div className="stationup__nav">
        <button
          className="icon-btn"
          disabled={focus <= 1}
          onClick={() => setFocus((f) => Math.max(1, f - 1))}
          aria-label="Previous tier"
        >
          ‹
        </button>
        <span className="stationup__nav-label">
          {focus} / {MAX_STATION_TIER}
        </span>
        <button
          className="icon-btn"
          disabled={focus >= MAX_STATION_TIER}
          onClick={() => setFocus((f) => Math.min(MAX_STATION_TIER, f + 1))}
          aria-label="Next tier"
        >
          ›
        </button>
      </div>

      <div className="stationup__viewport">
        <div
          className="stationup__track"
          style={{ transform: `translateX(${-(focus - 1) * 188}px)` }}
        >
          {STATION_TIERS.map((tier) => {
            const owned = city.stationLevel >= tier.level;
            const isNext = tier.level === city.stationLevel + 1;
            const cost = city.stationCosts[tier.level - 1] ?? 0;
            const broke = cash < cost;
            return (
              <article
                key={tier.level}
                className={`upcard${focus === tier.level ? ' is-focus' : ''}${
                  owned ? ' is-owned' : ''
                }`}
                style={{
                  ['--art-a' as string]: tier.art[0],
                  ['--art-b' as string]: tier.art[1],
                }}
              >
                <h4 className="upcard__title">{tier.name}</h4>
                <div className="upcard__art" aria-hidden="true">
                  <span className="upcard__glyph">{tier.glyph}</span>
                  <span className="upcard__badge">{owned ? 'Owned' : `Lv ${tier.level}`}</span>
                </div>
                <div className="upcard__body">
                  <p className="upcard__blurb">{tier.blurb}</p>
                  <ul className="upcard__perks">
                    {tierPerks(tier.level).map((perk) => (
                      <li key={perk.label}>
                        <span aria-hidden="true">{perk.icon}</span> {perk.label}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="btn btn--small btn--teal upcard__buy"
                    disabled={!isNext || broke}
                    onClick={() => onUpgrade(city.id)}
                    title={
                      owned
                        ? 'Already built'
                        : isNext
                          ? `Upgrade for ${money(cost)}`
                          : 'Build the earlier tiers first'
                    }
                  >
                    {owned ? 'Built' : isNext ? `Build ${money(cost)}` : `Locked ${money(cost)}`}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}