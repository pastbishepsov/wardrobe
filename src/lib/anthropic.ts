import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { COLORS, PATTERNS } from "./taxonomy";
import type { Item, TripDayWeather, Wear } from "./types";

const FAST_MODEL = process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-5-5";
const SMART_MODEL = process.env.ANTHROPIC_MODEL_SMART || "claude-sonnet-5-5";

let client: Anthropic | null = null;
function ai(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY не задан");
  if (!client) client = new Anthropic({ timeout: 60_000, maxRetries: 2 });
  return client;
}

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// ---------- tagging ----------

const colorValues = COLORS.map((c) => c.value) as [string, ...string[]];
const patternValues = PATTERNS as unknown as [string, ...string[]];

const TagSchema = z.object({
  name: z.string().describe("Короткое название вещи по-русски, 2–4 слова: «Бежевый тренч», «Белая футболка оверсайз»"),
  category: z.enum(["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"]),
  subcategory: z
    .string()
    .describe("Тип вещи по-русски одним-двумя словами: футболка, рубашка, свитер, джинсы, юбка, кроссовки, лоферы, пальто…"),
  colors: z.array(z.enum(colorValues)).describe("1–3 основных цвета, первый — доминирующий"),
  pattern: z.enum(patternValues),
  material: z.string().describe("Вероятный материал по-русски (хлопок, шерсть, деним…) или пустая строка"),
  seasons: z.array(z.enum(["spring", "summer", "autumn", "winter"])).describe("Сезоны, когда вещь уместна; минимум один"),
  warmth: z.number().int().describe("Тёплость 1–5: 1 очень лёгкое, 3 среднее, 5 очень тёплое"),
  formality: z.number().int().describe("Формальность 1–5: 1 спорт/дом, 2 кэжуал, 3 смарт-кэжуал, 4 деловое, 5 вечернее"),
  style_tags: z.array(z.string()).describe("До 4 стилевых тегов по-русски: базовое, классика, спорт, романтичное, уличный…"),
});

export type ItemTags = z.infer<typeof TagSchema>;

export async function tagItemImage(imageBase64: string, mediaType: "image/png" | "image/jpeg" | "image/webp", hint?: string) {
  const message = await ai().messages.parse({
    model: FAST_MODEL,
    max_tokens: 800,
    output_config: { effort: "low", format: zodOutputFormat(TagSchema) },
    system:
      "Ты помощник для каталога личного женского гардероба. По фото вещи (фон уже удалён) заполни карточку точно и без фантазий. Название и теги — по-русски.",
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: hint ? `Подсказка от владельца: ${hint}` : "Опиши эту вещь." },
        ],
      },
    ],
  });
  const tags = message.parsed_output;
  if (!tags) throw new Error("Модель не вернула теги");
  return normalizeTags(tags);
}

function normalizeTags(t: ItemTags): ItemTags {
  const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n || 3)));
  return {
    ...t,
    name: t.name.trim().slice(0, 60) || "Новая вещь",
    colors: t.colors.length ? t.colors.slice(0, 3) : ["multicolor"],
    seasons: t.seasons.length ? t.seasons : ["spring", "autumn"],
    warmth: clamp(t.warmth),
    formality: clamp(t.formality),
    style_tags: t.style_tags.slice(0, 4),
  };
}

// ---------- inventory description shared by gaps & capsule ----------

export function describeItem(i: Item): string {
  return `${i.id} | ${i.name} | ${i.category}${i.subcategory ? "/" + i.subcategory : ""} | цвета: ${i.colors.join(",")} | сезоны: ${i.seasons.join(",")} | тёплость ${i.warmth} | формальность ${i.formality}${i.style_tags.length ? " | " + i.style_tags.join(",") : ""}`;
}

// ---------- gap analysis ----------

const GapSchema = z.object({
  summary: z.string().describe("2–3 предложения о гардеробе в целом: сильные стороны и главная проблема"),
  gaps: z
    .array(
      z.object({
        title: z.string().describe("Что докупить, коротко: «Тёмные прямые брюки»"),
        why: z.string().describe("Почему именно это: какая дыра закрывается"),
        unlocks: z.array(z.string()).describe("2–4 конкретных образа из существующих вещей, которые станут возможны"),
        look_for: z.string().describe("На что смотреть при покупке: крой, цвет, материал"),
      })
    )
    .describe("3–6 покупок в порядке приоритета"),
  quick_wins: z.array(z.string()).describe("2–4 сочетания из уже имеющихся вещей, которые владелица, вероятно, не пробовала"),
  dead_weight: z
    .array(z.object({ item_id: z.string(), reason: z.string() }))
    .describe("Вещи, которые почти ни с чем не сочетаются или дублируют другие; item_id строго из списка"),
});

