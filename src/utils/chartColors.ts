/** Validated categorical palette (fixed order — never cycled arbitrarily; see dataviz skill).
 * Passes CVD-safety checks in both light and dark modes. */
export const CATEGORICAL_PALETTE = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
];

/** Reserved for state/condition, never reused as a series identity color. */
export const STATUS_COLORS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

export const CHART_GRID_CLASS = 'stroke-slate-200 dark:stroke-slate-800';
export const CHART_AXIS_TICK = { fontSize: 12 };

export function categoricalColor(index: number): string {
  return CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length];
}
