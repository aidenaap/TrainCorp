export type CityTier = 'small' | 'medium' | 'large';
export type ContinentId =
  | 'north-america'
  | 'south-america'
  | 'europe'
  | 'africa'
  | 'asia'
  | 'oceania';

export type LoadStatus = 'healthy' | 'warning' | 'critical' | 'overloaded';

/** Aggregated group of passengers sharing a destination. `fare` is money already earned in transit. */
export interface Demand {
  count: number;
  fare: number;
}

export interface City {
  id: string;
  name: string;
  x: number;
  y: number;
  population: number;
  tier: CityTier;
  continent: ContinentId;

  passengerCapacity: number;
  stationLevel: number;
  stationRevenue: number;
  /** destinationCityId -> aggregated demand waiting here */
  demand: Map<string, Demand>;
  waitingPassengers: number;

  connectedRailways: string[];
  /** seconds until next demand spawn */
  spawnTimer: number;
}

export interface Railway {
  id: string;
  from: string;
  to: string;
  distance: number;
  /** max trains allowed on this line */
  capacity: number;
  constructionCost: number;
  level: 1 | 2 | 3;
  trainIds: string[];
}

export type TrainPhase = 'moving' | 'dwelling';

export interface Train {
  id: string;
  railwayId: string;
  capacity: number;
  speed: number;
  /** 0..1 along the railway, always measured from `from` to `to` */
  progress: number;
  /** 1 = from -> to, -1 = to -> from */
  direction: 1 | -1;
  phase: TrainPhase;
  dwellTimer: number;
  passengers: Map<string, Demand>;
  onboard: number;
}

export interface Stats {
  totalDelivered: number;
  totalRevenue: number;
  totalSpent: number;
  elapsed: number;
  /** rolling revenue over the last 60s of sim time */
  recentRevenue: number[];
}

export interface BuildResult {
  ok: boolean;
  error?: string;
}

export type GameOutcome = 'playing' | 'won' | 'lost';

export interface GameState {
  money: number;
  cities: Map<string, City>;
  railways: Map<string, Railway>;
  trains: Map<string, Train>;
  cityOrder: string[];
  stats: Stats;
  /** all-pairs next-hop routing table, rebuilt when the network changes */
  routes: Map<string, Map<string, string>>;
  unlockedContinents: Set<ContinentId>;
  startingContinent: ContinentId | null;
  outcome: GameOutcome;
  /** accumulated overload pressure in sim-seconds */
  overloadTimer: number;
  overloadedCount: number;
}
