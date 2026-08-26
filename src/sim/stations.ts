/**
 * Station progression. Every field here is read by the simulation, so a card in the
 * UI can never advertise a bonus that does nothing. Values are absolute (not deltas)
 * so the effect of any level is a single lookup instead of a fold over history.
 */
export interface StationTier {
  level: number;
  name: string;
  blurb: string;
  /** multiplies the base upgrade price to reach THIS level */
  costMultiplier: number;
  /** multiplies the city tier's base platform capacity */
  capacityMult: number;
  /** multiplies fares earned on legs departing this station */
  ticketMult: number;
  /** multiplies dwell time — lower is faster boarding */
  dwellMult: number;
  /** extra trains each connected line may hold (limited by the weaker endpoint) */
  platforms: number;
  /** dollars earned per passenger handled at this station */
  commercialPerPax: number;
  /** how strongly other cities pick this one as a destination */
  attractiveness: number;
  glyph: string;
  art: [string, string];
}

export const STATION_TIERS: StationTier[] = [
  {
    level: 1,
    name: 'Tiny Station',
    blurb: 'A single platform, a timetable board and not much else.',
    costMultiplier: 0,
    capacityMult: 1,
    ticketMult: 1,
    dwellMult: 1,
    platforms: 0,
    commercialPerPax: 0,
    attractiveness: 1,
    glyph: '🚏',
    art: ['#243840', '#101a1e'],
  },
  {
    level: 2,
    name: '+ Newsstand',
    blurb: 'Somewhere to wait that sells papers. Crowds tolerate a longer queue.',
    costMultiplier: 1,
    capacityMult: 1.12,
    ticketMult: 1.04,
    dwellMult: 1,
    platforms: 0,
    commercialPerPax: 0.004,
    attractiveness: 1,
    glyph: '🗞️',
    art: ['#2b3a34', '#101a1e'],
  },
  {
    level: 3,
    name: '+ Cafe',
    blurb: 'Coffee on the concourse keeps people moving through the gates faster.',
    costMultiplier: 1.7,
    capacityMult: 1.24,
    ticketMult: 1.09,
    dwellMult: 0.95,
    platforms: 0,
    commercialPerPax: 0.011,
    attractiveness: 1,
    glyph: '☕',
    art: ['#3a3226', '#101a1e'],
  },
  {
    level: 4,
    name: '+ Shops',
    blurb: 'A retail parade. Passengers spend while they wait and pay more to ride.',
    costMultiplier: 2.6,
    capacityMult: 1.38,
    ticketMult: 1.15,
    dwellMult: 0.95,
    platforms: 0,
    commercialPerPax: 0.021,
    attractiveness: 1,
    glyph: '🛍️',
    art: ['#3d2f3a', '#101a1e'],
  },
  {
    level: 5,
    name: '+ Food Court',
    blurb: 'The station becomes a destination in its own right.',
    costMultiplier: 3.9,
    capacityMult: 1.55,
    ticketMult: 1.22,
    dwellMult: 0.95,
    platforms: 0,
    commercialPerPax: 0.034,
    attractiveness: 1.06,
    glyph: '🍜',
    art: ['#43302a', '#101a1e'],
  },
  {
    level: 6,
    name: '+ Concourse',
    blurb: 'A proper hall separates arrivals from departures — transfers stop jamming.',
    costMultiplier: 5.6,
    capacityMult: 1.8,
    ticketMult: 1.29,
    dwellMult: 0.86,
    platforms: 0,
    commercialPerPax: 0.034,
    attractiveness: 1.06,
    glyph: '🏛️',
    art: ['#26343f', '#101a1e'],
  },
  {
    level: 7,
    name: '+ Bus/Taxi Hub',
    blurb: 'Road links feed the platforms, pulling riders in from the whole metro.',
    costMultiplier: 7.9,
    capacityMult: 2.0,
    ticketMult: 1.36,
    dwellMult: 0.86,
    platforms: 0,
    commercialPerPax: 0.04,
    attractiveness: 1.18,
    glyph: '🚕',
    art: ['#3f3620', '#101a1e'],
  },
  {
    level: 8,
    name: '+ Additional Platforms',
    blurb: 'More track means more trains can sit here at once without waiting outside.',
    costMultiplier: 11,
    capacityMult: 2.3,
    ticketMult: 1.43,
    dwellMult: 0.79,
    platforms: 1,
    commercialPerPax: 0.04,
    attractiveness: 1.18,
    glyph: '🚉',
    art: ['#23343a', '#101a1e'],
  },
  {
    level: 9,
    name: '+ Terminal Facilities',
    blurb: 'Lounges, baggage and staffed gates. Premium fares, premium turnaround.',
    costMultiplier: 15.5,
    capacityMult: 2.7,
    ticketMult: 1.5,
    dwellMult: 0.73,
    platforms: 1,
    commercialPerPax: 0.055,
    attractiveness: 1.18,
    glyph: '🧳',
    art: ['#33283f', '#101a1e'],
  },
  {
    level: 10,
    name: '+ Grand Terminal',
    blurb: 'A landmark terminus. Everything runs through here, and everything pays.',
    costMultiplier: 22,
    capacityMult: 3.2,
    ticketMult: 2,
    dwellMult: 0.66,
    platforms: 1,
    commercialPerPax: 0.075,
    attractiveness: 1.32,
    glyph: '🏰',
    art: ['#43371f', '#101a1e'],
  },
];

export const MAX_STATION_TIER = STATION_TIERS.length;

export function stationTier(level: number): StationTier {
  return STATION_TIERS[Math.min(MAX_STATION_TIER, Math.max(1, level)) - 1];
}

export interface StationPerk {
  icon: string;
  label: string;
}

/** What this level adds over the previous one — derived, so it can't drift from the numbers. */
export function tierPerks(level: number): StationPerk[] {
  const t = stationTier(level);
  const prev = level > 1 ? stationTier(level - 1) : null;
  const out: StationPerk[] = [];

  if (!prev || t.capacityMult !== prev.capacityMult)
    out.push({ icon: '👥', label: `${t.capacityMult.toFixed(2)}× passenger capacity` });
  if (!prev || t.platforms !== prev.platforms)
    out.push({ icon: '🚆', label: `+${t.platforms} trains per line` });
  if (!prev || t.dwellMult !== prev.dwellMult)
    out.push({
      icon: '⏱️',
      label: `${Math.round((1 - t.dwellMult) * 100)}% faster boarding`,
    });
  if (!prev || t.ticketMult !== prev.ticketMult)
    out.push({ icon: '💰', label: `${t.ticketMult.toFixed(2)}× ticket revenue` });
  if (!prev || t.commercialPerPax !== prev.commercialPerPax)
    out.push({
      icon: '🛍️',
      label: `$${t.commercialPerPax.toFixed(3)} retail per passenger`,
    });
  if (!prev || t.attractiveness !== prev.attractiveness)
    out.push({ icon: '⭐', label: `${t.attractiveness.toFixed(2)}× travel demand` });

  return out.filter((p) => !p.label.startsWith('+0 ') && !p.label.startsWith('0%'));
}