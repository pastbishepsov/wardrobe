"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Sheet, Spinner, Toast } from "@/components/ui";
import { localDateIso } from "@/lib/dates";
import { useGestures } from "@/lib/gestures";
import { api, jsonInit, useToast } from "@/lib/hooks";
import { resizeImage } from "@/lib/image-client";
import { DEFAULT_ZONES, FORMALITY_BUCKETS, SEASONS, ZONES } from "@/lib/taxonomy";
import type { Item, Placement, Season, TryonProfile, TryonZones, Zone, ZoneBox } from "@/lib/types";
import { imageUrl } from "@/lib/urls";

type Mode = "tryon" | "adjust" | "calibrate";

interface Props {
  profile: TryonProfile | null;
  items: Item[];
  placements: Placement[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const Z_ORDER: Record<Zone, number> = { shoes: 1, bottom: 2, top: 3 };
const ZONE_COLOR: Record<Zone, string> = { top: "rgba(181,83,60,0.35)", bottom: "rgba(63,125,90,0.35)", shoes: "rgba(31,27,23,0.35)" };

function unionBox(a: ZoneBox, b: ZoneBox): ZoneBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

// ---------- photo upload ----------

function PhotoUpload({ onDone, replacing }: { onDone: () => void; replacing?: boolean }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { blob } = await resizeImage(file, 1600, "image/jpeg", 0.88);
      const form = new FormData();
      form.append("photo", blob, "photo.jpg");
      await api("/api/tryon/profile", { method: "POST", body: form });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не загрузилось");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={replacing ? "" : "card p-5"}>
      {!replacing && (
        <>
          <p className="display text-2xl">Фото в полный рост</p>
          <p className="mt-1 text-sm text-ink-soft">
            Встань прямо, руки вдоль тела, однотонный фон, свет спереди. Лучше в нейтральной облегающей одежде — вещи лягут ровнее. Фото видно только тебе.
          </p>
        </>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn btn-primary" onClick={() => cameraRef.current?.click()} disabled={busy}>
          {busy ? <Spinner /> : "Камера"}
        </button>
        <button className="btn btn-ghost" onClick={() => galleryRef.current?.click()} disabled={busy}>
          Из галереи
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

// ---------- calibration ----------

function CalibrateBox({
  zone,
  box,
  label,
  stage,
  onChange,
}: {
  zone: Zone;
  box: ZoneBox;
  label: string;
  stage: React.RefObject<HTMLDivElement | null>;
  onChange: (b: ZoneBox) => void;
}) {
  const move = useGestures({
    onDrag: (dx, dy) => {
      const r = stage.current?.getBoundingClientRect();
      if (!r) return;
      onChange({ ...box, x: clamp(box.x + dx / r.width, 0, 1 - box.w), y: clamp(box.y + dy / r.height, 0, 1 - box.h) });
    },
  });
  const resize = useGestures({
    onDrag: (dx, dy) => {
      const r = stage.current?.getBoundingClientRect();
      if (!r) return;
      onChange({ ...box, w: clamp(box.w + dx / r.width, 0.1, 1 - box.x), h: clamp(box.h + dy / r.height, 0.06, 1 - box.y) });
    },
  });
  return (
    <div
      {...move}
      className="absolute touch-none rounded-lg border-2 border-dashed border-white/90"
      style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%`, background: ZONE_COLOR[zone] }}
    >
      <span className="absolute left-1.5 top-1 rounded bg-elev/90 px-1.5 py-0.5 text-[10px] font-semibold">{label}</span>
      <div
        {...resize}
        className="absolute -bottom-3 -right-3 h-7 w-7 touch-none rounded-full border-2 border-elev bg-accent shadow"
        onPointerDown={(e) => {
          e.stopPropagation();
          resize.onPointerDown(e);
        }}
      />
    </div>
  );
}

// ---------- main ----------

export default function TryOn({ profile, items, placements: initialPlacements }: Props) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>(profile?.photo_path && profile.zones ? "tryon" : profile?.photo_path ? "calibrate" : "tryon");
  const [zones, setZones] = useState<TryonZones>(profile?.zones ?? DEFAULT_ZONES);
  const [aspect, setAspect] = useState<number>(3 / 4);
  const [season, setSeason] = useState<Season | "all">("all");
  const [bucket, setBucket] = useState<string | "all">("all");
  const [index, setIndex] = useState<Record<Zone, number>>({ top: 0, bottom: 0, shoes: 0 });
  // Locked zones keep their item when "Случайно" shuffles the rest.
  const [locked, setLocked] = useState<Record<Zone, boolean>>({ top: false, bottom: false, shoes: false });
  const [placements, setPlacements] = useState<Map<string, Placement>>(() => new Map(initialPlacements.map((p) => [p.item_id, p])));
  const [adjustZone, setAdjustZone] = useState<Zone>("top");
  const [filterOpen, setFilterOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  const photoUrl = profile?.photo_path ? imageUrl(profile.photo_path) : null;

  const lists = useMemo(() => {
    const filt = (i: Item) => (season === "all" || i.seasons.includes(season)) && (bucket === "all" || FORMALITY_BUCKETS.find((b) => b.key === bucket)?.values.includes(i.formality));
    const out = {} as Record<Zone, Item[]>;
    for (const z of ZONES) out[z.value] = items.filter((i) => z.categories.includes(i.category) && filt(i));
    return out;
  }, [items, season, bucket]);

  // Filters can shrink a list after an index was chosen, so indices are clamped at read time.
  const safeIndex = (z: Zone) => (lists[z].length ? Math.min(index[z], lists[z].length - 1) : 0);
  const current = (z: Zone): Item | null => lists[z][safeIndex(z)] ?? null;
  const topItem = current("top");
  const isDress = topItem?.category === "dress";

  function step(z: Zone, dir: -1 | 1) {
    const n = lists[z].length;
    if (!n) return;
    setIndex((prev) => ({ ...prev, [z]: (Math.min(prev[z], n - 1) + dir + n) % n }));
  }

  function shuffle() {
    setIndex((prev) => {
      const next = { ...prev };
      for (const z of ZONES) {
        const n = lists[z.value].length;
        if (locked[z.value] || n < 2) continue;
        // pick something different from what is shown now
        let pick = Math.floor(Math.random() * n);
        if (pick === Math.min(prev[z.value], n - 1)) pick = (pick + 1) % n;
        next[z.value] = pick;
      }
      return next;
    });
  }

  function toggleLock(z: Zone) {
    setLocked((prev) => ({ ...prev, [z]: !prev[z] }));
  }

  function placementOf(id: string): Placement {
    return placements.get(id) ?? { item_id: id, dx: 0, dy: 0, scale: 1, rotation: 0 };
  }

  function updatePlacement(id: string, p: Partial<Placement>) {
    setPlacements((prev) => {
      const next = new Map(prev);
      next.set(id, { ...placementOf(id), ...p });
      return next;
    });
  }

  async function savePlacement() {
    const item = current(adjustZone);
    if (!item) return;
    setBusy("placement");
    try {
      await api("/api/tryon/placement", jsonInit("PUT", placementOf(item.id)));
      showToast("Подгонка запомнена");
      setMode("tryon");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  async function resetPlacement() {
    const item = current(adjustZone);
    if (!item) return;
    setPlacements((prev) => {
      const next = new Map(prev);
      next.delete(item.id);
      return next;
    });
    await api("/api/tryon/placement", jsonInit("DELETE", { item_id: item.id })).catch(() => {});
  }

  async function saveZones() {
    setBusy("zones");
    try {
      await api("/api/tryon/profile", jsonInit("PUT", { zones }));
      setMode("tryon");
      showToast("Зоны сохранены");
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  const chosenIds = () => [topItem?.id, isDress ? null : current("bottom")?.id, current("shoes")?.id].filter(Boolean) as string[];

  async function saveOutfit() {
    const ids = chosenIds();
    if (!ids.length) return;
    setBusy("save");
    try {
      await api("/api/outfits", jsonInit("POST", {
        name: name.trim() || null,
        kind: "tryon",
        item_ids: ids,
        layout: { tryon: { top: topItem?.id ?? null, bottom: isDress ? null : current("bottom")?.id ?? null, shoes: current("shoes")?.id ?? null } },
      }));
      setSaveOpen(false);
      setName("");
      showToast("Образ сохранён");
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  async function wearToday() {
    const ids = chosenIds();
    if (!ids.length) return;
    setBusy("wear");
    try {
      await api("/api/wears", jsonInit("POST", { item_ids: ids, worn_on: localDateIso() }));
      showToast("Отмечено на сегодня");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  // ----- no photo yet -----
  if (!photoUrl) {
    return (
      <PhotoUpload
        onDone={() => {
          router.refresh();
          setMode("calibrate");
        }}
      />
    );
  }

  const zoneBox = (z: Zone): ZoneBox => (z === "top" && isDress ? unionBox(zones.top, zones.bottom) : zones[z]);

  return (
    <div className="space-y-3">
      <div ref={stageRef} className="relative w-full overflow-hidden rounded-[var(--radius)] border border-line bg-[#eee7de]" style={{ aspectRatio: String(aspect) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 h-full w-full select-none object-cover"
          draggable={false}
          onLoad={(e) => {
            const im = e.currentTarget;
            if (im.naturalWidth && im.naturalHeight) setAspect(im.naturalWidth / im.naturalHeight);
          }}
        />

        {mode === "calibrate" ? (
          ZONES.map((z) => (
            <CalibrateBox key={z.value} zone={z.value} box={zones[z.value]} label={z.label} stage={stageRef} onChange={(b) => setZones((prev) => ({ ...prev, [z.value]: b }))} />
          ))
        ) : (
          <>
            {ZONES.map((z) => {
              const item = current(z.value);
              const hidden = z.value === "bottom" && isDress;
              if (hidden) return null;
              const box = zoneBox(z.value);
              const p = item ? placementOf(item.id) : null;
              const adjusting = mode === "adjust" && adjustZone === z.value;
              return (
                <ZoneLayer
                  key={z.value}
                  zone={z.value}
                  label={z.label}
                  box={box}
                  item={item}
                  placement={p}
                  count={lists[z.value].length}
                  position={safeIndex(z.value) + 1}
                  adjusting={adjusting}
                  dimmed={mode === "adjust" && !adjusting}
                  locked={locked[z.value]}
                  onToggleLock={() => toggleLock(z.value)}
                  stage={stageRef}
                  onStep={(dir) => step(z.value, dir)}
                  onTap={() => {
                    if (mode === "adjust") setAdjustZone(z.value);
                  }}
                  onAdjust={(patch) => item && updatePlacement(item.id, patch)}
                />
              );
            })}
            {/* preload neighbours so swiping feels instant */}
            <div className="hidden">
              {ZONES.flatMap((z) => {
                const n = lists[z.value].length;
                if (n < 2) return [];
                const i = safeIndex(z.value);
                return [lists[z.value][(i + 1) % n], lists[z.value][(i - 1 + n) % n]].map((it) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={z.value + it.id} src={imageUrl(it.image_path)} alt="" />
                ));
              })}
            </div>
          </>
        )}
      </div>

      {mode === "calibrate" && (
        <div className="card p-4 fade-up">
          <p className="text-sm font-semibold">Расставь зоны</p>
          <p className="mt-1 text-xs text-ink-soft">
            Верх — от плеч до бёдер, низ — от талии до щиколоток, обувь — ступни. Перетаскивай рамку, за оранжевую точку меняй размер. Это делается один раз.
          </p>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-ghost" onClick={() => setZones(DEFAULT_ZONES)}>
              Сбросить
            </button>
            <button className="btn btn-primary flex-1" onClick={saveZones} disabled={busy !== null}>
              {busy === "zones" ? <Spinner /> : "Готово"}
            </button>
          </div>
        </div>
      )}

      {mode === "adjust" && (
        <div className="card p-4 fade-up">
          <p className="text-sm font-semibold">
            Подгонка: {ZONES.find((z) => z.value === adjustZone)?.label.toLowerCase()} — {current(adjustZone)?.name ?? "нет вещи"}
          </p>
          <p className="mt-1 text-xs text-ink-soft">Двигай вещь пальцем, двумя пальцами меняй размер и поворачивай. Тапни по другой зоне, чтобы подогнать её. Положение запоминается для этой вещи.</p>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-ghost" onClick={resetPlacement}>
              Сбросить
            </button>
            <button className="btn btn-ghost" onClick={() => setMode("tryon")}>
              Отмена
            </button>
            <button className="btn btn-primary flex-1" onClick={savePlacement} disabled={busy !== null || !current(adjustZone)}>
              {busy === "placement" ? <Spinner /> : "Запомнить"}
            </button>
          </div>
        </div>
      )}

      {mode === "tryon" && (
        <>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={shuffle}>
              Случайно
            </button>
            <button className={`btn ${season !== "all" || bucket !== "all" ? "btn-soft" : "btn-ghost"}`} onClick={() => setFilterOpen(true)}>
              Фильтр
            </button>
            <button className="btn btn-ghost" onClick={() => setMode("adjust")} disabled={!topItem && !current("bottom") && !current("shoes")}>
              Подогнать
            </button>
            <button className="btn btn-primary flex-1" onClick={() => setSaveOpen(true)} disabled={!chosenIds().length}>
              Сохранить
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <button className="underline-offset-2 hover:underline" onClick={() => setMode("calibrate")}>
              Поправить зоны
            </button>
            <button className="underline-offset-2 hover:underline" onClick={() => setPhotoOpen(true)}>
              Заменить фото
            </button>
            <button className="font-semibold text-accent" onClick={wearToday} disabled={busy !== null || !chosenIds().length}>
              {busy === "wear" ? "…" : "Надела сегодня"}
            </button>
          </div>
          {!items.length && (
            <p className="text-center text-sm text-ink-soft">
              Вещей пока нет —{" "}
              <Link href="/wardrobe/new" className="font-semibold text-accent">
                добавь первую
              </Link>
              .
            </p>
          )}
        </>
      )}

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Что показывать">
        <label className="label">Сезон</label>
        <div className="mb-4 flex flex-wrap gap-2">
          <button className={`chip ${season === "all" ? "chip-on" : ""}`} onClick={() => setSeason("all")}>
            Любой
          </button>
          {SEASONS.map((s) => (
            <button key={s.value} className={`chip ${season === s.value ? "chip-on" : ""}`} onClick={() => setSeason(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
        <label className="label">Формальность</label>
        <div className="mb-4 flex flex-wrap gap-2">
          <button className={`chip ${bucket === "all" ? "chip-on" : ""}`} onClick={() => setBucket("all")}>
            Любая
          </button>
          {FORMALITY_BUCKETS.map((b) => (
            <button key={b.key} className={`chip ${bucket === b.key ? "chip-on" : ""}`} onClick={() => setBucket(b.key)}>
              {b.label}
            </button>
          ))}
        </div>
        <button className="btn btn-primary w-full" onClick={() => setFilterOpen(false)}>
          Показать {lists.top.length + lists.bottom.length + lists.shoes.length}
        </button>
      </Sheet>

      <Sheet open={saveOpen} onClose={() => setSaveOpen(false)} title="Сохранить образ">
        <label className="label">Название</label>
        <input className="field mb-4" value={name} onChange={(e) => setName(e.target.value)} placeholder="Прогулка в субботу" />
        <button className="btn btn-primary w-full" onClick={saveOutfit} disabled={busy !== null}>
          {busy === "save" ? <Spinner /> : "Сохранить"}
        </button>
      </Sheet>

      <Sheet open={photoOpen} onClose={() => setPhotoOpen(false)} title="Новое фото">
        <p className="text-sm text-ink-soft">Зоны останутся прежними — при необходимости поправь их после замены.</p>
        <PhotoUpload
          replacing
          onDone={() => {
            setPhotoOpen(false);
            router.refresh();
          }}
        />
      </Sheet>
      <Toast text={toast} />
    </div>
  );
}

// ---------- one zone with its item ----------

function ZoneLayer({
  zone,
  label,
  box,
  item,
  placement,
  count,
  position,
  adjusting,
  dimmed,
  locked,
  onToggleLock,
  stage,
  onStep,
  onTap,
  onAdjust,
}: {
  zone: Zone;
  label: string;
  box: ZoneBox;
  item: Item | null;
  placement: Placement | null;
  count: number;
  position: number;
  adjusting: boolean;
  dimmed: boolean;
  locked: boolean;
  onToggleLock: () => void;
  stage: React.RefObject<HTMLDivElement | null>;
  onStep: (dir: -1 | 1) => void;
  onTap: () => void;
  onAdjust: (p: Partial<Placement>) => void;
}) {
  const g = useGestures({
    onSwipe: adjusting ? undefined : (dir) => onStep(dir === -1 ? 1 : -1),
    onTap,
    onDrag: adjusting
      ? (dx, dy) => {
          const r = stage.current?.getBoundingClientRect();
          if (!r || !placement) return;
          // Same bounds as the server accepts (fractions of the zone), so "Запомнить" never fails.
          onAdjust({ dx: clamp(placement.dx + dx / (r.width * box.w), -2, 2), dy: clamp(placement.dy + dy / (r.height * box.h), -2, 2) });
        }
      : undefined,
    onPinch: adjusting
      ? (ratio, angleDelta) => {
          if (!placement) return;
          const rotation = (((placement.rotation + angleDelta + 180) % 360) + 360) % 360 - 180;
          onAdjust({ scale: clamp(placement.scale * ratio, 0.3, 3), rotation });
        }
      : undefined,
  });

  return (
    <div
      {...g}
      className={`absolute touch-none select-none ${adjusting ? "rounded-lg outline outline-2 outline-dashed outline-accent" : ""}`}
      style={{
        left: `${box.x * 100}%`,
        top: `${box.y * 100}%`,
        width: `${box.w * 100}%`,
        height: `${box.h * 100}%`,
        zIndex: adjusting ? 20 : Z_ORDER[zone],
        opacity: dimmed ? 0.6 : 1,
      }}
    >
      {item && placement ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl(item.image_path)}
          alt={item.name}
          draggable={false}
          className="pointer-events-none h-full w-full object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.18)]"
          style={{
            transform: `translate(${placement.dx * 100}%, ${placement.dy * 100}%) scale(${placement.scale}) rotate(${placement.rotation}deg)`,
            transformOrigin: "center",
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed border-white/80 bg-black/10 text-[11px] font-semibold text-white">
          {count ? label : `Нет: ${label.toLowerCase()}`}
        </div>
      )}
      {count > 1 && !adjusting && (
        <>
          <button
            aria-label="Предыдущая"
            className="absolute -left-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-elev/90 text-ink shadow"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onStep(-1)}
          >
            ‹
          </button>
          <button
            aria-label="Следующая"
            className="absolute -right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-elev/90 text-ink shadow"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onStep(1)}
          >
            ›
          </button>
          <span className="absolute -bottom-1 right-1 rounded-full bg-elev/90 px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft">
            {position}/{count}
          </span>
          <button
            aria-label={locked ? "Открепить" : "Закрепить"}
            aria-pressed={locked}
            className={`absolute -top-1 left-1 flex h-7 w-7 items-center justify-center rounded-full shadow ${locked ? "bg-accent text-accent-ink" : "bg-elev/90 text-ink-soft"}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onToggleLock}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              {locked ? <path d="M8 11V7a4 4 0 0 1 8 0v4" /> : <path d="M8 11V7a4 4 0 0 1 7.5-1.8" />}
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
