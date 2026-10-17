"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { Sheet, Spinner, Toast } from "@/components/ui";
import { useGestures } from "@/lib/gestures";
import { api, jsonInit, useToast } from "@/lib/hooks";
import { CATEGORIES, OCCASIONS } from "@/lib/taxonomy";
import type { Category, CollageLayoutItem, Item } from "@/lib/types";
import { imageUrl } from "@/lib/urls";

const DEFAULT_SPOT: Record<Category, { x: number; y: number; scale: number }> = {
  top: { x: 0.5, y: 0.3, scale: 1 },
  dress: { x: 0.5, y: 0.45, scale: 1.3 },
  bottom: { x: 0.5, y: 0.66, scale: 1.05 },
  outerwear: { x: 0.22, y: 0.34, scale: 1.1 },
  shoes: { x: 0.3, y: 0.9, scale: 0.6 },
  bag: { x: 0.8, y: 0.62, scale: 0.6 },
  accessory: { x: 0.8, y: 0.18, scale: 0.5 },
};

function PlacedItem({
  li,
  item,
  selected,
  canvas,
  onChange,
  onSelect,
}: {
  li: CollageLayoutItem;
  item: Item;
  selected: boolean;
  canvas: React.RefObject<HTMLDivElement | null>;
  onChange: (p: Partial<CollageLayoutItem>) => void;
  onSelect: () => void;
}) {
  const g = useGestures({
    onStart: onSelect,
    onDrag: (dx, dy) => {
      const r = canvas.current?.getBoundingClientRect();
      if (!r) return;
      onChange({ x: li.x + dx / r.width, y: li.y + dy / r.height });
    },
    onPinch: (ratio, angleDelta, dx, dy) => {
      const r = canvas.current?.getBoundingClientRect();
      if (!r) return;
      onChange({
        scale: Math.min(4, Math.max(0.2, li.scale * ratio)),
        rotation: li.rotation + angleDelta,
        x: li.x + dx / r.width,
        y: li.y + dy / r.height,
      });
    },
  });
  return (
    <div
      {...g}
      className={`absolute w-[45%] touch-none select-none ${selected ? "outline outline-2 outline-dashed outline-accent/70 rounded-lg" : ""}`}
      style={{
        left: `${li.x * 100}%`,
        top: `${li.y * 100}%`,
        transform: `translate(-50%, -50%) scale(${li.scale}) rotate(${li.rotation}deg)`,
        transformOrigin: "center",
        zIndex: li.z,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl(item.image_path)} alt={item.name} draggable={false} className="pointer-events-none w-full" />
    </div>
  );
}

export default function Collage({ items }: { items: Item[] }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<CollageLayoutItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawerCat, setDrawerCat] = useState<Category>("top");
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, showToast] = useToast();
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const zTop = () => (layout.length ? Math.max(...layout.map((l) => l.z)) + 1 : 1);

  function addItem(item: Item) {
    if (layout.some((l) => l.item_id === item.id)) {
      showToast("Уже на холсте");
      return;
    }
    const spot = DEFAULT_SPOT[item.category];
    setLayout((prev) => [...prev, { item_id: item.id, x: spot.x, y: spot.y, scale: spot.scale, rotation: 0, z: zTop() }]);
    setSelected(item.id);
  }

  const update = useCallback((id: string, p: Partial<CollageLayoutItem>) => {
    setLayout((prev) => prev.map((l) => (l.item_id === id ? { ...l, ...p } : l)));
  }, []);

  function removeSelected() {
    if (!selected) return;
    setLayout((prev) => prev.filter((l) => l.item_id !== selected));
    setSelected(null);
  }

  function bring(dir: 1 | -1) {
    if (!selected) return;
    setLayout((prev) => {
      const sorted = [...prev].sort((a, b) => a.z - b.z);
      const idx = sorted.findIndex((l) => l.item_id === selected);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= sorted.length) return prev;
      const a = sorted[idx];
      const b = sorted[swap];
      return prev.map((l) => (l.item_id === a.item_id ? { ...l, z: b.z } : l.item_id === b.item_id ? { ...l, z: a.z } : l));
    });
  }

  function shuffle() {
    const pick = (cats: Category[]) => {
      const pool = items.filter((i) => cats.includes(i.category));
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    };
    const useDress = Math.random() < 0.3;
    const first = useDress ? pick(["dress"]) ?? pick(["top"]) : pick(["top"]);
    const chosen = [first, first?.category === "dress" ? null : pick(["bottom"]), pick(["shoes"])].filter(Boolean) as Item[];
    let z = 1;
    setLayout(
      chosen.map((item) => {
        const spot = DEFAULT_SPOT[item.category];
        return { item_id: item.id, x: spot.x, y: spot.y, scale: spot.scale, rotation: 0, z: z++ };
      })
    );
    setSelected(null);
  }

  async function save() {
    if (!layout.length) return;
    setSaving(true);
    try {
      await api("/api/outfits", jsonInit("POST", {
        name: name.trim() || null,
        kind: "collage",
        item_ids: layout.map((l) => l.item_id),
        layout: { items: layout },
        occasion,
      }));
      setSaveOpen(false);
      setName("");
      setOccasion(null);
      showToast("Образ сохранён");
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Не сохранилось");
    } finally {
      setSaving(false);
    }
  }

  const drawerItems = items.filter((i) => i.category === drawerCat);
  const selectedLayout = layout.find((l) => l.item_id === selected);

  return (
    <div className="space-y-3">
      <div
        ref={canvasRef}
        className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius)] border border-line bg-[#f3eee7] touch-none"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
      >
        {layout.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <p className="display text-2xl">Пустой холст</p>
            <p className="mt-1 text-sm text-ink-soft">Выбери вещи внизу. Двигай пальцем, двумя пальцами — масштаб и поворот.</p>
          </div>
        )}
        {layout.map((li) => {
          const item = byId.get(li.item_id);
          if (!item) return null;
          return (
            <PlacedItem
              key={li.item_id}
              li={li}
              item={item}
              selected={selected === li.item_id}
              canvas={canvasRef}
              onChange={(p) => update(li.item_id, p)}
              onSelect={() => {
                setSelected(li.item_id);
                update(li.item_id, { z: zTop() });
              }}
            />
          );
        })}

        {selectedLayout && (
          <div className="absolute left-1/2 top-2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-elev/95 p-1 shadow">
            <button className="rounded-full px-2.5 py-1 text-xs font-semibold" onClick={() => update(selected!, { scale: Math.max(0.2, selectedLayout.scale * 0.9) })}>
              −
            </button>
            <button className="rounded-full px-2.5 py-1 text-xs font-semibold" onClick={() => update(selected!, { scale: Math.min(4, selectedLayout.scale * 1.1) })}>
              +
            </button>
            <button className="rounded-full px-2.5 py-1 text-xs font-semibold" onClick={() => bring(-1)}>
              Назад
            </button>
            <button className="rounded-full px-2.5 py-1 text-xs font-semibold" onClick={() => bring(1)}>
              Вперёд
            </button>
            <button className="rounded-full px-2.5 py-1 text-xs font-semibold text-danger" onClick={removeSelected}>
              Убрать
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button className="btn btn-ghost" onClick={shuffle} disabled={!items.length}>
          Случайный
        </button>
        <button className="btn btn-ghost" onClick={() => { setLayout([]); setSelected(null); }} disabled={!layout.length}>
          Очистить
        </button>
        <button className="btn btn-primary flex-1" onClick={() => setSaveOpen(true)} disabled={!layout.length}>
          Сохранить образ
        </button>
      </div>

      <div className="card p-3">
        <div className="no-scrollbar -mx-3 mb-2 flex gap-2 overflow-x-auto px-3">
          {CATEGORIES.map((c) => (
            <button key={c.value} className={`chip ${drawerCat === c.value ? "chip-on" : ""}`} onClick={() => setDrawerCat(c.value)}>
              {c.emoji} {c.plural}
            </button>
          ))}
        </div>
        {drawerItems.length ? (
          <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3">
            {drawerItems.map((item) => {
              const on = layout.some((l) => l.item_id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className={`checker h-24 w-20 shrink-0 overflow-hidden rounded-xl border ${on ? "border-accent" : "border-line"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(item.image_path)} alt={item.name} className="h-full w-full object-contain p-1" />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-ink-soft">В этой категории пока ничего нет</p>
        )}
      </div>

      <Sheet open={saveOpen} onClose={() => setSaveOpen(false)} title="Сохранить образ">
        <label className="label">Название</label>
        <input className="field mb-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="Пятница в офисе" />
        <label className="label">Повод</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {OCCASIONS.map((o) => (
            <button key={o} className={`chip ${occasion === o ? "chip-on" : ""}`} onClick={() => setOccasion(occasion === o ? null : o)}>
              {o}
            </button>
          ))}
        </div>
        <button className="btn btn-primary w-full" onClick={save} disabled={saving}>
          {saving ? <Spinner /> : "Сохранить"}
        </button>
      </Sheet>
      <Toast text={toast} />
    </div>
  );
}
