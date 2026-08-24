import { CONTINENTS, HIGHLANDS, LAND, WATER, WORLD, type Poly } from '../sim/mapData';
import { statusFor } from '../sim/engine';
import type { City, GameState } from '../sim/types';
import { worldToScreen, type Camera } from './camera';
import { COLORS, STATUS_COLOR } from './theme';

export interface ViewState {
  camera: Camera;
  width: number;
  height: number;
  time: number;
  hoverCityId: string | null;
  selectedCityId: string | null;
  selectedRailwayId: string | null;
  buildFromId: string | null;
  buildCursor: { x: number; y: number } | null;
  buildValid: boolean;
  buildCost: number | null;
}

const TIER_RADIUS = { small: 5.5, medium: 7.5, large: 10.5 } as const;

/** ctx.roundRect is too new to rely on — a thrown TypeError here would kill the frame loop. */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function tracePoly(ctx: CanvasRenderingContext2D, view: ViewState, poly: Poly) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => {
    const p = worldToScreen(view.camera, view.width, view.height, x, y);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
}

function drawBackground(ctx: CanvasRenderingContext2D, view: ViewState) {
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(0, 0, view.width, view.height);

  const tl = worldToScreen(view.camera, view.width, view.height, 0, 0);
  const br = worldToScreen(view.camera, view.width, view.height, WORLD.width, WORLD.height);
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

  for (const poly of LAND) {
    tracePoly(ctx, view, poly);
    ctx.fillStyle = COLORS.land;
    ctx.fill();
    ctx.strokeStyle = COLORS.landEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // survey grid
  const step = 100;
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= WORLD.width; x += step) {
    const a = worldToScreen(view.camera, view.width, view.height, x, 0);
    const b = worldToScreen(view.camera, view.width, view.height, x, WORLD.height);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  for (let y = 0; y <= WORLD.height; y += step) {
    const a = worldToScreen(view.camera, view.width, view.height, 0, y);
    const b = worldToScreen(view.camera, view.width, view.height, WORLD.width, y);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  for (const poly of HIGHLANDS) {
    tracePoly(ctx, view, poly);
    ctx.fillStyle = COLORS.highland;
    ctx.fill();
    ctx.strokeStyle = COLORS.landEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (const poly of WATER) {
    tracePoly(ctx, view, poly);
    ctx.fillStyle = COLORS.water;
    ctx.fill();
    ctx.strokeStyle = COLORS.waterEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawContinentLocks(ctx: CanvasRenderingContext2D, state: GameState, view: ViewState) {
  ctx.save();
  ctx.font = '700 24px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const continent of CONTINENTS) {
    if (state.unlockedContinents.has(continent.id)) continue;
    const p = worldToScreen(view.camera, view.width, view.height, continent.centerX, continent.centerY);
    const wash = Math.max(130, 210 * view.camera.zoom);
    ctx.fillStyle = 'rgba(8,13,15,0.28)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, wash, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(8,13,15,0.62)';
    roundedRect(ctx, p.x - 72, p.y - 24, 144, 48, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(124,147,156,0.48)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(220,230,233,0.76)';
    ctx.fillText(`🔒 ${continent.name}`, p.x, p.y);
  }
  ctx.restore();
}

function drawRailways(ctx: CanvasRenderingContext2D, state: GameState, view: ViewState) {
  const zoom = view.camera.zoom;
  for (const rail of state.railways.values()) {
    const from = state.cities.get(rail.from)!;
    const to = state.cities.get(rail.to)!;
    const a = worldToScreen(view.camera, view.width, view.height, from.x, from.y);
    const b = worldToScreen(view.camera, view.width, view.height, to.x, to.y);
    const active =
      rail.id === view.selectedRailwayId ||
      rail.from === view.selectedCityId ||
      rail.to === view.selectedCityId;

    ctx.lineCap = 'round';
    ctx.strokeStyle = COLORS.railShadow;
    ctx.lineWidth = Math.max(5, 8 * zoom);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    ctx.strokeStyle = rail.level === 3 ? '#D8F7FF' : active ? COLORS.railActive : COLORS.rail;
    ctx.lineWidth = Math.max(1.6, (2.6 + rail.level * 0.7) * zoom);
    ctx.stroke();

    // sleepers
    if (rail.level >= 2) {
      ctx.strokeStyle = rail.level === 3 ? '#81E6FF' : COLORS.brass;
      ctx.lineWidth = Math.max(0.8, 1.1 * zoom);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    if (zoom > 0.55) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      const spacing = 13;
      const half = Math.max(2, 3.2 * zoom);
      ctx.strokeStyle = active ? COLORS.brassDim : COLORS.railShadow;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let d = spacing; d < len - spacing; d += spacing) {
        const px = a.x + ux * d;
        const py = a.y + uy * d;
        ctx.moveTo(px - uy * half, py + ux * half);
        ctx.lineTo(px + uy * half, py - ux * half);
      }
      ctx.stroke();
    }
  }
}

function drawTrains(ctx: CanvasRenderingContext2D, state: GameState, view: ViewState) {
  const zoom = view.camera.zoom;
  const length = Math.max(16, 20 * zoom);
  const width = Math.max(7, 9 * zoom);

  for (const train of state.trains.values()) {
    const rail = state.railways.get(train.railwayId);
    if (!rail) continue;
    const from = state.cities.get(rail.from)!;
    const to = state.cities.get(rail.to)!;
    const wx = from.x + (to.x - from.x) * train.progress;
    const wy = from.y + (to.y - from.y) * train.progress;
    const p = worldToScreen(view.camera, view.width, view.height, wx, wy);
    const angle = Math.atan2(to.y - from.y, to.x - from.x) + (train.direction === 1 ? 0 : Math.PI);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);

    // dark halo so the train reads against the rail it sits on
    ctx.fillStyle = COLORS.void;
    roundedRect(ctx, -length / 2 - 2, -width / 2 - 2, length + 4, width + 4, 4);
    ctx.fill();

    const load = train.capacity > 0 ? train.onboard / train.capacity : 0;
    ctx.fillStyle = COLORS.brass;
    roundedRect(ctx, -length / 2, -width / 2, length, width, 3);
    ctx.fill();
    ctx.strokeStyle = '#FFE0A8';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (load > 0.01) {
      ctx.fillStyle = load > 0.85 ? COLORS.overloaded : COLORS.healthy;
      roundedRect(ctx, -length / 2 + 1, width / 2 - 3, (length - 2) * Math.min(1, load), 2.5, 1.2);
      ctx.fill();
    }

    // headlamp
    ctx.fillStyle = '#FFF3D6';
    ctx.beginPath();
    ctx.arc(length / 2 - 1.5, 0, Math.max(1, 1.4 * zoom), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawCity(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  view: ViewState,
  city: City,
  scale: number,
) {
  const p = worldToScreen(view.camera, view.width, view.height, city.x, city.y);
  const r = TIER_RADIUS[city.tier] * scale;
  const unlocked = state.unlockedContinents.has(city.continent);
  const ratio = unlocked ? city.waitingPassengers / city.passengerCapacity : 0;
  const status = statusFor(city.waitingPassengers, city.passengerCapacity);
  const color = STATUS_COLOR[status];
  const isHover = view.hoverCityId === city.id;
  const isSelected = view.selectedCityId === city.id;
  const isBuildAnchor = view.buildFromId === city.id;

  if (status === 'overloaded') {
    const pulse = 0.5 + 0.5 * Math.sin(view.time * 5);
    ctx.fillStyle = COLORS.overloaded;
    ctx.globalAlpha = 0.12 + pulse * 0.16;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 10 + pulse * 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // capacity ring
  ctx.strokeStyle = COLORS.railShadow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r + 4.5, 0, Math.PI * 2);
  ctx.stroke();

  if (ratio > 0.001) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      p.x,
      p.y,
      r + 4.5,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * Math.min(1, ratio),
    );
    ctx.stroke();
  }

  ctx.fillStyle = !unlocked
    ? 'rgba(124,147,156,0.35)'
    : city.connectedRailways.length > 0
      ? COLORS.paper
      : COLORS.muted;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = unlocked ? COLORS.land : 'rgba(8,13,15,0.55)';
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();

  if (isSelected || isHover || isBuildAnchor) {
    ctx.strokeStyle = isBuildAnchor ? COLORS.preview : COLORS.brass;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 11, 0, Math.PI * 2);
    ctx.stroke();
  }

  const showLabel =
    unlocked && (view.camera.zoom > 0.5 || city.tier === 'large' || isHover || isSelected);
  if (showLabel) {
    const size = Math.max(10, Math.round(11.5 * Math.min(1.4, Math.max(0.75, view.camera.zoom))));
    ctx.font = `600 ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = city.name.toUpperCase();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(8,13,15,0.85)';
    ctx.strokeText(label, p.x, p.y + r + 8);
    ctx.fillStyle = isHover || isSelected ? COLORS.brass : COLORS.paper;
    ctx.fillText(label, p.x, p.y + r + 8);

    if (city.waitingPassengers >= 1 && view.camera.zoom > 0.7) {
      ctx.font = `500 ${size - 1}px "IBM Plex Mono", monospace`;
      const wait = `${Math.round(city.waitingPassengers)}`;
      ctx.strokeText(wait, p.x, p.y + r + 8 + size + 2);
      ctx.fillStyle = color;
      ctx.fillText(wait, p.x, p.y + r + 8 + size + 2);
    }
  }
}

function drawBuildPreview(ctx: CanvasRenderingContext2D, state: GameState, view: ViewState) {
  if (!view.buildFromId || !view.buildCursor) return;
  const from = state.cities.get(view.buildFromId);
  if (!from) return;
  const a = worldToScreen(view.camera, view.width, view.height, from.x, from.y);
  const b = worldToScreen(
    view.camera,
    view.width,
    view.height,
    view.buildCursor.x,
    view.buildCursor.y,
  );

  ctx.save();
  ctx.setLineDash([9, 7]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = view.buildValid ? COLORS.preview : COLORS.overloaded;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();

  if (view.buildCost !== null) {
    const label = `$${view.buildCost.toLocaleString()}`;
    ctx.font = '600 13px "IBM Plex Mono", monospace';
    const w = ctx.measureText(label).width + 16;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2 - 18;
    ctx.fillStyle = 'rgba(8,13,15,0.9)';
    roundedRect(ctx, mx - w / 2, my - 11, w, 22, 4);
    ctx.fill();
    ctx.strokeStyle = view.buildValid ? COLORS.preview : COLORS.overloaded;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = view.buildValid ? COLORS.preview : COLORS.overloaded;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my);
  }
}

export function drawScene(ctx: CanvasRenderingContext2D, state: GameState, view: ViewState) {
  drawBackground(ctx, view);
  drawRailways(ctx, state, view);
  drawContinentLocks(ctx, state, view);
  drawBuildPreview(ctx, state, view);

  const scale = Math.min(1.5, Math.max(0.7, view.camera.zoom));
  for (const id of state.cityOrder) {
    drawCity(ctx, state, view, state.cities.get(id)!, scale);
  }

  // trains last: a train dwelling in a station must never disappear under the node
  drawTrains(ctx, state, view);
}

export function cityAtScreen(
  state: GameState,
  view: ViewState,
  sx: number,
  sy: number,
): City | null {
  const scale = Math.min(1.5, Math.max(0.7, view.camera.zoom));
  let best: City | null = null;
  let bestDist = Infinity;
  for (const city of state.cities.values()) {
    if (!state.unlockedContinents.has(city.continent)) continue;
    const p = worldToScreen(view.camera, view.width, view.height, city.x, city.y);
    const d = Math.hypot(p.x - sx, p.y - sy);
    const hit = TIER_RADIUS[city.tier] * scale + 12;
    if (d < hit && d < bestDist) {
      best = city;
      bestDist = d;
    }
  }
  return best;
}
