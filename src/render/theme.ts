/** Signal-lamp palette: lamp glass greens/ambers/reds against wet-slate and brass. */
export const COLORS = {
  void: '#080D0F',
  land: '#101A1E',
  landEdge: '#1A272D',
  water: '#07141A',
  waterEdge: '#123039',
  highland: '#17242A',
  grid: '#132025',

  rail: '#5A7783',
  railShadow: '#0C1417',
  railActive: '#E3A34A',

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
