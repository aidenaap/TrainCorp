/**
 * Section-by-section track builder.
 *
 * Holds the in-progress ("draft") railway: which station it left, the sections already
 * laid, and the live preview of the section under the cursor. Deliberately plain
 * mutable state, no React — App.tsx keeps it in a ref so pointer moves can repaint at
 * 60fps without re-rendering the UI tree, and mirrors only a small summary into state
 * for the toolbar.
 *
 * The draft is never handed to the engine until it terminates on a second station, so
 * an abandoned draft costs nothing and touches no simulation state.
 */

import {
  MAX_DEFLECTION,
  TRACK,
  endTangent,
  retargetToPoint,
  sectionLength,
  solveCurve,
  solveStraight,
  toDegrees,
  type SolveResult,
  type TrackSection,
  type Vec2,
} from '../sim/track';

export type BuildMode = 'straight' | 'curve';

export interface PreviewState {
  section: TrackSection | null;
  valid: boolean;
  /** player-facing reason the section cannot be placed */
  error: string | null;
  /** radius was auto-widened to stay drivable */
  adjusted: boolean;
  deflection: number;
  radius: number;
  /** station the preview endpoint is snapped to, if any */
  endCityId: string | null;
}

export interface Draft {
  active: boolean;
  mode: BuildMode;
  fromCityId: string | null;
  origin: Vec2 | null;
  sections: TrackSection[];
  cursor: Vec2 | null;
  snapEnabled: boolean;
  preview: PreviewState | null;
}

export interface SnapTarget {
  cityId: string;
  point: Vec2;
}

export function createDraft(): Draft {
  return {
    active: false,
    mode: 'straight',
    fromCityId: null,
    origin: null,
    sections: [],
    cursor: null,
    snapEnabled: false,
    preview: null,
  };
}

export function resetDraft(draft: Draft) {
  draft.active = false;
  draft.fromCityId = null;
  draft.origin = null;
  draft.sections = [];
  draft.cursor = null;
  draft.preview = null;
}

export function startDraft(draft: Draft, cityId: string, point: Vec2) {
  resetDraft(draft);
  draft.active = true;
  draft.fromCityId = cityId;
  draft.origin = { ...point };
}

/** Where the next section begins. */
export function draftEnd(draft: Draft): Vec2 | null {
  const last = draft.sections[draft.sections.length - 1];
  return last ? last.end : draft.origin;
}

/** Direction the last section arrives with; null on the first section (free bearing). */
export function draftTangent(draft: Draft): Vec2 | null {
  const last = draft.sections[draft.sections.length - 1];
  return last ? endTangent(last) : null;
}

export function draftLength(draft: Draft): number {
  let total = 0;
  for (const s of draft.sections) total += sectionLength(s);
  return total;
}

function describe(result: Extract<SolveResult, { ok: false }>): string {
  switch (result.reason) {
    case 'sharp':
      return `Turn too sharp — ${Math.round(180 - toDegrees(result.deflection))}° corner, minimum is ${Math.round(
        180 - toDegrees(MAX_DEFLECTION),
      )}°.`;
    case 'tight':
      return `Curve radius too small for a train (needs ${TRACK.minCurveRadius} units).`;
    default:
      return 'Drag further from the current track end.';
  }
}

/**
 * Recompute the preview for the current cursor position.
 * `snap` is the station under the cursor, if the caller found one; snapping pins the
 * endpoint exactly, which also disables radius auto-adjust (we may not move a station).
 */
export function updatePreview(draft: Draft, cursor: Vec2, snap: SnapTarget | null) {
  if (!draft.active) return;
  draft.cursor = { ...cursor };

  const start = draftEnd(draft);
  if (!start) {
    draft.preview = null;
    return;
  }

  const tangent = draftTangent(draft);
  const target = snap ? snap.point : cursor;
  const pinned = snap !== null;

  const result =
    draft.mode === 'curve'
      ? solveCurve(start, tangent, target, !pinned)
      : solveStraight(start, tangent, target, draft.snapEnabled && !pinned);

  if (!result.ok) {
    draft.preview = {
      section: null,
      valid: false,
      error: describe(result),
      adjusted: false,
      deflection: result.deflection,
      radius: result.radius,
      endCityId: snap?.cityId ?? null,
    };
    return;
  }

  // A pinned endpoint must land exactly on the station, even if solving nudged it.
  const section = pinned ? retargetToPoint(result.section, target) : result.section;

  let error: string | null = null;
  if (snap && snap.cityId === draft.fromCityId && draft.sections.length === 0) {
    error = 'A line cannot terminate at its own origin station.';
  }

  draft.preview = {
    section,
    valid: error === null,
    error,
    adjusted: result.adjusted,
    deflection: result.deflection,
    radius: result.radius,
    endCityId: snap?.cityId ?? null,
  };
}

export function setMode(draft: Draft, mode: BuildMode, snap: SnapTarget | null = null) {
  draft.mode = mode;
  // Repaint immediately so switching modes visibly changes the preview.
  if (draft.cursor) updatePreview(draft, draft.cursor, snap);
}

export type CommitResult =
  | { status: 'rejected'; error: string }
  | { status: 'extended' }
  | { status: 'complete'; toCityId: string; sections: TrackSection[] };

/** Place the previewed section. Returns 'complete' once it lands on a station. */
export function commitSection(draft: Draft): CommitResult {
  const preview = draft.preview;
  if (!draft.active || !preview) return { status: 'rejected', error: 'Nothing to place.' };
  if (!preview.valid || !preview.section) {
    return { status: 'rejected', error: preview.error ?? 'Invalid section.' };
  }

  draft.sections.push(preview.section);
  const endCityId = preview.endCityId;
  draft.preview = null;

  if (endCityId && endCityId !== draft.fromCityId) {
    return { status: 'complete', toCityId: endCityId, sections: [...draft.sections] };
  }
  return { status: 'extended' };
}

/** Remove the last placed section; the draft stays alive down to zero sections. */
export function undoSection(draft: Draft): boolean {
  if (!draft.active || draft.sections.length === 0) return false;
  draft.sections.pop();
  draft.preview = null;
  return true;
}

/** Summary the React toolbar renders. Cheap enough to build every UI tick. */
export interface DraftSummary {
  active: boolean;
  mode: BuildMode;
  fromCityId: string | null;
  sectionCount: number;
  length: number;
  error: string | null;
  adjusted: boolean;
  canUndo: boolean;
}

export function summarize(draft: Draft): DraftSummary {
  return {
    active: draft.active,
    mode: draft.mode,
    fromCityId: draft.fromCityId,
    sectionCount: draft.sections.length,
    length: draftLength(draft),
    error: draft.preview?.error ?? null,
    adjusted: draft.preview?.adjusted ?? false,
    canUndo: draft.sections.length > 0,
  };
}
