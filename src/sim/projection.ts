/**
 * Single source of truth for world-space size and the lon/lat -> world projection.
 * Lives in its own module so mapData (cities) and geography (coastlines) can both
 * use it without importing each other.
 */

export const WORLD = { width: 2400, height: 1200 };

/** [lon, lat] in degrees. */
export type LonLat = [number, number];
/** [x, y] in world units. */
export type Poly = [number, number][];

/** Plate carrée: linear in lon/lat, so city coords and coastlines always agree. */
export function project(lon: number, lat: number): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * WORLD.width,
    y: ((90 - lat) / 180) * WORLD.height,
  };
}

export function projectPoint(lon: number, lat: number): [number, number] {
  const p = project(lon, lat);
  return [p.x, p.y];
}

export function projectPath(path: LonLat[]): Poly {
  return path.map(([lon, lat]) => projectPoint(lon, lat));
}

/** World units per degree of longitude — used to size map features written in degrees. */
export const UNITS_PER_DEGREE = WORLD.width / 360;