"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TagForm, { type ItemMeta } from "@/components/TagForm";
import { Spinner, Toast } from "@/components/ui";
import { api, jsonInit, useToast } from "@/lib/hooks";
import type { Item } from "@/lib/types";
import { imageUrl } from "@/lib/urls";

export default function ItemEditor({ item, wornCount, lastWorn }: { item: Item; wornCount: number; lastWorn: string | null }) {
  const router = useRouter();
  const [meta, setMeta] = useState<ItemMeta>({
    name: item.name,
    category: item.category,
    subcategory: item.subcategory ?? "",
    colors: item.colors,
    pattern: item.pattern ?? "однотонное",
    material: item.material ?? "",
    seasons: item.seasons,
    warmth: item.warmth,
    formality: item.formality,
    style_tags: item.style_tags,
    brand: item.brand ?? "",
    notes: item.notes ?? "",
  });
  const [busy, setBusy] = useState<"save" | "delete" | "wear" | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [toast, showToast] = useToast();

  async function save() {
    setBusy("save");
    try {
      await api(`/api/items/${item.id}`, jsonInit("PATCH", {
        ...meta,
        subcategory: meta.subcategory || null,
        material: meta.material || null,
        brand: meta.brand || null,
        notes: meta.notes || null,
      }));
      showToast("Сохранено");
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Удалить вещь насовсем?")) return;
    setBusy("delete");
    try {
      await api(`/api/items/${item.id}`, { method: "DELETE" });
      router.replace("/wardrobe");
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка");
      setBusy(null);
    }
  }

  async function wearToday() {
    setBusy("wear");
    try {
      await api("/api/wears", jsonInit("POST", { item_ids: [item.id] }));
      showToast("Отмечено на сегодня");
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="checker relative aspect-[4/5] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={showOriginal && item.original_path ? imageUrl(item.original_path) : imageUrl(item.image_path)} alt={item.name} className="h-full w-full object-contain p-3" />
          {item.original_path && (
            <button
              className="absolute right-3 top-3 rounded-full bg-elev/90 px-3 py-1 text-xs font-semibold shadow"
              onPointerDown={() => setShowOriginal(true)}
              onPointerUp={() => setShowOriginal(false)}
              onPointerLeave={() => setShowOriginal(false)}
            >
              Оригинал
            </button>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-xs text-ink-soft">
          <span>
            Надевалась {wornCount} раз{lastWorn ? ` · последний раз ${new Date(lastWorn).toLocaleDateString("ru-RU")}` : ""}
          </span>
          <button className="btn btn-soft !py-1.5" onClick={wearToday} disabled={busy !== null}>
            {busy === "wear" ? <Spinner /> : "Надела сегодня"}
          </button>
        </div>
      </div>

      <TagForm value={meta} onChange={setMeta} />

      <div className="sticky bottom-20 z-10 flex gap-2 rounded-full bg-bg/90 p-1 backdrop-blur">
        <button className="btn btn-ghost text-danger" onClick={remove} disabled={busy !== null}>
          {busy === "delete" ? <Spinner /> : "Удалить"}
        </button>
        <button className="btn btn-primary flex-1" onClick={save} disabled={busy !== null}>
          {busy === "save" ? <Spinner /> : "Сохранить"}
        </button>
      </div>
      <Toast text={toast} />
    </div>
  );
}
