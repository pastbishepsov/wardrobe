"use client";

import Link from "next/link";
import { useState } from "react";
import NewTripForm from "@/components/NewTripForm";
import { EmptyState } from "@/components/ui";
import { plural } from "@/lib/taxonomy";
import type { Trip } from "@/lib/types";

function fmt(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function TripsList({ trips }: { trips: Trip[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[32px] leading-none">Поездки</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Капсула под погоду и программу</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          Новая
        </button>
      </header>

      {trips.length === 0 ? (
        <EmptyState
          title="Поездок пока нет"
          text="Назови город и даты — подберётся список вещей и образ на каждый день с учётом погоды."
          action={
            <button className="btn btn-primary" onClick={() => setOpen(true)}>
              Собрать капсулу
            </button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {trips.map((t) => {
            const days = t.weather?.days ?? [];
            const tmin = days.length ? Math.round(Math.min(...days.map((d) => d.tmin))) : null;
            const tmax = days.length ? Math.round(Math.max(...days.map((d) => d.tmax))) : null;
            const packed = t.plan ? t.packed.filter((id) => t.plan!.items.includes(id)).length : 0;
            const total = t.plan?.items.length ?? 0;
            return (
              <li key={t.id}>
                <Link href={`/trips/${t.id}`} className="card block p-4 active:opacity-80">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="display text-2xl">{t.city}</p>
                    <p className="text-xs text-ink-soft">
                      {fmt(t.start_date)} — {fmt(t.end_date)}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {tmin !== null ? `${tmin}…${tmax}°C` : "погода неизвестна"} · {plural(total, "вещь", "вещи", "вещей")}
                    {total ? ` · собрано ${packed}/${total}` : ""}
                  </p>
                  {total > 0 && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full bg-ok transition-all" style={{ width: `${(packed / total) * 100}%` }} />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <NewTripForm open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
