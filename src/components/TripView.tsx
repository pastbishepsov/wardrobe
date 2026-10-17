"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Spinner, Toast } from "@/components/ui";
import { api, jsonInit, useToast } from "@/lib/hooks";
import { CATEGORIES } from "@/lib/taxonomy";
import type { Item, Trip } from "@/lib/types";
import { imageUrl } from "@/lib/urls";

function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
}

export default function TripView({ trip, items }: { trip: Trip; items: Item[] }) {
  const router = useRouter();
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const [packed, setPacked] = useState<Set<string>>(new Set(trip.packed));
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, showToast] = useToast();
  const plan = trip.plan;
  const days = trip.weather?.days ?? [];

  async function togglePacked(id: string) {
    const next = new Set(packed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPacked(next);
    api(`/api/trips/${trip.id}`, jsonInit("PATCH", { packed: Array.from(next) })).catch(() => showToast("Не сохранилось"));
  }

  async function replan() {
    setBusy("replan");
    try {
      await api(`/api/trips/${trip.id}`, jsonInit("PATCH", { replan: true }));
      setPacked(new Set());
      showToast("Капсула пересобрана");
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Удалить поездку?")) return;
    setBusy("delete");
    try {
      await api(`/api/trips/${trip.id}`, { method: "DELETE" });
      router.replace("/trips");
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка");
      setBusy(null);
    }
  }

  const grouped = CATEGORIES.map((c) => ({
    cat: c,
    items: (plan?.items ?? []).map((id) => byId.get(id)).filter((i): i is Item => !!i && i.category === c.value),
  })).filter((g) => g.items.length);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[32px] leading-none">{trip.city}</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {fmtDay(trip.start_date)} — {fmtDay(trip.end_date)}
          {trip.country ? ` · ${trip.country}` : ""}
          {trip.weather?.source === "archive" ? " · погода по прошлому году" : ""}
        </p>
      </header>

      {days.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {days.map((d) => (
            <div key={d.date} className="card min-w-[88px] shrink-0 px-3 py-2 text-center">
              <p className="text-[11px] font-semibold text-ink-soft">{fmtDay(d.date)}</p>
              <p className="display text-xl leading-tight">{Math.round(d.tmax)}°</p>
              <p className="text-[11px] text-ink-soft">
                {Math.round(d.tmin)}° · {d.summary}
              </p>
            </div>
          ))}
        </div>
      )}

      {plan && (
        <>
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-2xl">Список</h2>
              <p className="text-xs text-ink-soft">
                собрано {plan.items.filter((id) => packed.has(id)).length}/{plan.items.length}
              </p>
            </div>
            <div className="space-y-3">
              {grouped.map((g) => (
                <div key={g.cat.value} className="card p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">{g.cat.plural}</p>
                  <ul className="space-y-2">
                    {g.items.map((it) => {
                      const on = packed.has(it.id);
                      return (
                        <li key={it.id}>
                          <button className="flex w-full items-center gap-3 text-left" onClick={() => togglePacked(it.id)}>
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-ok bg-ok text-elev" : "border-line"}`}>
                              {on && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="m5 12 5 5L20 7" />
                                </svg>
                              )}
                            </span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imageUrl(it.image_path)} alt="" className="checker h-12 w-10 rounded-lg object-contain" />
                            <span className={`text-sm ${on ? "text-ink-soft line-through" : ""}`}>{it.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-2xl">По дням</h2>
            <div className="space-y-3">
              {plan.days.map((d) => {
                const w = days.find((x) => x.date === d.date);
                return (
                  <div key={d.date} className="card p-3">
                    <div className="flex items-baseline justify-between">
                      <p className="font-semibold">{fmtDay(d.date)}</p>
                      {w && (
                        <p className="text-xs text-ink-soft">
                          {Math.round(w.tmin)}…{Math.round(w.tmax)}° · {w.summary}
                        </p>
                      )}
                    </div>
                    <div className="no-scrollbar -mx-3 mt-2 flex gap-2 overflow-x-auto px-3">
                      {d.item_ids.map((id) => {
                        const it = byId.get(id);
                        if (!it) return null;
                        return (
                          <Link key={id} href={`/wardrobe/${id}`} className="checker h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-line">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imageUrl(it.image_path)} alt={it.name} className="h-full w-full object-contain p-1" />
                          </Link>
                        );
                      })}
                    </div>
                    {d.note && <p className="mt-2 text-xs text-ink-soft">{d.note}</p>}
                  </div>
                );
              })}
            </div>
          </section>

          {(plan.notes.length > 0 || plan.missing.length > 0) && (
            <section className="space-y-3">
              {plan.notes.length > 0 && (
                <div className="card p-4">
                  <p className="font-semibold">На заметку</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {plan.notes.map((n, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-accent">•</span>
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {plan.missing.length > 0 && (
                <div className="card border-accent/40 p-4">
                  <p className="font-semibold">Чего нет в гардеробе</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {plan.missing.map((n, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-warn">!</span>
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <div className="flex gap-2">
        <button className="btn btn-ghost text-danger" onClick={remove} disabled={busy !== null}>
          {busy === "delete" ? <Spinner /> : "Удалить"}
        </button>
        <button className="btn btn-ghost flex-1" onClick={replan} disabled={busy !== null}>
          {busy === "replan" ? (
            <>
              <Spinner /> Пересобираю…
            </>
          ) : (
            "Пересобрать с новой погодой"
          )}
        </button>
      </div>
      <Toast text={toast} />
    </div>
  );
}
