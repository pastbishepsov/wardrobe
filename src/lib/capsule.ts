import { seasonForMonth, warmthForTemp } from "./taxonomy";
import type { Item, TripDayWeather, TripPlan } from "./types";

export interface TripNeeds {
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  warmth: number; // needed warmth level for the average day
  coldestWarmth: number;
  season: ReturnType<typeof seasonForMonth>;
  rainy: boolean;
  days: number;
}

export function tripNeeds(weather: TripDayWeather[], startDate: string, source: "forecast" | "archive"): TripNeeds {
  const avgs = weather.map((d) => (d.tmin + d.tmax) / 2);
  const avgTemp = avgs.reduce((a, b) => a + b, 0) / Math.max(1, avgs.length);
  const minTemp = Math.min(...weather.map((d) => d.tmin));
  const maxTemp = Math.max(...weather.map((d) => d.tmax));
  const rainy = source === "forecast" ? weather.some((d) => d.rain >= 50) : weather.filter((d) => d.rain >= 3).length >= Math.ceil(weather.length / 3);
  return {
    avgTemp,
    minTemp,
    maxTemp,
    warmth: warmthForTemp(avgTemp),
    coldestWarmth: warmthForTemp(minTemp + 3),
    season: seasonForMonth(Number(startDate.slice(5, 7))),
    rainy,
    days: Math.max(1, weather.length),
  };
}

/** Pre-filter the wardrobe so the model (or the fallback) only sees things that make sense for the weather. */
export function candidateItems(items: Item[], needs: TripNeeds, purpose: string): Item[] {
  const minFormality = purpose === "work" ? 3 : 1;
  const maxFormality = purpose === "leisure" ? 4 : 5;
  return items.filter((i) => {
    if (i.formality < minFormality - 1 || i.formality > maxFormality) return false;
    const warmthOk = i.category === "outerwear" ? i.warmth >= needs.coldestWarmth - 1 : Math.abs(i.warmth - needs.warmth) <= 1;
    const seasonOk = i.seasons.includes(needs.season) || i.seasons.length === 0;
    if (i.category === "accessory" || i.category === "bag") return seasonOk || warmthOk;
    return warmthOk && (seasonOk || Math.abs(i.warmth - needs.warmth) === 0);
  });
}

/** Rule-based capsule when no AI key is configured. */
export function fallbackPlan(candidates: Item[], weather: TripDayWeather[], needs: TripNeeds): TripPlan {
  const byCat = (c: Item["category"]) => candidates.filter((i) => i.category === c);
  const take = <T,>(arr: T[], n: number) => arr.slice(0, Math.max(0, n));
  const days = needs.days;
  const tops = take(byCat("top"), Math.min(days, 5));
  const bottoms = take(byCat("bottom"), Math.min(Math.ceil(days / 2), 3));
  const dresses = take(byCat("dress"), days >= 3 ? 2 : 1);
  const shoes = take(byCat("shoes"), 2);
  const outer = needs.coldestWarmth >= 3 || needs.rainy ? take(byCat("outerwear"), 1) : [];
  const bags = take(byCat("bag"), 1);
  const acc = take(byCat("accessory"), 2);
  const items = [...tops, ...bottoms, ...dresses, ...shoes, ...outer, ...bags, ...acc];

  const plan: TripPlan["days"] = weather.map((d, idx) => {
    const ids: string[] = [];
    const useDress = dresses.length > 0 && idx % 3 === 2;
    if (useDress) ids.push(dresses[idx % dresses.length].id);
    else {
      if (tops.length) ids.push(tops[idx % tops.length].id);
      if (bottoms.length) ids.push(bottoms[idx % bottoms.length].id);
    }
    if (shoes.length) ids.push(shoes[idx % shoes.length].id);
    if (outer.length && (d.tmin + d.tmax) / 2 <= 15) ids.push(outer[0].id);
    return { date: d.date, item_ids: ids, note: `${Math.round(d.tmin)}…${Math.round(d.tmax)}°C, ${d.summary}` };
  });

  const notes = [
    `В среднем ${Math.round(needs.avgTemp)}°C, от ${Math.round(needs.minTemp)} до ${Math.round(needs.maxTemp)} — собирай слоями.`,
    needs.rainy ? "По прогнозу дожди: непромокаемая обувь и зонт." : "Серьёзных осадков не ожидается.",
    "Каждая вещь должна сочетаться минимум с двумя другими из списка.",
  ];
  const missing: string[] = [];
  if (!shoes.length) missing.push("Нет подходящей обуви под эту погоду");
  if (needs.coldestWarmth >= 3 && !outer.length) missing.push("Нет верхней одежды под холодные дни");
  if (!tops.length && !dresses.length) missing.push("Нет верха/платьев под этот сезон");
  return { items: items.map((i) => i.id), days: plan, notes, missing };
}
