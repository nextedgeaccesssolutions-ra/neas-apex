export type PieItem = {
  key: string;
  label: string;
  value: number;
};

export type PieSlice = PieItem & {
  share: number;
  startAngle: number;
  endAngle: number;
};

/**
 * Convert positive finite values into normalized donut slices.
 * The sweep begins at -90 degrees so the first slice starts at twelve o'clock.
 * Invalid, zero, and negative values are ignored rather than rendered as
 * misleading chart segments.
 */
export function pieSlices(items: readonly PieItem[]): PieSlice[] {
  const valid = items.filter(
    (item) => Number.isFinite(item.value) && item.value > 0,
  );
  const total = valid.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) return [];

  let angle = -90;

  return valid.map((item) => {
    const share = item.value / total;
    const startAngle = angle;
    angle += share * 360;

    return {
      ...item,
      share,
      startAngle,
      endAngle: angle,
    };
  });
}
