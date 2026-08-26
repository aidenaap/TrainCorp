/**
 * Signal-lamp palette (brass rails, lamp-glass status colours) over a true
 * cartographic base: blue ocean, olive land, pale rock and snow on the ranges.
 * The map layers stay desaturated so brass track and status lamps still read
 * as the brightest things on screen.
 */
export const COLORS = {
  void: '#04121C',

  // ---- ocean
  water: '#0F3A58',
  waterDeep: '#0A2A43',
  waterShallow: '#1B5C82',
  /** Continental shelf halo painted just outside every coastline. */
  shelf: 'rgba(92,168,205,0.16)',
  waterEdge: '#2C7A9E',

  // ---- land
  land: '#43533A',
  landLow: '#3A4832',
  landHigh: '#586347',
  landEdge: '#0A2233',
  coast: '#A8BC8C',
  ice: '#4C626F',
  iceHigh: '#5A7280',
  iceEdge: '#9FB8C6',

  // ---- relief
  ridgeShadow: 'rgba(10,18,10,0.45)',
  ridgeLow: '#6B7150',
  ridgeHigh: '#A79B72',
  ridgeSnow: '#EDF1EA',
  /** Kept for backwards compatibility with older map code. */
  highland: '#6B7150',

  grid: 'rgba(150,200,225,0.10)',
  gridMajor: 'rgba(150,200,225,0.18)',

  rail: '#9DB2BC',
  railShadow: '#0B1B22',
  railActive: '#F0B45B',

  brass: '#E3A34A',
  brassDim: '#8C6630',
  paper: '#DCE6E9',
  muted: '#7C939C',

  healthy: '#5FBF8A',
  warning: '#F0C24C',
  critical: '#EE8A3C',
  overloaded: '#E05C4B',

  preview: '#7FD4E8',
} as const;

export const STATUS_COLOR = {
  healthy: COLORS.healthy,
  warning: COLORS.warning,
  critical: COLORS.critical,
  overloaded: COLORS.overloaded,
} as const;