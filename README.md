# Verrand Basin Railway — MVP

A browser railway-network strategy game. React + TypeScript + Vite, with the map rendered on
HTML5 Canvas and the simulation running independently of React.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production bundle
```

## Controls

| Action | Input |
| --- | --- |
| Pan / zoom | Drag map / mouse wheel |
| Open station panel | Click a city |
| Build a line | `Build railway` → click two cities → confirm |
| Buy a train | Station panel or `Trains` panel |
| Pause | `Space` |
| Speed 1× / 2× / 4× | `1` `2` `3` |
| Build mode / cancel | `B` / `Esc` |

## Architecture

```
src/sim/      headless simulation (no React, no DOM)
  types.ts    City, Railway, Train, Demand
  config.ts   all tunable balance numbers
  mapData.ts  22 fictional cities + terrain polygons
  routing.ts  Dijkstra all-pairs next-hop table
  engine.ts   GameEngine: update(dt), buildRailway, buyTrain, snapshot()
src/render/   canvas camera + renderer (reads engine state directly)
src/ui/       React HUD, panels, toolbar (reads snapshot() ~8×/sec)
App.tsx       fixed-step game loop, pointer input, panel wiring
```

The loop runs a fixed 1/60s simulation step with an accumulator, so 2× and 4× speed replay the
same physics more times per frame rather than scaling velocities.
