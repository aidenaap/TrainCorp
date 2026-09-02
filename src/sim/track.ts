/**
 * Track geometry.
 *
 * A railway is still a graph edge between two cities — routing, demand, fares and
 * train logic are unchanged. What changes is that the edge now carries a *shape*:
 * an ordered list of sections (straight or circular arc) laid down one at a time by
 * the player, plus a tessellated polyline with cumulative arc length so anything that
 * used to lerp between two city points can ask for a position at progress `t` instead.
 *
 * Curves are circular arcs rather than Béziers on purpose:
 *   - radius is a single number, so "is this turn too tight for a train" is one compare
 *   - the arc is tangent-continuous with the previous section by construction, so
 *     joints never kink
 *   - auto-adjusting the radius is just moving the endpoint along the same bearing
 *
 * Nothing here imports engine/render/React. It is pure math and unit-testable.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface StraightSection {
  kind: 'straight';
  start: Vec2;
  end: Vec2;
}

export interface CurveSection {
  kind: 'curve';
  start: Vec2;
  end: Vec2;
  center: Vec2;
  radius: number;
  /** angle of `start` around `center` */
  startAngle: number;
  /** signed sweep in radians; positive = counter-clockwise in world axes */
  sweep: number;
}

export type TrackSection = StraightSection | CurveSection;

/** Tessellated geometry cached on a railway for sim + rendering lookups. */
export interface TrackPath {
  points: Vec2[];
  /** cumulative[i] = arc length from points[0] to points[i] */
  cumulative: number[];
  length: number;
}

export const TRACK = {
  /**
   * Smallest interior angle a joint may form. 90° means the direction may change by
   * at most 90° across any joint or arc — no hairpins, no U-turns.
   */
  minInteriorAngle: Math.PI / 2,
  /** Below this radius a train could not physically hold the curve. World units. */
  minCurveRadius: 34,
  /** Target polyline segment length when flattening an arc. World units. */
  flattenStep: 7,
  /** Angle snap applied to straight sections while a modifier key is held. */
  snapAngle: Math.PI / 12,
} as const;

/** Max direction change allowed at a joint / across a curve. */
export const MAX_DEFLECTION = Math.PI - TRACK.minInteriorAngle;

// ------------------------------------------------------------------ vec helpers

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;
export const cross = (a: Vec2, b: Vec2) => a.x * b.y - a.y * b.x;
export const len = (a: Vec2) => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.y - a.y);
export const perp = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });

