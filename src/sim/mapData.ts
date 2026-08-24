import type { CityTier, ContinentId } from './types';

export const WORLD = { width: 2400, height: 1200 };

export interface CitySeed {
  id: string;
  name: string;
  x: number;
  y: number;
  population: number;
  continent: ContinentId;
}

export interface ContinentSeed {
  id: ContinentId;
  name: string;
  centerX: number;
  centerY: number;
}

function project(lon: number, lat: number): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * WORLD.width,
    y: ((90 - lat) / 180) * WORLD.height,
  };
}

function city(
  id: string,
  name: string,
  lon: number,
  lat: number,
  population: number,
  continent: ContinentId,
): CitySeed {
  return { id, name, population, continent, ...project(lon, lat) };
}

const center = (id: ContinentId, name: string, lon: number, lat: number): ContinentSeed => {
  const { x, y } = project(lon, lat);
  return { id, name, centerX: x, centerY: y };
};

export const CONTINENTS: ContinentSeed[] = [
  center('north-america', 'North America', -100, 42),
  center('south-america', 'South America', -60, -18),
  center('europe', 'Europe', 15, 52),
  center('africa', 'Africa', 20, 4),
  center('asia', 'Asia', 92, 32),
  center('oceania', 'Oceania', 138, -26),
];

/** Major world cities projected onto the same hand-drawn canvas style as the original map. */
export const CITY_SEEDS: CitySeed[] = [
  city('new-york', 'New York', -74.006, 40.7128, 18_800_000, 'north-america'),
  city('los-angeles', 'Los Angeles', -118.2437, 34.0522, 12_500_000, 'north-america'),
  city('chicago', 'Chicago', -87.6298, 41.8781, 8_900_000, 'north-america'),
  city('mexico-city', 'Mexico City', -99.1332, 19.4326, 21_900_000, 'north-america'),
  city('toronto', 'Toronto', -79.3832, 43.6532, 6_400_000, 'north-america'),
  city('vancouver', 'Vancouver', -123.1207, 49.2827, 2_700_000, 'north-america'),
  city('miami', 'Miami', -80.1918, 25.7617, 6_100_000, 'north-america'),
  city('phoenix', 'Phoenix', -112.074, 33.4484, 4_900_000, 'north-america'),

  city('sao-paulo', 'São Paulo', -46.6333, -23.5505, 22_400_000, 'south-america'),
  city('buenos-aires', 'Buenos Aires', -58.3816, -34.6037, 15_600_000, 'south-america'),
  city('rio-de-janeiro', 'Rio de Janeiro', -43.1729, -22.9068, 13_700_000, 'south-america'),
  city('lima', 'Lima', -77.0428, -12.0464, 11_200_000, 'south-america'),
  city('bogota', 'Bogotá', -74.0721, 4.711, 11_500_000, 'south-america'),
  city('santiago', 'Santiago', -70.6693, -33.4489, 7_100_000, 'south-america'),

  city('london', 'London', -0.1276, 51.5072, 14_800_000, 'europe'),
  city('paris', 'Paris', 2.3522, 48.8566, 11_300_000, 'europe'),
  city('moscow', 'Moscow', 37.6173, 55.7558, 12_600_000, 'europe'),
  city('istanbul', 'Istanbul', 28.9784, 41.0082, 15_900_000, 'europe'),
  city('madrid', 'Madrid', -3.7038, 40.4168, 6_700_000, 'europe'),
  city('berlin', 'Berlin', 13.405, 52.52, 4_800_000, 'europe'),
  city('rome', 'Rome', 12.4964, 41.9028, 4_300_000, 'europe'),

  city('cairo', 'Cairo', 31.2357, 30.0444, 22_200_000, 'africa'),
  city('lagos', 'Lagos', 3.3792, 6.5244, 16_600_000, 'africa'),
  city('johannesburg', 'Johannesburg', 28.0473, -26.2041, 6_100_000, 'africa'),
  city('kinshasa', 'Kinshasa', 15.2663, -4.4419, 17_000_000, 'africa'),
  city('nairobi', 'Nairobi', 36.8219, -1.2921, 5_300_000, 'africa'),
  city('casablanca', 'Casablanca', -7.5898, 33.5731, 4_300_000, 'africa'),

  city('dubai', 'Dubai', 55.2708, 25.2048, 3_600_000, 'asia'),
  city('mumbai', 'Mumbai', 72.8777, 19.076, 21_700_000, 'asia'),
  city('delhi', 'Delhi', 77.1025, 28.7041, 32_900_000, 'asia'),
  city('bangkok', 'Bangkok', 100.5018, 13.7563, 10_700_000, 'asia'),
  city('singapore', 'Singapore', 103.8198, 1.3521, 5_900_000, 'asia'),
  city('shanghai', 'Shanghai', 121.4737, 31.2304, 29_200_000, 'asia'),
  city('beijing', 'Beijing', 116.4074, 39.9042, 21_500_000, 'asia'),
  city('tokyo', 'Tokyo', 139.6917, 35.6895, 37_200_000, 'asia'),
  city('seoul', 'Seoul', 126.978, 37.5665, 9_700_000, 'asia'),
  city('jakarta', 'Jakarta', 106.8456, -6.2088, 11_200_000, 'asia'),
  city('manila', 'Manila', 120.9842, 14.5995, 14_700_000, 'asia'),

  city('sydney', 'Sydney', 151.2093, -33.8688, 5_300_000, 'oceania'),
  city('melbourne', 'Melbourne', 144.9631, -37.8136, 5_100_000, 'oceania'),
  city('brisbane', 'Brisbane', 153.026, -27.4705, 2_700_000, 'oceania'),
  city('perth', 'Perth', 115.8605, -31.9505, 2_200_000, 'oceania'),
  city('auckland', 'Auckland', 174.7633, -36.8485, 1_700_000, 'oceania'),
];

