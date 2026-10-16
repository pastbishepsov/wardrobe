import type { Category, Season, Zone } from "./types";

export const CATEGORIES: { value: Category; label: string; plural: string; emoji: string }[] = [
  { value: "top", label: "Верх", plural: "Верх", emoji: "👚" },
  { value: "bottom", label: "Низ", plural: "Низ", emoji: "👖" },
  { value: "dress", label: "Платье", plural: "Платья", emoji: "👗" },
  { value: "outerwear", label: "Верхняя одежда", plural: "Верхняя одежда", emoji: "🧥" },
  { value: "shoes", label: "Обувь", plural: "Обувь", emoji: "👟" },
  { value: "bag", label: "Сумка", plural: "Сумки", emoji: "👜" },
  { value: "accessory", label: "Аксессуар", plural: "Аксессуары", emoji: "🧣" },
];

export const CATEGORY_LABEL: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
) as Record<Category, string>;

export const SEASONS: { value: Season; label: string; short: string }[] = [
  { value: "spring", label: "Весна", short: "Вес" },
  { value: "summer", label: "Лето", short: "Лет" },
  { value: "autumn", label: "Осень", short: "Осн" },
  { value: "winter", label: "Зима", short: "Зим" },
];

export const SEASON_LABEL: Record<Season, string> = Object.fromEntries(
  SEASONS.map((s) => [s.value, s.label])
) as Record<Season, string>;

export const WARMTH_LABEL: Record<number, string> = {
  1: "Очень лёгкое",
  2: "Лёгкое",
  3: "Среднее",
  4: "Тёплое",
  5: "Очень тёплое",
};

export const FORMALITY_LABEL: Record<number, string> = {
  1: "Спорт / дом",
  2: "Кэжуал",
  3: "Смарт-кэжуал",
  4: "Деловое",
  5: "Вечернее",
};

export const FORMALITY_BUCKETS: { key: string; label: string; values: number[] }[] = [
  { key: "casual", label: "Кэжуал", values: [1, 2] },
  { key: "smart", label: "Смарт", values: [3] },
  { key: "formal", label: "Деловое / вечер", values: [4, 5] },
];

export const COLORS: { value: string; label: string; hex: string }[] = [
  { value: "black", label: "Чёрный", hex: "#1a1a1a" },
  { value: "white", label: "Белый", hex: "#f7f7f5" },
  { value: "grey", label: "Серый", hex: "#9a9a9a" },
  { value: "beige", label: "Бежевый", hex: "#d9c6a5" },
  { value: "brown", label: "Коричневый", hex: "#6b4a2b" },
  { value: "navy", label: "Тёмно-синий", hex: "#1f2a5a" },
  { value: "blue", label: "Синий", hex: "#3b6fd3" },
  { value: "lightblue", label: "Голубой", hex: "#9cc6ee" },
  { value: "green", label: "Зелёный", hex: "#3e7d4f" },
  { value: "olive", label: "Оливковый", hex: "#7c7a3a" },
  { value: "yellow", label: "Жёлтый", hex: "#e9c640" },
  { value: "orange", label: "Оранжевый", hex: "#e1812f" },
  { value: "red", label: "Красный", hex: "#c62d2d" },
  { value: "burgundy", label: "Бордовый", hex: "#6e1f2e" },
  { value: "pink", label: "Розовый", hex: "#e9a3c0" },
  { value: "purple", label: "Фиолетовый", hex: "#6d4aa3" },
  { value: "gold", label: "Золотой", hex: "#c9a641" },
  { value: "silver", label: "Серебряный", hex: "#c0c4cc" },
  { value: "multicolor", label: "Разноцветный", hex: "linear-gradient(135deg,#e9a3c0,#e9c640,#3b6fd3)" },
];

export const COLOR_LABEL: Record<string, string> = Object.fromEntries(COLORS.map((c) => [c.value, c.label]));
export const COLOR_HEX: Record<string, string> = Object.fromEntries(COLORS.map((c) => [c.value, c.hex]));

export const PATTERNS = ["однотонное", "полоска", "клетка", "горох", "цветочный", "анималистичный", "принт", "лого"];
export const MATERIALS = ["хлопок", "лён", "шерсть", "кашемир", "шёлк", "вискоза", "деним", "кожа", "замша", "синтетика", "трикотаж", "атлас"];

export const STYLE_TAGS = [
  "базовое",
  "минимализм",
  "классика",
  "романтичное",
  "спорт",
  "уличный",
  "богемный",
  "вечернее",
  "офис",
  "праздничное",
  "винтаж",
];

export const OCCASIONS = ["Работа", "Встреча", "Прогулка", "Свидание", "Вечер", "Спорт", "Путешествие", "Дом"];

export const ZONES: { value: Zone; label: string; categories: Category[] }[] = [
  { value: "top", label: "Верх", categories: ["top", "dress"] },
  { value: "bottom", label: "Низ", categories: ["bottom"] },
  { value: "shoes", label: "Обувь", categories: ["shoes"] },
];

export const DEFAULT_ZONES = {
  top: { x: 0.22, y: 0.2, w: 0.56, h: 0.3 },
  bottom: { x: 0.26, y: 0.46, w: 0.48, h: 0.38 },
  shoes: { x: 0.3, y: 0.82, w: 0.4, h: 0.14 },
};

/** Which warmth level fits an average daily temperature (°C). */
export function warmthForTemp(avgC: number): number {
  if (avgC <= 0) return 5;
  if (avgC <= 8) return 4;
  if (avgC <= 15) return 3;
  if (avgC <= 22) return 2;
  return 1;
}

export function seasonForMonth(month: number): Season {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function weatherCodeSummary(code: number): string {
  if (code === 0) return "ясно";
  if (code <= 2) return "малооблачно";
  if (code === 3) return "пасмурно";
  if (code <= 48) return "туман";
  if (code <= 57) return "морось";
  if (code <= 67) return "дождь";
  if (code <= 77) return "снег";
  if (code <= 82) return "ливни";
  if (code <= 86) return "снегопад";
  return "гроза";
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}
