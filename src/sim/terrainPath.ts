/**
 * Terrain sampling for multi-segment track.
 *
 * `sampleTerrain` walks a straight line, which was all a railway used to be. A
 * section-built line is a polyline, so this samples each segment and blends the
 * results by length — a dog-leg around a mountain is genuinely cheaper than the
 * straight shot through it, which is the whole point of letting players route.
 *
 * Kept in its own module so `terrain.ts` (rasteriser + masks) needs no edits.
 */

import { EMPTY_TERRAIN, sampleTerrain, type Crossing, type TerrainProfile } from './terrain';
import type { Vec2 } from './track';

/** Two icons closer than this on screen would just overlap into mush. */
const MERGE_DISTANCE = 22;

export function sampleTerrainPath(points: Vec2[]): TerrainProfile {
  if (points.length < 2) return EMPTY_TERRAIN;

  let total = 0;
  let waterLength = 0;
  let mountainLength = 0;
  const runs: (Crossing & { length: number })[] = [];

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segment = Math.hypot(b.x - a.x, b.y - a.y);
    if (segment < 1e-6) continue;

    const profile = sampleTerrain(a.x, a.y, b.x, b.y);
    total += segment;
    waterLength += profile.water * segment;
    mountainLength += profile.mountain * segment;

    // `share` is per-segment; convert to absolute length so runs from different
    // segments are comparable, then re-normalise against the whole path below.
    for (const c of profile.crossings) {
      const length = c.share * segment;
      const near = runs.find(
        (r) => r.kind === c.kind && Math.hypot(r.x - c.x, r.y - c.y) < MERGE_DISTANCE,
      );
      if (near) {
        // Weighted midpoint, so a strait crossed by three short sections gets one icon.
        const w = near.length + length;
        near.x = (near.x * near.length + c.x * length) / w;
        near.y = (near.y * near.length + c.y * length) / w;
        near.length = w;
      } else {
        runs.push({ ...c, length });
      }
    }
  }

  if (total <= 0) return EMPTY_TERRAIN;

  const crossings: Crossing[] = runs
    .map((r) => ({ kind: r.kind, x: r.x, y: r.y, share: r.length / total }))
    .filter((c) => c.share >= 0.05)
    .sort((a, b) => b.share - a.share)
    .slice(0, 4);

  return { water: waterLength / total, mountain: mountainLength / total, crossings };
}