export function norm(a: Vec2): Vec2 {
  const l = Math.hypot(a.x, a.y);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

export function fromAngle(a: number, r = 1): Vec2 {
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

/** Signed angle you must rotate `a` by to reach `b`, in (-PI, PI]. */
export function signedAngle(a: Vec2, b: Vec2): number {
  return Math.atan2(cross(a, b), dot(a, b));
}

// ------------------------------------------------------------------ sections

export function straightSection(start: Vec2, end: Vec2): StraightSection {
  return { kind: 'straight', start: { ...start }, end: { ...end } };
}

/** Unit direction leaving the end of a section (the tangent the next one must match). */
export function endTangent(section: TrackSection): Vec2 {
  if (section.kind === 'straight') return norm(sub(section.end, section.start));
  const radial = norm(sub(section.end, section.center));
  const t = perp(radial);
  return section.sweep >= 0 ? t : scale(t, -1);
}

/** Unit direction entering the start of a section. */
export function startTangent(section: TrackSection): Vec2 {
  if (section.kind === 'straight') return norm(sub(section.end, section.start));
  const radial = norm(sub(section.start, section.center));
  const t = perp(radial);
  return section.sweep >= 0 ? t : scale(t, -1);
}

export function sectionLength(section: TrackSection): number {
  return section.kind === 'straight'
    ? dist(section.start, section.end)
    : Math.abs(section.sweep) * section.radius;
}

export type SolveFailure = 'degenerate' | 'sharp' | 'tight';

export interface SolvedSection {
  section: TrackSection;
  /** direction change across this section, radians, always >= 0 */
  deflection: number;
  /** Infinity for straights */
  radius: number;
  /** endpoint was pushed outward to satisfy the minimum radius */
  adjusted: boolean;
}

export type SolveResult =
  | ({ ok: true } & SolvedSection)
  | { ok: false; reason: SolveFailure; deflection: number; radius: number };

/**
 * Straight section from `start` toward `target`.
 * `tangent` is the direction the previous section arrives with, or null for the first
 * section (which may point anywhere).
 */
export function solveStraight(
  start: Vec2,
  tangent: Vec2 | null,
  target: Vec2,
  snap = false,
): SolveResult {
  let d = sub(target, start);
  if (len(d) < 1e-6) {
    return { ok: false, reason: 'degenerate', deflection: 0, radius: Infinity };
  }
  if (snap) {
    const base = tangent ? Math.atan2(tangent.y, tangent.x) : 0;
    const raw = Math.atan2(d.y, d.x) - base;
    const stepped = Math.round(raw / TRACK.snapAngle) * TRACK.snapAngle + base;
    d = fromAngle(stepped, len(d));
  }
  const deflection = tangent ? Math.abs(signedAngle(tangent, d)) : 0;
  if (deflection > MAX_DEFLECTION + 1e-6) {
    return { ok: false, reason: 'sharp', deflection, radius: Infinity };
  }
  return {
    ok: true,
    section: straightSection(start, add(start, d)),
    deflection,
    radius: Infinity,
    adjusted: false,
  };
}

/**
 * The unique circular arc that leaves `start` along `tangent` and passes through
 * `target`. Half the deflection is the angle between the tangent and the chord, so
 * the whole turn is `2 * theta` and the radius falls out of the chord length.
 *
 * `allowAdjust` lets the endpoint slide outward along the same bearing until the
 * radius is legal — that is the "auto-adjust the radius" behaviour. It is disabled
 * when the endpoint is pinned to a station, where moving it would be wrong.
 */
export function solveCurve(
  start: Vec2,
  tangent: Vec2 | null,
  target: Vec2,
  allowAdjust = true,
): SolveResult {
  if (!tangent) return solveStraight(start, null, target);

  const chord = sub(target, start);
  const chordLen = len(chord);
  if (chordLen < 1e-6) {
    return { ok: false, reason: 'degenerate', deflection: 0, radius: 0 };
  }

  const dir = norm(chord);
  const theta = signedAngle(tangent, dir);
  const deflection = Math.abs(theta) * 2;

  if (deflection > MAX_DEFLECTION + 1e-6) {
    return { ok: false, reason: 'sharp', deflection, radius: 0 };
  }

  // Near-collinear: a straight is the honest answer, and avoids a 1e9 radius arc.
  if (Math.abs(theta) < 1e-4) {
    return {
      ok: true,
      section: straightSection(start, target),
      deflection: 0,
      radius: Infinity,
      adjusted: false,
    };
  }

  let end = target;
  let radius = chordLen / (2 * Math.sin(Math.abs(theta)));
  let adjusted = false;

  if (radius < TRACK.minCurveRadius) {
    if (!allowAdjust) {
      return { ok: false, reason: 'tight', deflection, radius };
    }
    const needed = 2 * TRACK.minCurveRadius * Math.sin(Math.abs(theta));
    end = add(start, scale(dir, needed));
    radius = TRACK.minCurveRadius;
    adjusted = true;
  }

  const side = Math.sign(theta) || 1;
  const center = add(start, scale(perp(tangent), radius * side));
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);

  return {
    ok: true,
    section: {
      kind: 'curve',
      start: { ...start },
      end: { ...end },
      center,
      radius,
      startAngle,
      sweep: 2 * theta,
    },
    deflection,
    radius,
    adjusted,
  };
}

/** Rebuild a solved section so it terminates exactly on `end` (station snapping). */
export function retargetToPoint(section: TrackSection, end: Vec2): TrackSection {
  if (section.kind === 'straight') return straightSection(section.start, end);
  return { ...section, end: { ...end } };
}

// ------------------------------------------------------------------ flattening

export function flattenSection(section: TrackSection, step = TRACK.flattenStep): Vec2[] {
  if (section.kind === 'straight') return [{ ...section.start }, { ...section.end }];

  const arcLen = Math.abs(section.sweep) * section.radius;
  const steps = Math.max(2, Math.min(96, Math.ceil(arcLen / step)));
  const out: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = section.startAngle + (section.sweep * i) / steps;
    out.push(add(section.center, fromAngle(a, section.radius)));
  }
  // Land exactly on the stored endpoint so joints are pixel-tight.
  out[out.length - 1] = { ...section.end };
  return out;
}

