import type { CityTier } from './types';

export const WORLD = { width: 1600, height: 1000 };

export interface CitySeed {
  id: string;
  name: string;
  x: number;
  y: number;
  population: number;
}

/** The Verrand Basin — an invented region, arranged to read as a plausible rail geography. */
export const CITY_SEEDS: CitySeed[] = [
  { id: 'kestrel', name: 'Kestrel Bay', x: 262, y: 152, population: 1_200_000 },
  { id: 'cliffmere', name: 'Cliffmere', x: 148, y: 322, population: 1_900_000 },
  { id: 'saltmoor', name: 'Saltmoor', x: 124, y: 566, population: 880_000 },
  { id: 'westhaven', name: 'Westhaven', x: 208, y: 782, population: 2_400_000 },
  { id: 'pinebluff', name: 'Pinebluff', x: 392, y: 298, population: 510_000 },
  { id: 'quarrytown', name: 'Quarrytown', x: 336, y: 462, population: 350_000 },
  { id: 'emberdale', name: 'Emberdale', x: 424, y: 624, population: 720_000 },
  { id: 'dunhollow', name: 'Dunhollow', x: 562, y: 852, population: 450_000 },
  { id: 'marrowgate', name: 'Marrowgate', x: 702, y: 196, population: 2_800_000 },
  { id: 'ironvale', name: 'Ironvale', x: 598, y: 402, population: 1_500_000 },
  { id: 'copperton', name: 'Copperton', x: 642, y: 692, population: 610_000 },
  { id: 'stonebridge', name: 'Stonebridge', x: 764, y: 524, population: 1_100_000 },
  { id: 'aldercross', name: 'Aldercross', x: 902, y: 330, population: 820_000 },
  { id: 'thornfield', name: 'Thornfield', x: 944, y: 662, population: 1_300_000 },
  { id: 'fennmoor', name: 'Fennmoor', x: 858, y: 884, population: 400_000 },
  { id: 'highmarsh', name: 'Highmarsh', x: 1042, y: 498, population: 560_000 },
  { id: 'northreach', name: 'Northreach', x: 1124, y: 162, population: 1_700_000 },
  { id: 'grangehill', name: 'Grangehill', x: 1198, y: 622, population: 900_000 },
  { id: 'redlock', name: 'Redlock', x: 1322, y: 352, population: 2_200_000 },
  { id: 'silverbrook', name: 'Silverbrook', x: 1452, y: 204, population: 620_000 },
  { id: 'oakcastle', name: 'Oakcastle', x: 1378, y: 760, population: 1_020_000 },
  { id: 'halloway', name: 'Halloway', x: 1256, y: 908, population: 760_000 },
];

export function tierFor(population: number): CityTier {
  if (population >= 1_500_000) return 'large';
  if (population >= 600_000) return 'medium';
  return 'small';
}

export const TIER_CAPACITY: Record<CityTier, number> = {
  small: 500,
  medium: 1_000,
  large: 2_500,
};

export type Poly = [number, number][];

/** Coastlines, inland water and highland masses. Purely decorative for the MVP. */
export const WATER: Poly[] = [
  // Western ocean
  [
    [-80, -80],
    [90, -80],
    [70, 120],
    [110, 260],
    [60, 420],
    [96, 600],
    [40, 760],
    [130, 900],
    [70, 1080],
    [-80, 1080],
  ],
  // Eastern sound
  [
    [1560, -80],
    [1680, -80],
    [1680, 1080],
    [1500, 1080],
    [1540, 880],
    [1470, 660],
    [1552, 470],
    [1494, 300],
    [1560, 90],
  ],
  // Lake Verrand
  [
    [470, 120],
    [560, 96],
    [610, 150],
    [578, 232],
    [486, 246],
    [438, 190],
  ],
  // Southern estuary
  [
    [700, 1010],
    [760, 940],
    [860, 970],
    [960, 930],
    [1010, 1010],
  ],
];

export const HIGHLANDS: Poly[] = [
  [
    [300, 210],
    [420, 170],
    [470, 300],
    [420, 430],
    [300, 470],
    [240, 360],
  ],
  [
    [640, 380],
    [790, 340],
    [880, 420],
    [850, 560],
    [700, 590],
    [610, 490],
  ],
  [
    [1080, 260],
    [1220, 240],
    [1270, 380],
    [1160, 470],
    [1050, 400],
  ],
];
