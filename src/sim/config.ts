export const CONFIG = {
  startingMoney: 75_000,

  // Economy
  railwayBaseCost: 1_800,
  railwayCostPerUnit: 8.5,
  stationCostBase: 250,
  stationCostPerMillion: 55,
  stationCostMaxMultiplier: 2.4,
  lineUpgradeBaseCost: 3_500,
  lineUpgradeCostPerUnit: 4.2,
  continentUnlockBaseCost: 250_000,
  trainCost: 1_200,
  ticketMultiplier: 0.022,
  stationUpgradeBaseCost: 900,
  stationUpgradeCostPerMillion: 140,
  maxStationLevel: 10,

  // Expansion pressure: track + upgrades climb per continent opened, capped at 5 of 6.
  expansionCostStep: 0.22,
  expansionCostCapContinents: 5,

  // Bullet (level 3) track allowance granted per unlocked continent.
  bulletLinesPerContinent: 2,
  bulletLinesAsia: 3,

  // Trains
  trainCapacity: 90,
  trainSpeed: 62, // world units per second
  lineLevelSpeed: { 1: 1, 2: 1.45, 3: 2.25 },
  dwellTime: 1.1, // seconds stopped at a station
  railwayTrainCapacity: 4,
  railwayTrainCapacityMax: 5,

  // Passengers
  spawnInterval: 1.5, // seconds between demand pulses per city
  spawnRatePerMillion: 1.65, // passengers per second per 1M population
  /** every city except its continent's largest spawns at this fraction of full rate */
  secondarySpawnScale: 0.7,
  /** world demand climbs over the run so a maxed-out network still has pressure */
  demandGrowthPerMinute: 0.05,
  demandGrowthCap: 2.6,
  /** distance falloff for destination choice — higher means more local travel */
  gravityExponent: 1.35,

  // Overcrowding thresholds (fraction of capacity)
  warningAt: 0.7,
  criticalAt: 0.9,
  /** sim-seconds of accumulated overload before the run is lost (drains N× with N overloaded stations) */
  overloadGraceSeconds: 300,
  /** sim-seconds of pressure bled off per second while nothing is overloaded */
  overloadRecoveryRate: 2,

  // Simulation
  fixedStep: 1 / 60,
  maxStepsPerFrame: 12,
} as const;

export const SPEED_OPTIONS = [1, 2, 4] as const;
export type SpeedOption = (typeof SPEED_OPTIONS)[number];