export function buildTrackPath(sections: TrackSection[], step = TRACK.flattenStep): TrackPath {
  const points: Vec2[] = [];
  for (const section of sections) {
    const pts = flattenSection(section, step);
    for (const p of pts) {
      const last = points[points.length - 1];
      if (last && Math.abs(last.x - p.x) < 1e-6 && Math.abs(last.y - p.y) < 1e-6) continue;
      points.push(p);
    }
  }
  if (points.length === 0) return { points: [], cumulative: [], length: 0 };
  if (points.length === 1) return { points, cumulative: [0], length: 0 };

  const cumulative = new Array<number>(points.length);
  cumulative[0] = 0;
  for (let i = 1; i < points.length; i++) {
    cumulative[i] = cumulative[i - 1] + dist(points[i - 1], points[i]);
  }
  return { points, cumulative, length: cumulative[cumulative.length - 1] };
}

/** Straight A→B path — used for legacy/auto-built lines so old call sites keep working. */
export function straightPath(a: Vec2, b: Vec2): { sections: TrackSection[]; path: TrackPath } {
  const sections = [straightSection(a, b)];
  return { sections, path: buildTrackPath(sections) };
}

// ------------------------------------------------------------------ path sampling

function indexAtDistance(path: TrackPath, d: number): number {
  const c = path.cumulative;
  let lo = 0;
  let hi = c.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (c[mid] < d) lo = mid + 1;
    else hi = mid;
  }
  return Math.max(1, lo);
}

/** Position at progress `t` in [0,1] measured from the path's first point. */
export function pathPointAt(path: TrackPath, t: number): Vec2 {
  if (path.points.length === 0) return { x: 0, y: 0 };
  if (path.points.length === 1 || path.length === 0) return { ...path.points[0] };

  const d = Math.min(path.length, Math.max(0, t * path.length));
  const i = indexAtDistance(path, d);
  const segStart = path.cumulative[i - 1];
  const segLen = path.cumulative[i] - segStart || 1;
  const f = (d - segStart) / segLen;
  const a = path.points[i - 1];
  const b = path.points[i];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

/** Unit heading at progress `t`, for orienting the train sprite. */
export function pathTangentAt(path: TrackPath, t: number): Vec2 {
  if (path.points.length < 2) return { x: 1, y: 0 };
  const d = Math.min(path.length, Math.max(0, t * path.length));
  const i = indexAtDistance(path, d);
  return norm(sub(path.points[i], path.points[i - 1]));
}

/** Shortest distance from `p` to the polyline — used for click/hover hit testing. */
export function distanceToPath(path: TrackPath, p: Vec2): number {
  let best = Infinity;
  for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1];
    const b = path.points[i];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const l2 = abx * abx + aby * aby;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2));
    const d = Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
    if (d < best) best = d;
  }
  return best;
}

export function pathBounds(path: TrackPath) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of path.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export const toDegrees = (r: number) => (r * 180) / Math.PI;
