"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner, Toast } from "@/components/ui";
import { api, useToast } from "@/lib/hooks";
import type { GapAdvice, Item } from "@/lib/types";
import { imageUrl } from "@/lib/urls";

export default function GapsPanel({
  advice,
  createdAt,
  items,
  aiEnabled,
}: {
  advice: GapAdvice | null;
  createdAt: string | null;
  items: Item[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();
  const byId = new Map(items.map((i) => [i.id, i]));

  async function refresh() {
    setBusy(true);
    try {
      await api("/api/gaps", { method: "POST" });
      showToast("Советы обновлены");
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Чего не хватает</h2>
        {aiEnabled && (
          <button className="btn btn-soft" onClick={refresh} disabled={busy || items.length < 5}>
            {busy ? <Spinner /> : advice ? "Обновить" : "Проанализировать"}
          </button>
        )}
      </div>
      {!aiEnabled && <p className="text-sm text-ink-soft">Советы от модели выключены (нет ANTHROPIC_API_KEY) — ниже только матрица покрытия.</p>}
      {aiEnabled && items.length < 5 && <p className="text-sm text-ink-soft">Добавь хотя бы 5 вещей — тогда будет что анализировать.</p>}
      {busy && <p className="text-sm text-ink-soft">Смотрю весь гардероб, это занимает примерно полминуты…</p>}
      {advice && !busy && (
        <div className="space-y-3 fade-up">
          <p className="text-xs text-ink-soft">Анализ от {createdAt ? new Date(createdAt).toLocaleDateString("ru-RU") : ""}</p>
          <p className="card p-4 text-sm leading-relaxed">{advice.summary}</p>
          <ol className="space-y-2">
            {advice.gaps.map((g, i) => (
              <li key={i} className="card p-4">
                <p className="font-semibold">
                  {i + 1}. {g.title}
                </p>
                <p className="mt-1 text-sm text-ink-soft">{g.why}</p>
                {g.unlocks.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {g.unlocks.map((u, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-accent">+</span>
                        {u}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-xs text-ink-soft">
                  <span className="font-semibold">На что смотреть:</span> {g.look_for}
                </p>
              </li>
            ))}
          </ol>
          {advice.quick_wins.length > 0 && (
            <div className="card p-4">
              <p className="font-semibold">Можно собрать уже сейчас</p>
              <ul className="mt-2 space-y-1 text-sm">
                {advice.quick_wins.map((q, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-ok">✓</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {advice.dead_weight.length > 0 && (
            <div className="card p-4">
              <p className="font-semibold">Висит мёртвым грузом</p>
              <ul className="mt-2 space-y-2">
                {advice.dead_weight.map((d) => {
                  const it = byId.get(d.item_id);
                  if (!it) return null;
                  return (
                    <li key={d.item_id} className="flex items-center gap-3 text-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl(it.image_path)} alt="" className="checker h-12 w-10 rounded-lg object-contain" />
                      <div>
                        <p className="font-semibold">{it.name}</p>
                        <p className="text-xs text-ink-soft">{d.reason}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
      <Toast text={toast} />
    </section>
  );
}
