export interface SizeRow {
  size: string;
  bust: [number, number]; // cm
  waist: [number, number];
  hip: [number, number];
  /** reference height range this size's garment length is cut for (cm) —
   *  not a sizing criterion, only used to flag a length-fit note */
  height: [number, number];
}

/** FELIXXII size chart (cm) */
export const SIZE_CHART: SizeRow[] = [
  { size: "S", bust: [78, 84], waist: [60, 66], hip: [84, 90], height: [155, 162] },
  { size: "M", bust: [85, 90], waist: [67, 72], hip: [91, 96], height: [157, 164] },
  { size: "L", bust: [91, 97], waist: [73, 79], hip: [97, 103], height: [159, 166] },
  { size: "XL", bust: [98, 104], waist: [80, 86], hip: [104, 110], height: [161, 168] },
];

export interface Measurements {
  bust: number;
  waist: number;
  hip: number;
  height: number;
  weight: number;
}

const mid = (r: [number, number]) => (r[0] + r[1]) / 2;
const inRange = (v: number, r: [number, number]) => v >= r[0] && v <= r[1];

/**
 * Recommend the best size for a set of measurements.
 * Returns the recommended size + a confidence + per-metric fit notes.
 */
export function recommendSize(m: Measurements, availableSizes: string[]) {
  const rows = SIZE_CHART.filter((r) => availableSizes.includes(r.size));
  if (!rows.length) return null;

  // score each size by summed normalized distance from the row midpoints
  const scored = rows.map((r) => {
    const dBust = Math.abs(m.bust - mid(r.bust));
    const dWaist = Math.abs(m.waist - mid(r.waist));
    const dHip = Math.abs(m.hip - mid(r.hip));
    const exact = [inRange(m.bust, r.bust), inRange(m.waist, r.waist), inRange(m.hip, r.hip)].filter(Boolean).length;
    return { size: r.size, dist: dBust + dWaist + dHip, exact, row: r };
  });

  scored.sort((a, b) => b.exact - a.exact || a.dist - b.dist);
  const best = scored[0];
  const confidence = best.exact === 3 ? "cao" : best.exact >= 1 ? "khá" : "tương đối";

  const notes: string[] = [];
  const note = (label: string, v: number, r: [number, number]) => {
    if (v < r[0]) notes.push(`${label} nhỏ hơn chuẩn size — sẽ rộng nhẹ`);
    else if (v > r[1]) notes.push(`${label} lớn hơn chuẩn size — sẽ ôm hơn`);
  };
  note("Ngực", m.bust, best.row.bust);
  note("Eo", m.waist, best.row.waist);
  note("Hông", m.hip, best.row.hip);

  if (m.height > best.row.height[1]) {
    notes.push("Với chiều cao của bạn, đầm có thể ngắn hơn dự kiến");
  } else if (m.height < best.row.height[0]) {
    notes.push("Với chiều cao của bạn, đầm có thể dài hơn dự kiến");
  }

  return { size: best.size, confidence, notes };
}
