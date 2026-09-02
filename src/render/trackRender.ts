/**
 * Drawing helpers for section-based track.
 *
 * `projectPath` + `strokePolyline` replace the moveTo/lineTo pair that used to draw a
 * railway, so every existing stroke pass (casing, core, sleepers) keeps its look — only
 * the points the pen visits change.
 *
 * The draft is drawn in three registers so it is never mistaken for real track:
 *   placed sections — solid teal, joint pips at every section boundary
 *   live preview    — dashed; amber when the radius was auto-widened
 *   illegal preview — red, with the offending angle called out at the joint
 */

import { worldToScreen, type Camera } from './camera';
import { COLORS } from './theme';
import { flattenSection, toDegrees, type TrackPath, type TrackSection } from '../sim/track';
import type { Draft } from '../build/trackBuilder';

export interface Screen {
  x: number;
  y: number;
}

interface CameraView {
  camera: Camera;
  width: number;
  height: number;
}

/** Project a cached railway path into screen space once, for all its stroke passes. */
export function projectPath(view: CameraView, path: TrackPath): Screen[] {
  const out: Screen[] = new Array(path.points.length);
  for (let i = 0; i < path.points.length; i++) {
    const p = path.points[i];
    out[i] = worldToScreen(view.camera, view.width, view.height, p.x, p.y);
  }
  return out;
}

/** Project loose sections that have no cached path yet (the draft). */
export function projectSections(view: CameraView, sections: TrackSection[]): Screen[] {
  // Flatten finer when zoomed in so arcs never read as polygons.
  const step = Math.max(2, 7 / Math.max(0.35, view.camera.zoom));
  const out: Screen[] = [];
  for (const section of sections) {
    for (const p of flattenSection(section, step)) {
      out.push(worldToScreen(view.camera, view.width, view.height, p.x, p.y));
    }
  }
  return out;
}

/** Build the sub-path and stroke it. Leaves the path current so callers can re-stroke. */
export function strokePolyline(ctx: CanvasRenderingContext2D, pts: Screen[]) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

/**
 * Walk a screen-space polyline dropping a mark every `spacing` pixels, carrying the
 * remainder across segment boundaries so sleeper spacing stays even through curves.
 */
export function ticksAlong(
  pts: Screen[],
  spacing: number,
  fn: (x: number, y: number, ux: number, uy: number) => void,
) {
  let carry = spacing;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const ux = dx / len;
    const uy = dy / len;
    for (let d = carry; d < len; d += spacing) {
      fn(a.x + ux * d, a.y + uy * d, ux, uy);
    }
    carry = Math.max(0, spacing - ((len - carry) % spacing));
  }
}

function jointPip(ctx: CanvasRenderingContext2D, p: Screen, color: string) {
  ctx.fillStyle = COLORS.void;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function flag(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.font = '600 11px "IBM Plex Mono", monospace';
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = 'rgba(8,13,15,0.92)';
  ctx.beginPath();
  ctx.rect(x - w / 2, y - 10, w, 20);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

/**
 * Draw the in-progress railway. Called between the continent locks and the city nodes,
 * so stations stay legible on top of whatever is being drawn through them.
 */
export function drawDraft(
  ctx: CanvasRenderingContext2D,
  view: CameraView,
  draft: Draft,
  costLabel: string | null,
) {
  if (!draft.active || !draft.origin) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- sections already placed ------------------------------------------------
  if (draft.sections.length > 0) {
    const pts = projectSections(view, draft.sections);
    ctx.strokeStyle = COLORS.railShadow;
    ctx.lineWidth = 6;
    strokePolyline(ctx, pts);
    ctx.strokeStyle = COLORS.preview;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // --- live preview -----------------------------------------------------------
  const preview = draft.preview;
  const joint = draft.sections[draft.sections.length - 1]?.end ?? draft.origin;
  const jointPt = worldToScreen(view.camera, view.width, view.height, joint.x, joint.y);

  if (preview?.section) {
    const color = !preview.valid
      ? COLORS.overloaded
      : preview.adjusted
        ? COLORS.brass
        : COLORS.preview;

    ctx.setLineDash([9, 7]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color;
    strokePolyline(ctx, projectSections(view, [preview.section]));
    ctx.setLineDash([]);

    const end = preview.section.end;
    const tip = worldToScreen(view.camera, view.width, view.height, end.x, end.y);
    jointPip(ctx, tip, color);

    if (!preview.valid && preview.error) {
      flag(ctx, tip.x, tip.y - 22, 'CANNOT PLACE', COLORS.overloaded);
    } else if (preview.adjusted) {
      flag(ctx, tip.x, tip.y - 22, 'RADIUS WIDENED', COLORS.brass);
    } else if (costLabel) {
      flag(ctx, tip.x, tip.y - 22, costLabel, COLORS.preview);
    }
  } else if (preview && draft.cursor) {
    // Nothing drawable — show the rejected reach so the cursor still feels connected.
    const b = worldToScreen(view.camera, view.width, view.height, draft.cursor.x, draft.cursor.y);
    ctx.setLineDash([5, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.overloaded;
    strokePolyline(ctx, [jointPt, b]);
    ctx.setLineDash([]);

    const angle = Math.round(180 - toDegrees(preview.deflection));
    flag(
      ctx,
      jointPt.x,
      jointPt.y - 26,
      Number.isFinite(angle) && preview.deflection > 0 ? `${angle}° — TOO SHARP` : 'TOO SHARP',
      COLORS.overloaded,
    );
  }

  // --- joints -----------------------------------------------------------------
  const originPt = worldToScreen(
    view.camera,
    view.width,
    view.height,
    draft.origin.x,
    draft.origin.y,
  );
  jointPip(ctx, originPt, COLORS.preview);
  for (const section of draft.sections) {
    const p = worldToScreen(view.camera, view.width, view.height, section.end.x, section.end.y);
    jointPip(ctx, p, COLORS.preview);
  }

  ctx.restore();
}
