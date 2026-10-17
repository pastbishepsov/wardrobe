"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import OutfitThumb from "@/components/OutfitThumb";
import { EmptyState, Sheet, Spinner, Toast } from "@/components/ui";
import { localDateIso } from "@/lib/dates";
import { api, jsonInit, useToast } from "@/lib/hooks";
import type { Item, Outfit } from "@/lib/types";
import { imageUrl } from "@/lib/urls";

export default function OutfitsList({ outfits, items, wornCounts }: { outfits: Outfit[]; items: Item[]; wornCounts: Record<string, number> }) {
  const router = useRouter();
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const [open, setOpen] = useState<Outfit | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  async function wear(o: Outfit) {
    setBusy("wear");
    try {
      await api("/api/wears", jsonInit("POST", { outfit_id: o.id, item_ids: o.item_ids, worn_on: localDateIso() }));
      showToast("Отмечено на сегодня");
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  async function remove(o: Outfit) {
    if (!confirm("Удалить образ?")) return;
    setBusy("delete");
    try {
      await api(`/api/outfits/${o.id}`, { method: "DELETE" });
      setOpen(null);
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  if (!outfits.length) {
    return <EmptyState title="Образов пока нет" text="Собери первый в конструкторе или в примерке — он появится здесь." />;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {outfits.map((o) => (
          <button key={o.id} className="text-left active:opacity-80" onClick={() => setOpen(o)}>
            <OutfitThumb outfit={o} items={byId} />
            <div className="mt-1.5 flex items-center justify-between px-0.5">
              <p className="truncate text-xs font-semibold">{o.name || o.occasion || (o.kind === "tryon" ? "Из примерки" : "Образ")}</p>
              {wornCounts[o.id] ? <span className="text-[11px] text-ink-soft">×{wornCounts[o.id]}</span> : null}
            </div>
          </button>
        ))}
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name || open?.occasion || "Образ"}>
        {open && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {open.item_ids.map((id) => {
                const it = byId.get(id);
                if (!it) return null;
                return (
                  <div key={id} className="flex items-center gap-2 rounded-full border border-line bg-bg py-1 pl-1 pr-3 text-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(it.image_path)} alt="" className="h-8 w-8 rounded-full object-contain" />
                    {it.name}
                  </div>
                );
              })}
            </div>
            <p className="mb-4 text-xs text-ink-soft">
              {open.kind === "tryon" ? "Собран в примерке" : "Собран в конструкторе"} · {new Date(open.created_at).toLocaleDateString("ru-RU")}
              {wornCounts[open.id] ? ` · надевался ${wornCounts[open.id]} раз` : ""}
            </p>
            <div className="flex gap-2">
              <button className="btn btn-ghost text-danger" onClick={() => remove(open)} disabled={busy !== null}>
                {busy === "delete" ? <Spinner /> : "Удалить"}
              </button>
              <button className="btn btn-primary flex-1" onClick={() => wear(open)} disabled={busy !== null}>
                {busy === "wear" ? <Spinner /> : "Надела сегодня"}
              </button>
            </div>
          </>
        )}
      </Sheet>
      <Toast text={toast} />
    </div>
  );
}