export function tierFor(population: number): CityTier {
  if (population >= 15_000_000) return 'large';
  if (population >= 7_000_000) return 'medium';
  return 'small';
}

export const TIER_CAPACITY: Record<CityTier, number> = {
  small: 900,
  medium: 1_700,
  large: 3_000,
};

export type Poly = [number, number][];
const p = (lon: number, lat: number): [number, number] => {
  const projected = project(lon, lat);
  return [projected.x, projected.y];
};

export const LAND: Poly[] = [
  [p(-168, 72), p(-128, 70), p(-104, 58), p(-74, 50), p(-58, 28), p(-82, 8), p(-104, 18), p(-126, 32), p(-148, 54)],
  [p(-82, 13), p(-50, 7), p(-36, -18), p(-46, -55), p(-70, -52), p(-80, -20)],
  [p(-12, 36), p(8, 58), p(42, 58), p(72, 48), p(100, 52), p(142, 44), p(162, 22), p(132, 4), p(78, 8), p(46, 22), p(18, 28)],
  [p(-18, 32), p(34, 32), p(48, 5), p(30, -35), p(18, -35), p(2, 2)],
  [p(112, -10), p(154, -12), p(150, -44), p(116, -40)],
  [p(-8, 60), p(2, 58), p(0, 50), p(-10, 52)],
  [p(44, -12), p(52, -14), p(50, -25), p(42, -22)],
];

export const WATER: Poly[] = [
  [p(-84, 30), p(-75, 24), p(-79, 18), p(-90, 22)],
  [p(28, 46), p(42, 44), p(45, 37), p(31, 38)],
  [p(120, 32), p(132, 28), p(128, 20), p(116, 22)],
];

export const HIGHLANDS: Poly[] = [
  [p(-124, 52), p(-105, 45), p(-100, 30), p(-112, 24), p(-128, 38)],
  [p(-78, 8), p(-66, -8), p(-68, -32), p(-76, -44), p(-82, -18)],
  [p(68, 36), p(94, 34), p(102, 26), p(82, 22), p(62, 28)],
  [p(8, 6), p(28, 8), p(36, -6), p(20, -16), p(4, -8)],
];
