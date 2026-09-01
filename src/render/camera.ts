import { WORLD } from '../sim/mapData';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const MAX_ZOOM = 3;

/**
 * Smallest zoom at which the map still covers the whole viewport.
 *
 * This is a "cover" fit, not a "contain" fit: the world is 2:1 and most windows
 * aren't, so containing it would leave a grey gutter on two sides. Covering crops
 * the long axis slightly instead, which is what keeps the background edge-to-edge.
 */
export function minZoomFor(width: number, height: number): number {
  if (width <= 0 || height <= 0) return WORLD.height > 0 ? 0.35 : 1;
  return Math.max(width / WORLD.width, height / WORLD.height);
}

export function createCamera(): Camera {
  return { x: WORLD.width / 2, y: WORLD.height / 2, zoom: 0.8 };
}

export function fitCamera(cam: Camera, width: number, height: number) {
  cam.zoom = Math.min(MAX_ZOOM, minZoomFor(width, height));
  cam.x = WORLD.width / 2;
  cam.y = WORLD.height / 2;
  clampCamera(cam, width, height);
}

export function worldToScreen(cam: Camera, w: number, h: number, x: number, y: number) {
  return { x: (x - cam.x) * cam.zoom + w / 2, y: (y - cam.y) * cam.zoom + h / 2 };
}

export function screenToWorld(cam: Camera, w: number, h: number, x: number, y: number) {
  return { x: (x - w / 2) / cam.zoom + cam.x, y: (y - h / 2) / cam.zoom + cam.y };
}

export function zoomAt(cam: Camera, w: number, h: number, sx: number, sy: number, factor: number) {
  const before = screenToWorld(cam, w, h, sx, sy);
  cam.zoom = Math.max(minZoomFor(w, h), Math.min(MAX_ZOOM, cam.zoom * factor));
  const after = screenToWorld(cam, w, h, sx, sy);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
  clampCamera(cam, w, h);
}

/**
 * Keeps the viewport rectangle inside the world rectangle, so no frame can ever
 * show void beyond the map. Needs the viewport size because the legal range for
 * the camera centre depends on how much world currently fits on screen.
 */
export function clampCamera(cam: Camera, width: number, height: number) {
  const halfW = width / (2 * cam.zoom);
  const halfH = height / (2 * cam.zoom);

  // If an axis is fully visible (can happen at the zoom floor on odd aspects), pin to centre.
  cam.x =
    halfW * 2 >= WORLD.width
      ? WORLD.width / 2
      : Math.max(halfW, Math.min(WORLD.width - halfW, cam.x));
  cam.y =
    halfH * 2 >= WORLD.height
      ? WORLD.height / 2
      : Math.max(halfH, Math.min(WORLD.height - halfH, cam.y));
}

/** Call after the viewport resizes: the zoom floor moves with it. */
export function enforceCameraBounds(cam: Camera, width: number, height: number) {
  cam.zoom = Math.max(minZoomFor(width, height), Math.min(MAX_ZOOM, cam.zoom));
  clampCamera(cam, width, height);
}
