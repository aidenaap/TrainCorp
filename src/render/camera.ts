import { WORLD } from '../sim/mapData';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 3;

export function createCamera(): Camera {
  return { x: WORLD.width / 2, y: WORLD.height / 2, zoom: 0.8 };
}

export function fitCamera(cam: Camera, width: number, height: number) {
  const zoom = Math.min(width / (WORLD.width + 120), height / (WORLD.height + 120));
  cam.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  cam.x = WORLD.width / 2;
  cam.y = WORLD.height / 2;
}

export function worldToScreen(cam: Camera, w: number, h: number, x: number, y: number) {
  return { x: (x - cam.x) * cam.zoom + w / 2, y: (y - cam.y) * cam.zoom + h / 2 };
}

export function screenToWorld(cam: Camera, w: number, h: number, x: number, y: number) {
  return { x: (x - w / 2) / cam.zoom + cam.x, y: (y - h / 2) / cam.zoom + cam.y };
}

export function zoomAt(cam: Camera, w: number, h: number, sx: number, sy: number, factor: number) {
  const before = screenToWorld(cam, w, h, sx, sy);
  cam.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom * factor));
  const after = screenToWorld(cam, w, h, sx, sy);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
}

export function clampCamera(cam: Camera) {
  const pad = 400;
  cam.x = Math.max(-pad, Math.min(WORLD.width + pad, cam.x));
  cam.y = Math.max(-pad, Math.min(WORLD.height + pad, cam.y));
}
