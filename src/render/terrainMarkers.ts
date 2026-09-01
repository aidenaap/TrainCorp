/**
 * Bridge and tunnel glyphs.
 *
 * These sit on top of the track wherever a line crosses water or high ground, so the
 * player can see *why* a link was expensive without opening a panel. They are drawn
 * upright rather than rotated to the track angle — a rotated tunnel portal reads as a
 * smear at small sizes, and legibility matters more here than realism.
 */

import type { Crossing } from '../sim/terrain';
import { worldToScreen, type Camera } from './camera';
import { COLORS } from './theme';

interface MarkerView {
  camera: Camera;
  width: number;
  height: number;
}

/** Below this zoom the glyphs are smaller than the track is wide, so they're skipped. */
const MIN_ZOOM = 0.75;

function drawBridge(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.strokeStyle = COLORS.paper;
  ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.lineCap = 'butt';

  // A viaduct — deck on top, arches underneath. Deliberately the inverse of the
  // tunnel glyph (arch with a dark mouth) so the two never blur together at 10px.
  const deck = y - r * 0.45;
  ctx.beginPath();
  ctx.moveTo(x - r, deck);
  ctx.lineTo(x + r, deck);
  ctx.stroke();

  const span = r * 0.62;
  ctx.beginPath();
  ctx.arc(x - span / 2, deck + span * 0.5, span * 0.5, Math.PI, 0, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + span / 2, deck + span * 0.5, span * 0.5, Math.PI, 0, true);
  ctx.stroke();

  // piers down to the waterline
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.beginPath();
  for (const px of [x - r * 0.93, x, x + r * 0.93]) {
    ctx.moveTo(px, deck);
    ctx.lineTo(px, y + r * 0.62);
  }
  ctx.stroke();
}

function drawTunnel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // portal arch
  ctx.strokeStyle = COLORS.paper;
  ctx.lineWidth = Math.max(1, r * 0.2);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y + r * 0.55);
  ctx.lineTo(x - r * 0.7, y);
  ctx.arc(x, y, r * 0.7, Math.PI, 0);
  ctx.lineTo(x + r * 0.7, y + r * 0.55);
  ctx.stroke();

  // dark mouth
  ctx.fillStyle = COLORS.void;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.36, y + r * 0.55);
  ctx.lineTo(x - r * 0.36, y);
  ctx.arc(x, y, r * 0.36, Math.PI, 0);
  ctx.lineTo(x + r * 0.36, y + r * 0.55);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws one glyph per crossing run. `active` brightens the plaque for the selected
 * line and for the build preview.
 */
export function drawCrossingMarkers(
  ctx: CanvasRenderingContext2D,
  view: MarkerView,
  crossings: Crossing[],
  active = false,
) {
  const zoom = view.camera.zoom;
  if (zoom < MIN_ZOOM || crossings.length === 0) return;

  const r = Math.max(6, Math.min(11, 7 * zoom));

  ctx.save();
  for (const c of crossings) {
    const p = worldToScreen(view.camera, view.width, view.height, c.x, c.y);
    if (p.x < -40 || p.x > view.width + 40 || p.y < -40 || p.y > view.height + 40) continue;

    // plaque so the glyph reads against both the rail and whatever is under it
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,22,30,0.85)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = active ? COLORS.brass : COLORS.brassDim;
    ctx.stroke();

    if (c.kind === 'bridge') drawBridge(ctx, p.x, p.y, r * 0.72);
    else drawTunnel(ctx, p.x, p.y, r * 0.72);
  }
  ctx.restore();
}
