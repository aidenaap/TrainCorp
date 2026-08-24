export const CONFIG = {
  startingMoney: 10_000,

  // Economy
  railwayBaseCost: 250,
  railwayCostPerUnit: 7.5,
  trainCost: 1_200,
  ticketMultiplier: 0.022,

  // Trains
  trainCapacity: 90,
  trainSpeed: 62, // world units per second
  dwellTime: 1.1, // seconds stopped at a station
  railwayTrainCapacity: 4,

  // Passengers
  spawnInterval: 1.5, // seconds between demand pulses per city
  spawnRatePerMillion: 3.4, // passengers per second per 1M population
  /** distance falloff for destination choice — higher means more local travel */
  gravityExponent: 1.35,

  // Overcrowding thresholds (fraction of capacity)
  warningAt: 0.7,
  criticalAt: 0.9,

  // Simulation
  fixedStep: 1 / 60,
  maxStepsPerFrame: 12,
} as const;

export const SPEED_OPTIONS = [1, 2, 4] as const;
export type SpeedOption = (typeof SPEED_OPTIONS)[number];
