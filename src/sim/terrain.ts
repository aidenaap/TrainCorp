/**
 * Terrain lookup for construction costs.
 *
 * Testing a track segment against 32 coastline polygons point-by-point would be far
 * too slow to run on every pointer move, so the map is rasterised once at module load
 * into two flat masks. After that a lookup is an array index, and sampling a whole
 * line is O(samples) regardless of how detailed the coastlines get.
 *
 * The rasteriser uses scanline fill rather than per-cell point-in-polygon: cost is
 * O(rows x edges) per shape instead of O(cells x edges), which keeps startup in the
 * low milliseconds.
 */

import { INLAND_WATER, LANDMASSES, MOUNTAIN_RANGES } from './geography';
import { WORLD, type Poly } from './projection';

/** World units per grid cell. 5 units is roughly 0.75 degrees — finer than any city spacing. */
const CELL = 5;
const COLS = Math.ceil(WORLD.width / CELL);
const ROWS = Math.ceil(WORLD.height / CELL);

/** 1 where the cell is dry land. */
const landMask = new Uint8Array(COLS * ROWS);
/** 0-255 elevation weight; non-zero only inside a mountain range. */
const reliefMask = new Uint8Array(COLS * ROWS);

function scanlineFill(poly: Poly, write: (index: number) => void) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of poly) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const rowStart = Math.max(0, Math.floor(minY / CELL));
  const rowEnd = Math.min(ROWS - 1, Math.ceil(maxY / CELL));

  const xs: number[] = [];
  for (let row = rowStart; row <= rowEnd; row++) {
    const y = row * CELL + CELL / 2;
    xs.length = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y === yj > y) continue;
      xs.push(xi + ((y - yi) / (yj - yi)) * (xj - xi));
    }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil((xs[k] - CELL / 2) / CELL));
      const to = Math.min(COLS - 1, Math.floor((xs[k + 1] - CELL / 2) / CELL));
      for (let col = from; col <= to; col++) write(row * COLS + col);
    }
  }
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return Math.hypot(px - cx, py - cy);
}

function buildMasks() {
  for (const mass of LANDMASSES) scanlineFill(mass.outline, (i) => (landMask[i] = 1));
  // Inland seas are water for costing purposes even though they sit inside a coastline.
  for (const water of INLAND_WATER) scanlineFill(water, (i) => (landMask[i] = 0));

  for (const range of MOUNTAIN_RANGES) {
    const weight = Math.round(range.elevation * 255);
    const b = range.bounds;
    const rowStart = Math.max(0, Math.floor(b.minY / CELL));
    const rowEnd = Math.min(ROWS - 1, Math.ceil(b.maxY / CELL));
    const colStart = Math.max(0, Math.floor(b.minX / CELL));
    const colEnd = Math.min(COLS - 1, Math.ceil(b.maxX / CELL));

    // Per-segment bounds so a cell only pays for the segments that could possibly reach it.
    const segs = [];
    for (let i = 0; i < range.path.length - 1; i++) {
      const [x1, y1] = range.path[i];
      const [x2, y2] = range.path[i + 1];
      segs.push({
        x1, y1, x2, y2,
        minX: Math.min(x1, x2) - range.spread,
        maxX: Math.max(x1, x2) + range.spread,
        minY: Math.min(y1, y2) - range.spread,
        maxY: Math.max(y1, y2) + range.spread,
      });
    }

    for (let row = rowStart; row <= rowEnd; row++) {
      const y = row * CELL + CELL / 2;
      for (let col = colStart; col <= colEnd; col++) {
        const x = col * CELL + CELL / 2;
        let near = false;
        for (let i = 0; i < segs.length && !near; i++) {
          const s = segs[i];
          if (x < s.minX || x > s.maxX || y < s.minY || y > s.maxY) continue;
          if (distanceToSegment(x, y, s.x1, s.y1, s.x2, s.y2) <= range.spread) near = true;
        }
        if (!near) continue;
        const idx = row * COLS + col;
        if (weight > reliefMask[idx]) reliefMask[idx] = weight;
      }
    }
  }
}

buildMasks();

function cellIndex(x: number, y: number): number {
  const col = Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL)));
  const row = Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL)));
  return row * COLS + col;
}

export function isWaterAt(x: number, y: number): boolean {
  return landMask[cellIndex(x, y)] === 0;
}

/** 0 on flat ground, up to 1 on the highest ranges. */
export function reliefAt(x: number, y: number): number {
  return reliefMask[cellIndex(x, y)] / 255;
}

export type CrossingKind = 'bridge' | 'tunnel';

/** A contiguous run of water or mountain along a line, used to place one icon. */
export interface Crossing {
  kind: CrossingKind;
  /** Midpoint of the run, in world units. */
  x: number;
  y: number;
  /** Share of the whole line this run covers, 0..1. */
  share: number;
}

export interface TerrainProfile {
  /** Share of the line over water, 0..1. */
  water: number;
  /** Share of the line through mountains, weighted by how high they are, 0..1. */
  mountain: number;
  crossings: Crossing[];
}

export const EMPTY_TERRAIN: TerrainProfile = { water: 0, mountain: 0, crossings: [] };

/**
 * Walks the straight line between two points and reports what it crosses.
 * Sample count scales with length so a short urban link isn't oversampled and a
 * transoceanic one isn't undersampled.
 */
export function sampleTerrain(ax: number, ay: number, bx: number, by: number): TerrainProfile {
  const dist = Math.hypot(bx - ax, by - ay);
  if (dist < 1e-6) return EMPTY_TERRAIN;

  const samples = Math.max(8, Math.min(96, Math.round(dist / 6)));
  let water = 0;
  let mountain = 0;

  const kinds: (CrossingKind | null)[] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i + 0.5) / samples;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;

    if (isWaterAt(x, y)) {
      water++;
      kinds.push('bridge');
      continue;
    }
    const relief = reliefAt(x, y);
    mountain += relief;
    // Only the taller ground is worth a tunnel icon; low hills still add cost.
    kinds.push(relief >= 0.4 ? 'tunnel' : null);
  }

  // Group neighbouring samples of the same kind into single runs.
  const crossings: Crossing[] = [];
  let runStart = 0;
  for (let i = 1; i <= samples; i++) {
    if (i < samples && kinds[i] === kinds[runStart]) continue;
    const kind = kinds[runStart];
    if (kind) {
      const midT = (runStart + i) / 2 / samples;
      crossings.push({
        kind,
        x: ax + (bx - ax) * midT,
        y: ay + (by - ay) * midT,
        share: (i - runStart) / samples,
      });
    }
    runStart = i;
  }

  // Ignore slivers, then keep the longest few so a line never turns into an icon parade.
  const significant = crossings
    .filter((c) => c.share >= 0.06)
    .sort((a, b) => b.share - a.share)
    .slice(0, 4);

  return { water: water / samples, mountain: mountain / samples, crossings: significant };
}
