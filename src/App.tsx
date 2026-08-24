import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameEngine, type UiSnapshot } from './sim/engine';
import { CONFIG, type SpeedOption } from './sim/config';
import { clampCamera, createCamera, fitCamera, screenToWorld } from './render/camera';
import { zoomAt } from './render/camera';
import { cityAtScreen, drawScene, type ViewState } from './render/renderer';
import { Hud } from './ui/Hud';
import { CityPanel } from './ui/CityPanel';
import { StatsPanel, TrainsPanel } from './ui/SidePanels';
import { BuildConfirm, Toolbar, type PendingBuild } from './ui/Toolbar';
import { money } from './ui/format';

type PanelKind = 'city' | 'trains' | 'stats' | null;

export default function App() {
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) engineRef.current = new GameEngine();
  const engine = engineRef.current;
  if (import.meta.env.DEV) (window as unknown as { game: GameEngine }).game = engine;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ViewState>({
    camera: createCamera(),
    width: 800,
    height: 600,
    time: 0,
    hoverCityId: null,
    selectedCityId: null,
    selectedRailwayId: null,
    buildFromId: null,
    buildCursor: null,
    buildValid: true,
    buildCost: null,
  });

  const [snap, setSnap] = useState<UiSnapshot>(() => engine.snapshot());
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<SpeedOption>(1);
  const [buildMode, setBuildMode] = useState(false);
  const [buildFromId, setBuildFromId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingBuild | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelKind>(null);
  const [toast, setToast] = useState<{ text: string; bad: boolean } | null>(null);
  const [readyLine, setReadyLine] = useState<{ id: string; label: string } | null>(null);

  const pausedRef = useRef(paused);
  const speedRef = useRef<number>(speed);
  pausedRef.current = paused || pending !== null;
  speedRef.current = speed;

  // Keep the render view in sync with React-owned selection state.
  viewRef.current.selectedCityId = selectedCityId;
  viewRef.current.buildFromId = buildFromId;

  const notify = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  // ------------------------------------------------------------- game loop
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const view = viewRef.current;

    let fitted = false;

    // The canvas is sized to 100% of .map by CSS; we only own the backing store.
    // Checking it every frame keeps it correct when panels open, without relying
    // on observer timing (a stale inline width used to overlap the side panel).
    const syncSize = () => {
      const el = wrapRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      const dpr = window.devicePixelRatio || 1;
      const bw = Math.floor(w * dpr);
      const bh = Math.floor(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      view.width = w;
      view.height = h;
      if (!fitted) {
        fitCamera(view.camera, w, h);
        fitted = true;
      }
    };
    syncSize();

    let raf = 0;
    let last = performance.now();
    let accumulator = 0;
    let uiTimer = 0;
    let loggedError = false;

    const frame = (now: number) => {
      const real = Math.min(0.25, (now - last) / 1000);
      last = now;

      try {
        syncSize();

        if (!pausedRef.current) {
          accumulator += real * speedRef.current;
          let steps = 0;
          while (accumulator >= CONFIG.fixedStep && steps < CONFIG.maxStepsPerFrame) {
            engine.update(CONFIG.fixedStep);
            accumulator -= CONFIG.fixedStep;
            steps++;
          }
          if (accumulator > CONFIG.fixedStep * CONFIG.maxStepsPerFrame) accumulator = 0;
        }

        view.time = now / 1000;
        drawScene(ctx, engine.state, view);

        uiTimer += real;
        if (uiTimer >= 0.12) {
          uiTimer = 0;
          setSnap(engine.snapshot());
        }
      } catch (err) {
        // One bad frame must never stop the loop and freeze the whole game.
        if (!loggedError) {
          loggedError = true;
          console.error('[render loop]', err);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(raf);
  }, [engine]);

  // ------------------------------------------------------------ build flow
  const cancelBuild = useCallback(() => {
    setBuildFromId(null);
    setPending(null);
    viewRef.current.buildCursor = null;
    viewRef.current.buildCost = null;
  }, []);

  const exitBuildMode = useCallback(() => {
    setBuildMode(false);
    cancelBuild();
  }, [cancelBuild]);

  const startLineFrom = useCallback((cityId: string) => {
    setBuildMode(true);
    setPending(null);
    setBuildFromId(cityId);
  }, []);

  const proposeLine = useCallback(
    (fromId: string, toId: string) => {
      const from = engine.state.cities.get(fromId)!;
      const to = engine.state.cities.get(toId)!;
      if (engine.findRailwayBetween(fromId, toId)) {
        notify(`${from.name} and ${to.name} are already linked.`, true);
        return;
      }
      const cost = engine.railwayCost(from, to);
      setPending({
        fromId,
        toId,
        fromName: from.name,
        toName: to.name,
        distance: Math.hypot(from.x - to.x, from.y - to.y),
        cost,
        affordable: cost <= engine.state.money,
      });
    },
    [engine, notify],
  );

  const confirmBuild = useCallback(() => {
    if (!pending) return;
    const result = engine.buildRailway(pending.fromId, pending.toId);
    if (!result.ok) {
      notify(result.error ?? 'Could not build that line.', true);
      return;
    }
    setReadyLine({
      id: engine.findRailwayBetween(pending.fromId, pending.toId)!.id,
      label: `${pending.fromName} → ${pending.toName}`,
    });
    setSelectedCityId(pending.toId);
    setPanel('city');
    setPending(null);
    setBuildFromId(null);
    setSnap(engine.snapshot());
  }, [engine, notify, pending]);

  const upgradeRailway = useCallback(
    (railwayId: string) => {
      const result = engine.upgradeRailway(railwayId);
      if (!result.ok) notify(result.error ?? 'Could not upgrade that line.', true);
      else notify('Line upgraded. Trains run faster on this track.');
      setSnap(engine.snapshot());
    },
    [engine, notify],
  );

  const buyTrain = useCallback(
    (railwayId: string) => {
      const result = engine.buyTrain(railwayId);
      if (!result.ok) {
        notify(result.error ?? 'Could not buy that train.', true);
      } else {
        notify('Train running. Watch it pick up passengers.');
        setReadyLine(null);
      }
      setSnap(engine.snapshot());
    },
    [engine, notify],
  );

  const resetGame = useCallback(() => {
    engine.reset();
    exitBuildMode();
    setSelectedCityId(null);
    setPanel(null);
    setReadyLine(null);
    setPaused(false);
    setSpeed(1);
    setSnap(engine.snapshot());
    notify('New game started.');
  }, [engine, exitBuildMode, notify]);

  // --------------------------------------------------------------- pointer
  const drag = useRef({ active: false, moved: false, x: 0, y: 0 });

  const localPoint = (e: React.PointerEvent | React.WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleClick = (sx: number, sy: number) => {
    const view = viewRef.current;
    const city = cityAtScreen(engine.state, view, sx, sy);

    if (buildMode) {
      if (!city) return;
      if (!buildFromId) {
        setBuildFromId(city.id);
        setPending(null);
        return;
      }
      if (city.id === buildFromId) {
        setBuildFromId(null);
        return;
      }
      proposeLine(buildFromId, city.id);
      return;
    }

    if (city) {
      setSelectedCityId(city.id);
      setPanel('city');
      view.selectedRailwayId = null;
    } else {
      setSelectedCityId(null);
      if (panel === 'city') setPanel(null);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = localPoint(e);
    drag.current = { active: true, moved: false, x: p.x, y: p.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const view = viewRef.current;
    const p = localPoint(e);

    if (drag.current.active) {
      const dx = p.x - drag.current.x;
      const dy = p.y - drag.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.current.moved = true;
      if (drag.current.moved) {
        view.camera.x -= dx / view.camera.zoom;
        view.camera.y -= dy / view.camera.zoom;
        clampCamera(view.camera);
        drag.current.x = p.x;
        drag.current.y = p.y;
      }
    }

    const hovered = cityAtScreen(engine.state, view, p.x, p.y);
    view.hoverCityId = hovered?.id ?? null;

    if (buildMode && buildFromId && !pending) {
      const from = engine.state.cities.get(buildFromId)!;
      const world = hovered
        ? { x: hovered.x, y: hovered.y }
        : screenToWorld(view.camera, view.width, view.height, p.x, p.y);
      view.buildCursor = world;
      view.buildValid =
        !hovered ||
        (hovered.id !== buildFromId && !engine.findRailwayBetween(buildFromId, hovered.id));
      const cost = engine.railwayCost(from, { ...from, x: world.x, y: world.y });
      view.buildCost = cost;
      if (cost > engine.state.money) view.buildValid = false;
    } else if (!pending) {
      view.buildCursor = null;
      view.buildCost = null;
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = localPoint(e);
    const wasDrag = drag.current.moved;
    drag.current.active = false;
    if (!wasDrag) handleClick(p.x, p.y);
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const view = viewRef.current;
    const p = localPoint(e);
    zoomAt(view.camera, view.width, view.height, p.x, p.y, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    clampCamera(view.camera);
  };

  // -------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === 'Escape') {
        if (pending) setPending(null);
        else if (buildMode) exitBuildMode();
        else setPanel(null);
      } else if (e.key.toLowerCase() === 'b') {
        setBuildMode((m) => {
          if (m) cancelBuild();
          return !m;
        });
      } else if (e.key === '1') setSpeed(1);
      else if (e.key === '2') setSpeed(2);
      else if (e.key === '3') setSpeed(4);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buildMode, cancelBuild, exitBuildMode, pending]);

  // ---------------------------------------------------------------- render
  const selectedCity = useMemo(
    () => snap.cities.find((c) => c.id === selectedCityId) ?? null,
    [snap, selectedCityId],
  );
  const selectedLines = useMemo(
    () => snap.railways.filter((r) => r.fromId === selectedCityId || r.toId === selectedCityId),
    [snap, selectedCityId],
  );

  const buildStage = !buildMode ? 'idle' : buildFromId ? 'pickSecond' : 'pickFirst';

  return (
    <div className="app">
      <Hud snap={snap} paused={paused} speed={speed} />

      <main className="stage">
        <div className="map" ref={wrapRef}>
          <canvas
            ref={canvasRef}
            className={buildMode ? 'canvas canvas--building' : 'canvas'}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => {
              drag.current.active = false;
              viewRef.current.hoverCityId = null;
            }}
            onWheel={onWheel}
          />

          {snap.railwayCount === 0 && !buildMode && (
            <div className="starter">
              <p className="starter__eyebrow">Global network, opening day</p>
              <p className="starter__body">
                Major world cities, no track between them. Drag or zoom the globe, choose
                <b>Build railway</b>, pick two stations, then put a train on the line before the
                platforms fill.
              </p>
            </div>
          )}

          {pending && (
            <BuildConfirm
              pending={pending}
              onConfirm={confirmBuild}
              onCancel={() => setPending(null)}
            />
          )}

          {readyLine && !pending && (
            <div className="prompt">
              <div className="prompt__text">
                <span className="prompt__eyebrow">Line open</span>
                <span className="prompt__label">{readyLine.label}</span>
                <span className="prompt__meta">Track earns nothing until a train runs on it.</span>
              </div>
              <div className="prompt__actions">
                <button className="btn btn--ghost" onClick={() => setReadyLine(null)}>
                  Later
                </button>
                <button
                  className="btn btn--primary"
                  disabled={snap.money < CONFIG.trainCost}
                  onClick={() => buyTrain(readyLine.id)}
                >
                  Add a train · {money(CONFIG.trainCost)}
                </button>
              </div>
            </div>
          )}

          {toast && <div className={`toast${toast.bad ? ' toast--bad' : ''}`}>{toast.text}</div>}
        </div>

        {panel === 'city' && selectedCity && (
          <CityPanel
            city={selectedCity}
            lines={selectedLines}
            money={snap.money}
            onBuyTrain={buyTrain}
            onUpgradeLine={upgradeRailway}
            onStartLine={startLineFrom}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === 'trains' && (
          <TrainsPanel
            snap={snap}
            onBuyTrain={buyTrain}
            onUpgradeLine={upgradeRailway}
            onSelectLine={(id) => {
              viewRef.current.selectedRailwayId = id;
            }}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === 'stats' && <StatsPanel snap={snap} onClose={() => setPanel(null)} />}
      </main>

      <Toolbar
        buildMode={buildMode}
        buildStage={buildStage}
        paused={paused}
        speed={speed}
        openPanel={panel === 'trains' || panel === 'stats' ? panel : null}
        onToggleBuild={() => {
          if (buildMode) exitBuildMode();
          else {
            setBuildMode(true);
            setPending(null);
            setBuildFromId(null);
          }
        }}
        onOpenPanel={(kind) => setPanel((p) => (p === kind ? null : kind))}
        onTogglePause={() => setPaused((p) => !p)}
        onSpeed={(s) => {
          setSpeed(s);
          setPaused(false);
        }}
        onReset={resetGame}
      />
    </div>
  );
}
