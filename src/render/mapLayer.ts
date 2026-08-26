/**
 * Static map background: ocean, continental shelf, land, inland seas, relief and
 * graticule.
 *
 * None of this depends on simulation state, so it is painted into an offscreen
 * canvas and re-used until the camera or the viewport actually changes. Panning
 * costs the same as before; sitting still (the common case while the player reads
 * a panel) costs a single blit instead of ~2,000 point transforms per frame.
 */

import {
  INLAND_WATER,
  LANDMASSES,
  MOUNTAIN_RANGES,
  type Bounds,
  type MountainRange,
} from '../sim/geography';
import { WORLD, type Poly } from '../sim/projection';
import { worldToScreen, type Camera } from './camera';
import { COLORS } from './theme';

/** The subset of ViewState this layer needs — keeps renderer.ts and this file uncoupled. */
export interface MapView {
  camera: Camera;
  width: number;
  height: number;
}

// ------------------------------------------------------------------ utilities

function visible(view: MapView, b: Bounds): boolean {
  const tl = worldToScreen(view.camera, view.width, view.height, b.minX, b.minY);
  const br = worldToScreen(view.camera, view.width, view.height, b.maxX, b.maxY);
  return br.x >= -32 && tl.x <= view.width + 32 && br.y >= -32 && tl.y <= view.height + 32;
}