export async function gapAdvice(items: Item[], matrixText: string, wears: Wear[]) {
  const wearCount = new Map<string, number>();
  for (const w of wears) for (const id of w.item_ids) wearCount.set(id, (wearCount.get(id) ?? 0) + 1);
  const inventory = items
    .map((i) => `${describeItem(i)} | надевалась ${wearCount.get(i.id) ?? 0} раз за год`)
    .join("\n");

  const message = await ai().messages.parse({
    model: SMART_MODEL,
    max_tokens: 3000,
    output_config: { effort: "medium", format: zodOutputFormat(GapSchema) },
    system:
      "Ты стилист, который анализирует личный женский гардероб. Рассуждай практично: сочетаемость, базовые вещи, сезонность, формальность. Отвечай по-русски, без воды. Ссылайся на вещи по названиям из списка. В dead_weight используй только item_id из списка.",
    messages: [
      {
        role: "user",
        content: `Гардероб (id | название | категория | цвета | сезоны | тёплость | формальность | теги | носка):\n${inventory}\n\nМатрица покрытия (сколько вещей на категорию × сезон × формальность):\n${matrixText}\n\nСкажи, чего не хватает, какие сочетания можно собрать уже сейчас и что висит мёртвым грузом.`,
      },
    ],
  });
  const out = message.parsed_output;
  if (!out) throw new Error("Модель не вернула анализ");
  const known = new Set(items.map((i) => i.id));
  out.dead_weight = out.dead_weight.filter((d) => known.has(d.item_id));
  return out;
}

// ---------- capsule for a trip ----------

const CapsuleSchema = z.object({
  items: z.array(z.string()).describe("item_id всех вещей, которые брать; строго из списка кандидатов"),
  days: z
    .array(
      z.object({
        date: z.string().describe("YYYY-MM-DD"),
        item_ids: z.array(z.string()).describe("Образ дня: item_id из списка items выше"),
        note: z.string().describe("Короткий комментарий: под что собран образ и почему"),
      })
    )
    .describe("По одному образу на каждый день поездки"),
  notes: z.array(z.string()).describe("2–4 практических совета по сборам под эту погоду и программу"),
  missing: z.array(z.string()).describe("Чего в гардеробе нет, а для поездки стоило бы взять/купить; пустой массив, если всё есть"),
});

export async function capsulePlan(input: {
  city: string;
  startDate: string;
  endDate: string;
  purpose: string;
  activities: string[];
  weather: TripDayWeather[];
  weatherSource: "forecast" | "archive";
  candidates: Item[];
}) {
  const weatherText = input.weather
    .map((d) => `${d.date}: ${Math.round(d.tmin)}…${Math.round(d.tmax)}°C, ${d.summary}, осадки ${Math.round(d.rain)}${input.weatherSource === "forecast" ? "%" : " мм"}`)
    .join("\n");
  const inventory = input.candidates.map(describeItem).join("\n");
  const purposeLabel: Record<string, string> = {
    leisure: "отпуск / отдых",
    work: "рабочая поездка",
    mixed: "работа + отдых",
  };

  const message = await ai().messages.parse({
    model: SMART_MODEL,
    max_tokens: 4000,
    output_config: { effort: "medium", format: zodOutputFormat(CapsuleSchema) },
    system:
      "Ты стилист, собирающий капсулу на поездку из вещей, которые уже есть. Принципы: минимум вещей — максимум сочетаний, каждая вещь работает минимум в двух образах, слои под перепады температуры, обувь — максимум 2–3 пары. Используй только item_id из списка кандидатов. Отвечай по-русски.",
    messages: [
      {
        role: "user",
        content: `Поездка: ${input.city}, ${input.startDate} — ${input.endDate}. Формат: ${purposeLabel[input.purpose] ?? input.purpose}. Программа: ${input.activities.join(", ") || "не указана"}.\n\nПогода (${input.weatherSource === "forecast" ? "прогноз" : "по прошлому году, ориентировочно"}):\n${weatherText}\n\nКандидаты (id | название | категория | цвета | сезоны | тёплость | формальность | теги):\n${inventory}\n\nСобери капсулу и образ на каждый день.`,
      },
    ],
  });
  const out = message.parsed_output;
  if (!out) throw new Error("Модель не вернула план");
  const known = new Set(input.candidates.map((i) => i.id));
  out.items = out.items.filter((id) => known.has(id));
  out.days = out.days.map((d) => ({ ...d, item_ids: d.item_ids.filter((id) => known.has(id)) }));
  for (const d of out.days) for (const id of d.item_ids) if (!out.items.includes(id)) out.items.push(id);
  return out;
}
