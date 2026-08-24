import { CONFIG } from './config';
import { CITY_SEEDS, TIER_CAPACITY, tierFor } from './mapData';
import { buildRoutingTable, nextHop } from './routing';
import type {
  BuildResult,
  City,
  Demand,
  GameState,
  LoadStatus,
  Railway,
  Train,
} from './types';

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${++idCounter}`;

export function distanceBetween(a: City, b: City): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function statusFor(waiting: number, capacity: number): LoadStatus {
  const ratio = waiting / capacity;
  if (ratio >= 1) return 'overloaded';
  if (ratio >= CONFIG.criticalAt) return 'critical';
  if (ratio >= CONFIG.warningAt) return 'warning';
  return 'healthy';
}

function mergeDemand(map: Map<string, Demand>, key: string, count: number, fare: number) {
  const existing = map.get(key);
  if (existing) {
    existing.count += count;
    existing.fare += fare;
  } else {
    map.set(key, { count, fare });
  }
}

/**
 * Owns all mutable game state. The renderer reads `state` every frame; React reads
 * `snapshot()` a few times a second. Nothing in here imports React or the DOM.
 */
export class GameEngine {
  state!: GameState;
  /** destination weights per origin city — static, computed once */
  private gravity = new Map<string, { id: string; weight: number }[]>();

  constructor() {
    this.reset();
  }

  reset() {
    const cities = new Map<string, City>();
    for (const seed of CITY_SEEDS) {
      const tier = tierFor(seed.population);
      cities.set(seed.id, {
        id: seed.id,
        name: seed.name,
        x: seed.x,
        y: seed.y,
        population: seed.population,
        tier,
        passengerCapacity: TIER_CAPACITY[tier],
        demand: new Map(),
        waitingPassengers: 0,
        connectedRailways: [],
        spawnTimer: Math.random() * CONFIG.spawnInterval,
      });
    }

    this.state = {
      money: CONFIG.startingMoney,
      cities,
      railways: new Map(),
      trains: new Map(),
      cityOrder: CITY_SEEDS.map((c) => c.id),
      stats: {
        totalDelivered: 0,
        totalRevenue: 0,
        totalSpent: 0,
        elapsed: 0,
        recentRevenue: new Array(60).fill(0),
      },
      routes: new Map(),
    };

    this.buildGravity();
    this.state.routes = buildRoutingTable(cities, this.state.railways);
  }

  private buildGravity() {
    this.gravity.clear();
    for (const origin of this.state.cities.values()) {
      const weights: { id: string; weight: number }[] = [];
      for (const dest of this.state.cities.values()) {
        if (dest.id === origin.id) continue;
        const d = Math.max(60, distanceBetween(origin, dest));
        const weight = (dest.population / 1_000_000) / Math.pow(d / 300, CONFIG.gravityExponent);
        weights.push({ id: dest.id, weight });
      }
      this.gravity.set(origin.id, weights);
    }
  }

  // ---------------------------------------------------------------- economy

  stationCost(city: City): number {
    const millions = city.population / 1_000_000;
    const scaled = CONFIG.stationCostBase + millions * CONFIG.stationCostPerMillion;
    return Math.round(
      Math.min(CONFIG.stationCostBase * CONFIG.stationCostMaxMultiplier, scaled),
    );
  }

  railwayCost(a: City, b: City): number {
    return Math.round(
      CONFIG.railwayBaseCost +
        distanceBetween(a, b) * CONFIG.railwayCostPerUnit +
        this.stationCost(a) +
        this.stationCost(b),
    );
  }

  lineUpgradeCost(railway: Railway): number {
    if (railway.level >= 3) return 0;
    return Math.round(
      CONFIG.lineUpgradeBaseCost * railway.level +
        railway.distance * CONFIG.lineUpgradeCostPerUnit * railway.level,
    );
  }

  findRailwayBetween(a: string, b: string): Railway | undefined {
    for (const r of this.state.railways.values()) {
      if ((r.from === a && r.to === b) || (r.from === b && r.to === a)) return r;
    }
    return undefined;
  }

  buildRailway(fromId: string, toId: string): BuildResult {
    if (fromId === toId) return { ok: false, error: 'A line needs two different cities.' };
    const from = this.state.cities.get(fromId);
    const to = this.state.cities.get(toId);
    if (!from || !to) return { ok: false, error: 'Unknown city.' };
    if (this.findRailwayBetween(fromId, toId)) {
      return { ok: false, error: `${from.name} and ${to.name} are already linked.` };
    }
    const cost = this.railwayCost(from, to);
    if (cost > this.state.money) {
      return { ok: false, error: `Short by $${Math.ceil(cost - this.state.money).toLocaleString()}.` };
    }

    const railway: Railway = {
      id: nextId('rail'),
      from: fromId,
      to: toId,
      distance: distanceBetween(from, to),
      capacity: CONFIG.railwayTrainCapacity,
      constructionCost: cost,
      level: 1,
      trainIds: [],
    };
    this.state.railways.set(railway.id, railway);
    from.connectedRailways.push(railway.id);
    to.connectedRailways.push(railway.id);
    this.state.money -= cost;
    this.state.stats.totalSpent += cost;
    this.state.routes = buildRoutingTable(this.state.cities, this.state.railways);
    return { ok: true };
  }

  upgradeRailway(railwayId: string): BuildResult {
    const railway = this.state.railways.get(railwayId);
    if (!railway) return { ok: false, error: 'Unknown line.' };
    if (railway.level >= 3) return { ok: false, error: 'This line is already bullet train track.' };
    const cost = this.lineUpgradeCost(railway);
    if (this.state.money < cost) {
      return { ok: false, error: `Short by $${Math.ceil(cost - this.state.money).toLocaleString()}.` };
    }
    railway.level = (railway.level + 1) as Railway['level'];
    this.state.money -= cost;
    this.state.stats.totalSpent += cost;
    return { ok: true };
  }

  buyTrain(railwayId: string): BuildResult {
    const railway = this.state.railways.get(railwayId);
    if (!railway) return { ok: false, error: 'Unknown line.' };
    if (railway.trainIds.length >= railway.capacity) {
      return { ok: false, error: `This line is full at ${railway.capacity} trains.` };
    }
    if (this.state.money < CONFIG.trainCost) {
      return {
        ok: false,
        error: `Short by $${Math.ceil(CONFIG.trainCost - this.state.money).toLocaleString()}.`,
      };
    }

    const slot = railway.trainIds.length;
    const train: Train = {
      id: nextId('train'),
      railwayId,
      capacity: CONFIG.trainCapacity,
      speed: CONFIG.trainSpeed,
      // stagger new trains so they don't stack on top of each other
      progress: (slot % railway.capacity) / railway.capacity,
      direction: slot % 2 === 0 ? 1 : -1,
      phase: 'moving',
      dwellTimer: 0,
      passengers: new Map(),
      onboard: 0,
    };
    this.state.trains.set(train.id, train);
    railway.trainIds.push(train.id);
    this.state.money -= CONFIG.trainCost;
    this.state.stats.totalSpent += CONFIG.trainCost;
    return { ok: true };
  }

  // ------------------------------------------------------------ simulation

  /** Advance the world by `dt` seconds of simulated time. */
  update(dt: number) {
    const prevSecond = Math.floor(this.state.stats.elapsed);
    this.state.stats.elapsed += dt;
    const second = Math.floor(this.state.stats.elapsed);
    if (second !== prevSecond) {
      this.state.stats.recentRevenue[second % 60] = 0;
    }

    this.updateCities(dt);
    this.updateTrains(dt);
  }

  private updateCities(dt: number) {
    for (const city of this.state.cities.values()) {
      city.spawnTimer -= dt;
      if (city.spawnTimer <= 0) {
        city.spawnTimer += CONFIG.spawnInterval;
        this.spawnDemand(city);
      }
      let total = 0;
      for (const [, group] of city.demand) total += group.count;
      city.waitingPassengers = total;
    }
  }

  private spawnDemand(city: City) {
    const amount =
      (city.population / 1_000_000) * CONFIG.spawnRatePerMillion * CONFIG.spawnInterval;
    const weights = this.gravity.get(city.id);
    if (!weights || amount <= 0) return;

    const picks = 2;
    const share = amount / picks;
    let sum = 0;
    for (const w of weights) sum += w.weight;

    for (let i = 0; i < picks; i++) {
      let roll = Math.random() * sum;
      let chosen = weights[weights.length - 1].id;
      for (const w of weights) {
        roll -= w.weight;
        if (roll <= 0) {
          chosen = w.id;
          break;
        }
      }
      mergeDemand(city.demand, chosen, share, 0);
    }
  }

  private updateTrains(dt: number) {
    for (const train of this.state.trains.values()) {
      const railway = this.state.railways.get(train.railwayId);
      if (!railway) continue;

      if (train.phase === 'dwelling') {
        train.dwellTimer -= dt;
        if (train.dwellTimer <= 0) train.phase = 'moving';
        continue;
      }

      const lineSpeed = train.speed * CONFIG.lineLevelSpeed[railway.level];
      const delta = (lineSpeed * dt) / railway.distance;
      train.progress += train.direction * delta;

      if (train.direction === 1 && train.progress >= 1) {
        train.progress = 1;
        this.serviceStation(train, railway, railway.to, railway.from);
      } else if (train.direction === -1 && train.progress <= 0) {
        train.progress = 0;
        this.serviceStation(train, railway, railway.from, railway.to);
      }
    }
  }

  /**
   * Train has arrived at `stationId` and will depart towards `continuingTo`.
   * Fares are earned per completed leg but only paid out when a group reaches
   * its final destination, so transfers carry their accrued fare with them.
   */
  private serviceStation(train: Train, railway: Railway, stationId: string, continuingTo: string) {
    train.phase = 'dwelling';
    train.dwellTimer = CONFIG.dwellTime;
    train.direction = train.direction === 1 ? -1 : 1;

    const station = this.state.cities.get(stationId)!;
    const legValue = railway.distance * CONFIG.ticketMultiplier;

    for (const [destId, group] of [...train.passengers]) {
      group.fare += group.count * legValue;

      if (destId === stationId) {
        this.state.money += group.fare;
        this.state.stats.totalRevenue += group.fare;
        this.state.stats.totalDelivered += group.count;
        const bucket = Math.floor(this.state.stats.elapsed) % 60;
        this.state.stats.recentRevenue[bucket] += group.fare;
        train.passengers.delete(destId);
        continue;
      }

      const hop = nextHop(this.state.routes, stationId, destId);
      if (hop !== continuingTo) {
        // Wrong direction from here — put them back on the platform to transfer.
        mergeDemand(station.demand, destId, group.count, group.fare);
        train.passengers.delete(destId);
      }
    }

    let onboard = 0;
    for (const [, g] of train.passengers) onboard += g.count;

    let free = train.capacity - onboard;
    for (const [destId, group] of [...station.demand]) {
      if (free <= 0.01) break;
      const hop = nextHop(this.state.routes, stationId, destId);
      if (hop !== continuingTo) continue;

      const take = Math.min(group.count, free);
      const fareShare = group.count > 0 ? (group.fare * take) / group.count : 0;
      mergeDemand(train.passengers, destId, take, fareShare);
      group.count -= take;
      group.fare -= fareShare;
      if (group.count <= 0.01) station.demand.delete(destId);
      free -= take;
      onboard += take;
    }

    train.onboard = onboard;
  }

  // --------------------------------------------------------------- reading

  networkHealth(): number {
    let load = 0;
    let n = 0;
    for (const city of this.state.cities.values()) {
      load += Math.min(1, city.waitingPassengers / city.passengerCapacity);
      n++;
    }
    return n === 0 ? 100 : Math.round(100 - (load / n) * 100);
  }

  trainsAtCity(cityId: string): number {
    const city = this.state.cities.get(cityId);
    if (!city) return 0;
    let count = 0;
    for (const railId of city.connectedRailways) {
      count += this.state.railways.get(railId)?.trainIds.length ?? 0;
    }
    return count;
  }

  snapshot(): UiSnapshot {
    const { stats } = this.state;
    const cities: CitySnapshot[] = this.state.cityOrder.map((id) => {
      const c = this.state.cities.get(id)!;
      let inbound = 0;
      for (const railId of c.connectedRailways) {
        const rail = this.state.railways.get(railId);
        if (!rail) continue;
        for (const trainId of rail.trainIds) {
          const t = this.state.trains.get(trainId)!;
          const heading = t.direction === 1 ? rail.to : rail.from;
          if (heading === id) inbound++;
        }
      }
      return {
        id: c.id,
        name: c.name,
        population: c.population,
        waiting: c.waitingPassengers,
        capacity: c.passengerCapacity,
        status: statusFor(c.waitingPassengers, c.passengerCapacity),
        railways: c.connectedRailways.length,
        trains: this.trainsAtCity(c.id),
        inbound,
      };
    });

    return {
      money: this.state.money,
      delivered: stats.totalDelivered,
      revenue: stats.totalRevenue,
      revenuePerMinute: stats.recentRevenue.reduce((a, b) => a + b, 0),
      elapsed: stats.elapsed,
      railwayCount: this.state.railways.size,
      trainCount: this.state.trains.size,
      networkHealth: this.networkHealth(),
      cities,
      railways: [...this.state.railways.values()].map((r) => ({
        id: r.id,
        from: this.state.cities.get(r.from)!.name,
        to: this.state.cities.get(r.to)!.name,
        fromId: r.from,
        toId: r.to,
        distance: r.distance,
        trains: r.trainIds.length,
        capacity: r.capacity,
        level: r.level,
        speedMultiplier: CONFIG.lineLevelSpeed[r.level],
        upgradeCost: this.lineUpgradeCost(r),
      })),
    };
  }
}

export interface CitySnapshot {
  id: string;
  name: string;
  population: number;
  waiting: number;
  capacity: number;
  status: LoadStatus;
  railways: number;
  trains: number;
  inbound: number;
}

export interface RailwaySnapshot {
  id: string;
  from: string;
  to: string;
  fromId: string;
  toId: string;
  distance: number;
  trains: number;
  capacity: number;
  level: 1 | 2 | 3;
  speedMultiplier: number;
  upgradeCost: number;
}

export interface UiSnapshot {
  money: number;
  delivered: number;
  revenue: number;
  revenuePerMinute: number;
  elapsed: number;
  railwayCount: number;
  trainCount: number;
  networkHealth: number;
  cities: CitySnapshot[];
  railways: RailwaySnapshot[];
}
