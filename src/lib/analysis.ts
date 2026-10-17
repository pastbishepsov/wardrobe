import { CATEGORY_LABEL, FORMALITY_BUCKETS, SEASONS, SEASON_LABEL } from "./taxonomy";
import type { Category, Item, Season, Wear } from "./types";

export const MATRIX_CATEGORIES: Category[] = ["top", "bottom", "dress", "outerwear", "shoes"];

export interface MatrixCell {
  category: Category;
  season: Season;
  bucket: string;
  count: number;
  items: string[];
}

export interface CoverageMatrix {
  cells: MatrixCell[];
  /** cells with zero items where you would expect at least one */
  holes: MatrixCell[];
}

export function buildMatrix(items: Item[]): CoverageMatrix {
  const cells: MatrixCell[] = [];
  for (const category of MATRIX_CATEGORIES) {
    for (const season of SEASONS) {
      for (const bucket of FORMALITY_BUCKETS) {
        const matching = items.filter(
          (i) =>
            i.category === category &&
            // no seasons chosen = fits any season (same rule as the capsule)
            (i.seasons.length === 0 || i.seasons.includes(season.value)) &&
            bucket.values.includes(i.formality)
        );
        cells.push({
          category,
          season: season.value,
          bucket: bucket.key,
          count: matching.length,
          items: matching.map((i) => i.id),
        });
      }
    }
  }
  // Outerwear in summer and dresses at the sport level are not holes; everything else empty is.
  const holes = cells.filter((c) => {
    if (c.count > 0) return false;
    if (c.category === "outerwear" && c.season === "summer") return false;
    if (c.category === "dress" && c.bucket === "casual") return false;
    return true;
  });
  return { cells, holes };
}

export function matrixToText(m: CoverageMatrix): string {
  const lines: string[] = [];
  for (const category of MATRIX_CATEGORIES) {
    const row = SEASONS.map((s) => {
      const parts = FORMALITY_BUCKETS.map((b) => {
        const c = m.cells.find((x) => x.category === category && x.season === s.value && x.bucket === b.key);
        return `${b.label}: ${c?.count ?? 0}`;
      });
      return `${SEASON_LABEL[s.value]} (${parts.join(", ")})`;
    });
    lines.push(`${CATEGORY_LABEL[category]}: ${row.join("; ")}`);
  }
  return lines.join("\n");
}

export interface WearStats {
  counts: Map<string, number>;
  lastWorn: Map<string, string>;
  neverWorn: Item[];
  stale: Item[]; // not worn in 90+ days (and exists for at least 30 days)
  mostWorn: { item: Item; count: number }[];
}

export function wearStats(items: Item[], wears: Wear[]): WearStats {
  const counts = new Map<string, number>();
  const lastWorn = new Map<string, string>();
  for (const w of wears) {
    for (const id of w.item_ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      const prev = lastWorn.get(id);
      if (!prev || w.worn_on > prev) lastWorn.set(id, w.worn_on);
    }
  }
  const now = Date.now();
  const days = (iso: string) => (now - Date.parse(iso)) / 86_400_000;
  const neverWorn = items.filter((i) => !counts.has(i.id) && days(i.created_at) >= 30);
  const stale = items.filter((i) => {
    const last = lastWorn.get(i.id);
    return last ? days(last) >= 90 : false;
  });
  const mostWorn = items
    .map((item) => ({ item, count: counts.get(item.id) ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  return { counts, lastWorn, neverWorn, stale, mostWorn };
}

/** How many distinct top+bottom / dress combinations the wardrobe allows (rough, by formality closeness). */
export function combinationCount(items: Item[]): number {
  const tops = items.filter((i) => i.category === "top");
  const bottoms = items.filter((i) => i.category === "bottom");
  const dresses = items.filter((i) => i.category === "dress");
  let n = dresses.length;
  for (const t of tops) for (const b of bottoms) if (Math.abs(t.formality - b.formality) <= 1) n++;
  return n;
}
