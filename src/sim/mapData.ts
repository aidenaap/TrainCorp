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
const projectPoint = (lon: number, lat: number): [number, number] => {
  const projected = project(lon, lat);
  return [projected.x, projected.y];
};

export const WORLD_LAND: Poly[] = [
  [projectPoint(-168, 72), projectPoint(-128, 70), projectPoint(-104, 58), projectPoint(-74, 50), projectPoint(-58, 28), projectPoint(-82, 8), projectPoint(-104, 18), projectPoint(-126, 32), projectPoint(-148, 54)],
  [projectPoint(-82, 13), projectPoint(-50, 7), projectPoint(-36, -18), projectPoint(-46, -55), projectPoint(-70, -52), projectPoint(-80, -20)],
  [projectPoint(-12, 36), projectPoint(8, 58), projectPoint(42, 58), projectPoint(72, 48), projectPoint(100, 52), projectPoint(142, 44), projectPoint(162, 22), projectPoint(132, 4), projectPoint(78, 8), projectPoint(46, 22), projectPoint(18, 28)],
  [projectPoint(-18, 32), projectPoint(34, 32), projectPoint(48, 5), projectPoint(30, -35), projectPoint(18, -35), projectPoint(2, 2)],
  [projectPoint(112, -10), projectPoint(154, -12), projectPoint(150, -44), projectPoint(116, -40)],
  [projectPoint(-8, 60), projectPoint(2, 58), projectPoint(0, 50), projectPoint(-10, 52)],
  [projectPoint(44, -12), projectPoint(52, -14), projectPoint(50, -25), projectPoint(42, -22)],
];

export const WATER: Poly[] = [
  [projectPoint(-84, 30), projectPoint(-75, 24), projectPoint(-79, 18), projectPoint(-90, 22)],
  [projectPoint(28, 46), projectPoint(42, 44), projectPoint(45, 37), projectPoint(31, 38)],
  [projectPoint(120, 32), projectPoint(132, 28), projectPoint(128, 20), projectPoint(116, 22)],
];

export const HIGHLANDS: Poly[] = [
  [projectPoint(-124, 52), projectPoint(-105, 45), projectPoint(-100, 30), projectPoint(-112, 24), projectPoint(-128, 38)],
  [projectPoint(-78, 8), projectPoint(-66, -8), projectPoint(-68, -32), projectPoint(-76, -44), projectPoint(-82, -18)],
  [projectPoint(68, 36), projectPoint(94, 34), projectPoint(102, 26), projectPoint(82, 22), projectPoint(62, 28)],
  [projectPoint(8, 6), projectPoint(28, 8), projectPoint(36, -6), projectPoint(20, -16), projectPoint(4, -8)],
];