function tracePoly(ctx: CanvasRenderingContext2D, view: MapView, poly: Poly) {
  ctx.beginPath();
  for (let i = 0; i < poly.length; i++) {
    const p = worldToScreen(view.camera, view.width, view.height, poly[i][0], poly[i][1]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

/** Open path through the points, rounded via midpoint quadratics — ridges look geological, not folded paper. */
function traceRidge(ctx: CanvasRenderingContext2D, view: MapView, path: Poly) {
  const pts = path.map(([x, y]) => worldToScreen(view.camera, view.width, view.height, x, y));
  ctx.beginPath();
  if (pts.length < 3) {
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    return;
  }
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round((pa >> 16) + (((pb >> 16) & 255) - (pa >> 16)) * t);
  const g = Math.round(((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * t));
  const bl = Math.round((pa & 255) + (((pb & 255) - (pa & 255)) * t));
  return `rgb(${r},${g},${bl})`;
}

// -------------------------------------------------------------------- layers

function paintOcean(ctx: CanvasRenderingContext2D, view: MapView) {
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(0, 0, view.width, view.height);

  const tl = worldToScreen(view.camera, view.width, view.height, 0, 0);
  const br = worldToScreen(view.camera, view.width, view.height, WORLD.width, WORLD.height);
  const w = br.x - tl.x;
  const h = br.y - tl.y;

  // Cold deep water at the poles warming towards the tropics — cheap depth cue.
  const grad = ctx.createLinearGradient(0, tl.y, 0, br.y);
  grad.addColorStop(0, COLORS.waterDeep);
  grad.addColorStop(0.45, COLORS.water);
  grad.addColorStop(0.62, COLORS.water);
  grad.addColorStop(1, COLORS.waterDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(tl.x, tl.y, w, h);
}

function paintGraticule(ctx: CanvasRenderingContext2D, view: MapView) {
  const zoom = view.camera.zoom;
  const stepDegrees = zoom > 1.6 ? 10 : zoom > 0.7 ? 15 : 30;
  const stepX = (WORLD.width / 360) * stepDegrees;
  const stepY = (WORLD.height / 180) * stepDegrees;

  ctx.lineWidth = 1;
  for (const major of [false, true]) {
    ctx.strokeStyle = major ? COLORS.gridMajor : COLORS.grid;
    ctx.beginPath();
    for (let x = 0; x <= WORLD.width + 0.5; x += stepX) {
      const isMajor = Math.abs(x - WORLD.width / 2) < 0.5;
      if (isMajor !== major) continue;
      const a = worldToScreen(view.camera, view.width, view.height, x, 0);
      const b = worldToScreen(view.camera, view.width, view.height, x, WORLD.height);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    for (let y = 0; y <= WORLD.height + 0.5; y += stepY) {
      // equator and the two tropics read as major lines
      const lat = 90 - (y / WORLD.height) * 180;
      const isMajor = Math.abs(lat) < 0.5 || Math.abs(Math.abs(lat) - 23.5) < 4;
      if (isMajor !== major) continue;
      const a = worldToScreen(view.camera, view.width, view.height, 0, y);
      const b = worldToScreen(view.camera, view.width, view.height, WORLD.width, y);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }
}

function paintLand(ctx: CanvasRenderingContext2D, view: MapView) {
  const zoom = view.camera.zoom;

  // 1. continental shelf: two fat translucent strokes outside the coast
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLORS.shelf;
  for (const pass of [3.5, 1.6]) {
    ctx.lineWidth = Math.max(2, pass * 4 * zoom);
    for (const mass of LANDMASSES) {
      if (!visible(view, mass.bounds)) continue;
      tracePoly(ctx, view, mass.outline);
      ctx.stroke();
    }
  }

  // 2. land fill, slightly lighter towards the equator so continents aren't flat
  const tl = worldToScreen(view.camera, view.width, view.height, 0, 0);
  const br = worldToScreen(view.camera, view.width, view.height, WORLD.width, WORLD.height);
  const grad = ctx.createLinearGradient(0, tl.y, 0, br.y);
  grad.addColorStop(0, COLORS.landLow);
  grad.addColorStop(0.5, COLORS.land);
  grad.addColorStop(1, COLORS.landLow);
  const ice = ctx.createLinearGradient(0, tl.y, 0, br.y);
  ice.addColorStop(0, COLORS.iceHigh);
  ice.addColorStop(0.5, COLORS.ice);
  ice.addColorStop(1, COLORS.iceHigh);

  for (const mass of LANDMASSES) {
    if (!visible(view, mass.bounds)) continue;
    ctx.fillStyle = mass.ice ? ice : grad;
    tracePoly(ctx, view, mass.outline);
    ctx.fill();
  }
}

function paintRelief(ctx: CanvasRenderingContext2D, view: MapView) {
  const zoom = view.camera.zoom;
  const ranges = MOUNTAIN_RANGES.filter((r) => visible(view, r.bounds));
  if (ranges.length === 0) return;

  ctx.save();
  // Clip to the land union so a wide ridge can never bleed into the sea.
  ctx.beginPath();
  for (const mass of LANDMASSES) {
    if (!visible(view, mass.bounds)) continue;
    for (let i = 0; i < mass.outline.length; i++) {
      const p = worldToScreen(view.camera, view.width, view.height, mass.outline[i][0], mass.outline[i][1]);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  }
  ctx.clip();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const r of ranges) {
    drawRange(ctx, view, r, zoom);
  }
  ctx.restore();
}

function drawRange(
  ctx: CanvasRenderingContext2D,
  view: MapView,
  r: MountainRange,
  zoom: number,
) {
  const base = Math.max(2.5, r.spread * 2 * zoom);
  const e = r.elevation;

  // cast shadow, offset south-east: reads as raised ground rather than a painted stripe
  ctx.save();
  ctx.globalAlpha = 0.35 + e * 0.4;
  ctx.translate(base * 0.14, base * 0.18);
  ctx.strokeStyle = COLORS.ridgeShadow;
  ctx.lineWidth = base;
  traceRidge(ctx, view, r.path);
  ctx.stroke();
  ctx.restore();

  // foothills — barely above the surrounding plain
  ctx.strokeStyle = mix(COLORS.land, COLORS.landHigh, 0.5 + e * 0.5);
  ctx.lineWidth = base;
  traceRidge(ctx, view, r.path);
  ctx.stroke();

  // upper slopes — this is where elevation starts to show
  ctx.strokeStyle = mix(COLORS.landHigh, COLORS.ridgeLow, 0.35 + e * 0.65);
  ctx.lineWidth = base * 0.62;
  traceRidge(ctx, view, r.path);
  ctx.stroke();

  // bare rock, only on the taller half of the list
  if (e >= 0.45) {
    ctx.strokeStyle = mix(COLORS.ridgeLow, COLORS.ridgeHigh, (e - 0.45) * 1.6);
    ctx.lineWidth = base * 0.3;
    traceRidge(ctx, view, r.path);
    ctx.stroke();
  }

  // snow, reserved for the genuinely alpine ranges
  if (e >= 0.78) {
    ctx.strokeStyle = mix(COLORS.ridgeHigh, COLORS.ridgeSnow, Math.min(0.62, (e - 0.78) * 2.8));
    ctx.lineWidth = Math.max(0.9, base * 0.13);
    traceRidge(ctx, view, r.path);
    ctx.stroke();
  }

  // hatching only once a range is wide enough on screen for it to read as texture
  if (base > 11) hatchRidge(ctx, view, r, base);
}

/** Short perpendicular ticks along the spine — turns a smooth tube into ridged terrain. */
function hatchRidge(
  ctx: CanvasRenderingContext2D,
  view: MapView,
  r: MountainRange,
  base: number,
) {
  const pts = r.path.map(([x, y]) => worldToScreen(view.camera, view.width, view.height, x, y));
  const spacing = base * 0.5;
  const half = base * 0.44;

  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.strokeStyle = COLORS.ridgeShadow;
  ctx.lineWidth = Math.max(0.8, base * 0.07);
  ctx.beginPath();
  let carry = 0;
  let tick = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) continue;
    const ux = dx / len;
    const uy = dy / len;
    for (let d = carry; d < len; d += spacing) {
      // deterministic jitter: uniform rungs read as a ladder, varied ones as terrain
      const wobble = 0.55 + 0.45 * Math.abs(Math.sin(tick++ * 2.399));
      const cx = pts[i].x + ux * d;
      const cy = pts[i].y + uy * d;
      ctx.moveTo(cx - uy * half * wobble, cy + ux * half * wobble);
      ctx.lineTo(cx + uy * half * 0.25, cy - ux * half * 0.25);
    }
    carry = spacing - ((len - carry) % spacing);
  }
  ctx.stroke();
  ctx.restore();
}

function paintInlandWater(ctx: CanvasRenderingContext2D, view: MapView) {
  ctx.fillStyle = COLORS.water;
  ctx.strokeStyle = COLORS.waterEdge;
  ctx.lineWidth = Math.max(0.6, 1.1 * view.camera.zoom);
  for (const poly of INLAND_WATER) {
    tracePoly(ctx, view, poly);
    ctx.fill();
    ctx.stroke();
  }
}

function paintCoastlines(ctx: CanvasRenderingContext2D, view: MapView) {
  const zoom = view.camera.zoom;
  ctx.lineJoin = 'round';

  // dark liner first so the bright coast reads against both land and water
  ctx.strokeStyle = COLORS.landEdge;
  ctx.lineWidth = Math.max(1.4, 2.6 * zoom);
  for (const mass of LANDMASSES) {
    if (!visible(view, mass.bounds)) continue;
    tracePoly(ctx, view, mass.outline);
    ctx.stroke();
  }

  ctx.lineWidth = Math.max(0.7, 1 * zoom);
  for (const mass of LANDMASSES) {
    if (zoom < mass.minZoom || !visible(view, mass.bounds)) continue;
    ctx.strokeStyle = mass.ice ? COLORS.iceEdge : COLORS.coast;
    tracePoly(ctx, view, mass.outline);
    ctx.stroke();
  }
}

// ------------------------------------------------------------ cached compositor

let cache: HTMLCanvasElement | null = null;
let cacheKey = '';

function paint(ctx: CanvasRenderingContext2D, view: MapView) {
  paintOcean(ctx, view);
  paintGraticule(ctx, view);
  paintLand(ctx, view);
  paintRelief(ctx, view);
  paintInlandWater(ctx, view);
  paintCoastlines(ctx, view);
}

/** Draws the whole static map background, re-using the last frame when nothing moved. */
export function drawMapBackground(ctx: CanvasRenderingContext2D, view: MapView) {
  const dpr = window.devicePixelRatio || 1;
  const cam = view.camera;
  const key = `${view.width}x${view.height}@${dpr}|${cam.x.toFixed(1)}|${cam.y.toFixed(1)}|${cam.zoom.toFixed(4)}`;

  if (!cache) cache = document.createElement('canvas');
  if (key !== cacheKey) {
    const bw = Math.max(1, Math.round(view.width * dpr));
    const bh = Math.max(1, Math.round(view.height * dpr));
    if (cache.width !== bw || cache.height !== bh) {
      cache.width = bw;
      cache.height = bh;
    }
    const bctx = cache.getContext('2d');
    if (!bctx) {
      paint(ctx, view); // no offscreen context available — just draw straight through
      return;
    }
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, view.width, view.height);
    paint(bctx, view);
    cacheKey = key;
  }

  ctx.drawImage(cache, 0, 0, view.width, view.height);
}

/** Call if the palette or geography is hot-reloaded. */
export function invalidateMapBackground() {
  cacheKey = '';
}
