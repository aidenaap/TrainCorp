import type { CityTier, ContinentId } from './types';
import { project, WORLD, type Poly } from './projection';

export { WORLD };
export type { Poly };

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

/** Major world cities, projected onto the same world grid as the coastlines in geography.ts. */
export const CITY_SEEDS: CitySeed[] = [
  city('new-york', 'New York', -74.006, 40.7128, 18_800_000, 'north-america'),
  city('los-angeles', 'Los Angeles', -118.2437, 34.0522, 12_500_000, 'north-america'),
  city('chicago', 'Chicago', -87.6298, 41.8781, 8_900_000, 'north-america'),
  city('mexico-city', 'Mexico City', -99.1332, 19.4326, 21_900_000, 'north-america'),
  city('toronto', 'Toronto', -79.3832, 43.6532, 6_400_000, 'north-america'),
  city('miami', 'Miami', -80.1918, 25.7617, 6_100_000, 'north-america'),
  city('phoenix', 'Phoenix', -112.074, 33.4484, 4_900_000, 'north-america'),
  city('denver', 'Denver', -104.9903, 39.7392, 3_000_000, 'north-america'),
  city('dallas', 'Dallas', -96.797, 32.7767, 8_100_000, 'north-america'),
  city('atlanta', 'Atlanta', -84.388, 33.749, 6_300_000, 'north-america'),
  city('minneapolis', 'Minneapolis', -93.265, 44.9778, 3_700_000, 'north-america'),
  city('st-louis', 'St. Louis', -90.1994, 38.627, 2_800_000, 'north-america'),
  city('monterrey', 'Monterrey', -100.3161, 25.6866, 5_300_000, 'north-america'),
  city('vancouver', 'Vancouver', -123.1207, 49.2827, 2_700_000, 'north-america'),
  city('winnipeg', 'Winnipeg', -97.1384, 49.8951, 850_000, 'north-america'),

  city('sao-paulo', 'São Paulo', -46.6333, -23.5505, 22_400_000, 'south-america'),
  city('buenos-aires', 'Buenos Aires', -58.3816, -34.6037, 15_600_000, 'south-america'),
  city('rio-de-janeiro', 'Rio de Janeiro', -43.1729, -22.9068, 13_700_000, 'south-america'),
  city('lima', 'Lima', -77.0428, -12.0464, 11_200_000, 'south-america'),
  city('bogota', 'Bogotá', -74.0721, 4.711, 11_500_000, 'south-america'),
  city('santiago', 'Santiago', -70.6693, -33.4489, 7_100_000, 'south-america'),
  city('brasilia', 'Brasília', -47.9292, -15.7939, 4_800_000, 'south-america'),
  city('belo-horizonte', 'Belo Horizonte', -43.9378, -19.9167, 6_200_000, 'south-america'),
  city('manaus', 'Manaus', -60.0217, -3.1189, 2_200_000, 'south-america'),
  city('asuncion', 'Asunción', -57.5759, -25.2637, 3_300_000, 'south-america'),
  city('medellin', 'Medellín', -75.5636, 6.2442, 4_100_000, 'south-america'),

  city('london', 'London', -0.1276, 51.5072, 14_800_000, 'europe'),
  city('paris', 'Paris', 2.3522, 48.8566, 11_300_000, 'europe'),
  city('moscow', 'Moscow', 37.6173, 55.7558, 12_600_000, 'europe'),
  city('istanbul', 'Istanbul', 28.9784, 41.0082, 15_900_000, 'europe'),
  city('madrid', 'Madrid', -3.7038, 40.4168, 6_700_000, 'europe'),
  city('berlin', 'Berlin', 13.405, 52.52, 4_800_000, 'europe'),
  city('rome', 'Rome', 12.4964, 41.9028, 4_300_000, 'europe'),
  city('milan', 'Milan', 9.19, 45.4642, 5_300_000, 'europe'),
  city('munich', 'Munich', 11.582, 48.1351, 2_600_000, 'europe'),
  city('vienna', 'Vienna', 16.3738, 48.2082, 2_000_000, 'europe'),
  city('warsaw', 'Warsaw', 21.0122, 52.2297, 3_100_000, 'europe'),
  city('bucharest', 'Bucharest', 26.1025, 44.4268, 2_200_000, 'europe'),
  city('kyiv', 'Kyiv', 30.5234, 50.4501, 3_500_000, 'europe'),
  city('stockholm', 'Stockholm', 18.0686, 59.3293, 2_400_000, 'europe'),
  city('oslo', 'Oslo', 10.7522, 59.9139, 1_600_000, 'europe'),
  city('tel-aviv', 'Tel Aviv', 34.7818, 32.0853, 4_200_000, 'europe'),

  city('cairo', 'Cairo', 31.2357, 30.0444, 22_200_000, 'africa'),
  city('lagos', 'Lagos', 3.3792, 6.5244, 16_600_000, 'africa'),
  city('johannesburg', 'Johannesburg', 28.0473, -26.2041, 6_100_000, 'africa'),
  city('kinshasa', 'Kinshasa', 15.2663, -4.4419, 17_000_000, 'africa'),
  city('nairobi', 'Nairobi', 36.8219, -1.2921, 5_300_000, 'africa'),
  city('casablanca', 'Casablanca', -7.5898, 33.5731, 4_300_000, 'africa'),
  city('addis-ababa', 'Addis Ababa', 38.7578, 9.0192, 5_200_000, 'africa'),
  city('khartoum', 'Khartoum', 32.5333, 15.5, 6_000_000, 'africa'),
  city('kano', 'Kano', 8.5167, 12.0, 4_100_000, 'africa'),
  city('kampala', 'Kampala', 32.5825, 0.3136, 3_600_000, 'africa'),
  city('lusaka', 'Lusaka', 28.2833, -15.4167, 3_300_000, 'africa'),
  city('harare', 'Harare', 31.0534, -17.8252, 2_400_000, 'africa'),
  city('bamako', 'Bamako', -8.0029, 12.6392, 2_800_000, 'africa'),
  city('ouagadougou', 'Ouagadougou', -1.5353, 12.3714, 2_800_000, 'africa'),

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
  city('yakutsk', 'Yakutsk', 129.7422, 62.0355, 360_000, 'asia'),
  city('magadan', 'Magadan', 150.8085, 59.5638, 140_000, 'asia'),

  city('sydney', 'Sydney', 151.2093, -33.8688, 5_300_000, 'oceania'),
  city('melbourne', 'Melbourne', 144.9631, -37.8136, 5_100_000, 'oceania'),
  city('brisbane', 'Brisbane', 153.026, -27.4705, 2_700_000, 'oceania'),
  city('perth', 'Perth', 115.8605, -31.9505, 2_200_000, 'oceania'),
  city('auckland', 'Auckland', 174.7633, -36.8485, 1_700_000, 'oceania'),
  city('port-moresby', 'Port Moresby', 147.1803, -9.4438, 1_100_000, 'oceania'),
  city('suva', 'Suva', 178.4419, -18.1416, 330_000, 'oceania'),
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

/**
 * Map geometry now lives in geography.ts. Re-exported here so existing imports
 * (`from './mapData'`) keep working — new code should import from './geography'.
 */
export { LANDMASSES, INLAND_WATER, MOUNTAIN_RANGES, WORLD_LAND } from './geography';
