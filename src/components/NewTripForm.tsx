"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Segmented, Sheet, Spinner } from "@/components/ui";
import { addDays, localDateIso } from "@/lib/dates";
import { api, jsonInit } from "@/lib/hooks";
import type { Trip } from "@/lib/types";

const ACTIVITIES = ["прогулки", "музеи", "рестораны", "деловые встречи", "пляж", "горы", "спорт", "вечеринки", "свадьба", "с детьми"];

export default function NewTripForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const today = localDateIso();
  const [city, setCity] = useState("");
  const [start, setStart] = useState(addDays(today, 7));
  const [end, setEnd] = useState(addDays(today, 10));
  const [purpose, setPurpose] = useState<"leisure" | "work" | "mixed">("leisure");
  const [activities, setActivities] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const trip = await api<Trip>("/api/trips", jsonInit("POST", { city, start_date: start, end_date: end, purpose, activities }));
      onClose();
      router.push(`/trips/${trip.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не получилось");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Новая поездка">
      <label className="label">Куда</label>
      <input className="field mb-3" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Лиссабон" autoFocus />
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="label">С</label>
          <input className="field" type="date" value={start} min={today} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="label">По</label>
          <input className="field" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <label className="label">Формат</label>
      <div className="mb-3">
        <Segmented
          value={purpose}
          onChange={setPurpose}
          options={[
            { value: "leisure", label: "Отдых" },
            { value: "work", label: "Работа" },
            { value: "mixed", label: "И то и то" },
          ]}
        />
      </div>
      <label className="label">Что в программе</label>
      <div className="mb-4 flex flex-wrap gap-2">
        {ACTIVITIES.map((a) => (
          <button key={a} className={`chip ${activities.includes(a) ? "chip-on" : ""}`} onClick={() => setActivities((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))}>
            {a}
          </button>
        ))}
      </div>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <button className="btn btn-primary w-full" onClick={submit} disabled={busy || city.trim().length < 2}>
        {busy ? (
          <>
            <Spinner /> Смотрю погоду и собираю…
          </>
        ) : (
          "Собрать капсулу"
        )}
      </button>
      <p className="mt-2 text-center text-xs text-ink-soft">Прогноз есть на 16 дней вперёд; дальше — ориентир по прошлому году.</p>
    </Sheet>
  );
}
