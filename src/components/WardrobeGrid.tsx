"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ItemCard from "@/components/ItemCard";
import { EmptyState } from "@/components/ui";
import { CATEGORIES, COLORS, SEASONS, plural } from "@/lib/taxonomy";
import type { Category, Item, Season } from "@/lib/types";

export default function WardrobeGrid({ items }: { items: Item[] }) {
  const [category, setCategory] = useState<Category | "all">("all");
  const [season, setSeason] = useState<Season | "all">("all");
  const [color, setColor] = useState<string | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (category !== "all" && i.category !== category) return false;
      if (season !== "all" && !i.seasons.includes(season)) return false;
      if (color !== "all" && !i.colors.includes(color)) return false;
      if (q) {
        const hay = [i.name, i.subcategory, i.brand, i.material, ...i.style_tags].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, category, season, color, query]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.category, (m.get(i.category) ?? 0) + 1);
    return m;
  }, [items]);

  if (!items.length) {
    return (
      <EmptyState
        title="Пока пусто"
        text="Добавь первую вещь: сфотографируй её на любом фоне, фон уберётся сам."
        action={
          <Link href="/wardrobe/new" className="btn btn-primary">
            Добавить вещь
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <input
        className="field mb-3"
        placeholder="Поиск: название, бренд, тег…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4">
        <button className={`chip ${category === "all" ? "chip-on" : ""}`} onClick={() => setCategory("all")}>
          Все · {items.length}
        </button>
        {CATEGORIES.filter((c) => counts.get(c.value)).map((c) => (
          <button key={c.value} className={`chip ${category === c.value ? "chip-on" : ""}`} onClick={() => setCategory(c.value)}>
            {c.plural} · {counts.get(c.value)}
          </button>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4">
        <button className={`chip ${season === "all" ? "chip-on" : ""}`} onClick={() => setSeason("all")}>
          Любой сезон
        </button>
        {SEASONS.map((s) => (
          <button key={s.value} className={`chip ${season === s.value ? "chip-on" : ""}`} onClick={() => setSeason(s.value)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        <button className={`chip ${color === "all" ? "chip-on" : ""}`} onClick={() => setColor("all")}>
          Любой цвет
        </button>
        {COLORS.map((c) => (
          <button
            key={c.value}
            aria-label={c.label}
            title={c.label}
            onClick={() => setColor(color === c.value ? "all" : c.value)}
            className={`h-7 w-7 shrink-0 rounded-full border-2 ${color === c.value ? "border-accent" : "border-line"}`}
            style={{ background: c.hex }}
          />
        ))}
      </div>

      <p className="mb-2 text-xs text-ink-soft">{plural(filtered.length, "вещь", "вещи", "вещей")}</p>
      <div className="grid grid-cols-3 gap-3">
        {filtered.map((item) => (
          <ItemCard key={item.id} item={item} href={`/wardrobe/${item.id}`} />
        ))}
      </div>
    </div>
  );
}
