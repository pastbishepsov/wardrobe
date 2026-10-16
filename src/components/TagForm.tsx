"use client";

import { Scale } from "@/components/ui";
import { CATEGORIES, COLORS, FORMALITY_LABEL, MATERIALS, PATTERNS, SEASONS, STYLE_TAGS, WARMTH_LABEL } from "@/lib/taxonomy";
import type { Category, Season } from "@/lib/types";

export interface ItemMeta {
  name: string;
  category: Category;
  subcategory: string;
  colors: string[];
  pattern: string;
  material: string;
  seasons: Season[];
  warmth: number;
  formality: number;
  style_tags: string[];
  brand: string;
  notes: string;
}

export const EMPTY_META: ItemMeta = {
  name: "",
  category: "top",
  subcategory: "",
  colors: [],
  pattern: "однотонное",
  material: "",
  seasons: [],
  warmth: 3,
  formality: 2,
  style_tags: [],
  brand: "",
  notes: "",
};

function toggle<T>(arr: T[], v: T, max = Infinity): T[] {
  if (arr.includes(v)) return arr.filter((x) => x !== v);
  if (arr.length >= max) return [...arr.slice(1), v];
  return [...arr, v];
}

export default function TagForm({ value, onChange }: { value: ItemMeta; onChange: (v: ItemMeta) => void }) {
  const set = <K extends keyof ItemMeta>(k: K, v: ItemMeta[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Название</label>
        <input className="field" value={value.name} onChange={(e) => set("name", e.target.value)} placeholder="Бежевый тренч" />
      </div>

      <div>
        <label className="label">Категория</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c.value} type="button" className={`chip ${value.category === c.value ? "chip-on" : ""}`} onClick={() => set("category", c.value)}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Тип</label>
          <input className="field" value={value.subcategory} onChange={(e) => set("subcategory", e.target.value)} placeholder="рубашка, джинсы…" />
        </div>
        <div>
          <label className="label">Бренд</label>
          <input className="field" value={value.brand} onChange={(e) => set("brand", e.target.value)} placeholder="необязательно" />
        </div>
      </div>

      <div>
        <label className="label">Цвета (до 3)</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => {
            const on = value.colors.includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                aria-label={c.label}
                title={c.label}
                onClick={() => set("colors", toggle(value.colors, c.value, 3))}
                className={`flex h-9 items-center gap-1.5 rounded-full border px-2 text-xs ${on ? "border-accent bg-accent-soft" : "border-line bg-elev"}`}
              >
                <span className="inline-block h-5 w-5 rounded-full border border-black/10" style={{ background: c.hex }} />
                {on && <span className="pr-1 font-semibold">{c.label}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">Сезоны</label>
        <div className="flex gap-2">
          {SEASONS.map((s) => (
            <button key={s.value} type="button" className={`chip flex-1 justify-center ${value.seasons.includes(s.value) ? "chip-on" : ""}`} onClick={() => set("seasons", toggle(value.seasons, s.value))}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Тёплость</label>
          <Scale value={value.warmth} onChange={(v) => set("warmth", v)} labels={WARMTH_LABEL} />
        </div>
        <div>
          <label className="label">Формальность</label>
          <Scale value={value.formality} onChange={(v) => set("formality", v)} labels={FORMALITY_LABEL} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Принт</label>
          <select className="field" value={value.pattern} onChange={(e) => set("pattern", e.target.value)}>
            {PATTERNS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Материал</label>
          <input className="field" list="materials" value={value.material} onChange={(e) => set("material", e.target.value)} placeholder="хлопок…" />
          <datalist id="materials">
            {MATERIALS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label className="label">Стиль</label>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set([...STYLE_TAGS, ...value.style_tags])).map((t) => (
            <button key={t} type="button" className={`chip ${value.style_tags.includes(t) ? "chip-on" : ""}`} onClick={() => set("style_tags", toggle(value.style_tags, t, 4))}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Заметка</label>
        <textarea className="field" rows={2} value={value.notes} onChange={(e) => set("notes", e.target.value)} placeholder="размер, где куплено, с чем носить…" />
      </div>
    </div>
  );
}
