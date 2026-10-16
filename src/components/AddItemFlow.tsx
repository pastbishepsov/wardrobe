"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import TagForm, { EMPTY_META, type ItemMeta } from "@/components/TagForm";
import { Spinner, Toast } from "@/components/ui";
import { api, useToast } from "@/lib/hooks";
import { blobToBase64, removeBg, resizeImage, trimTransparent } from "@/lib/image-client";
import type { ItemTags } from "@/lib/anthropic";
import { plural } from "@/lib/taxonomy";

type Status = "pending" | "processing" | "ready" | "saving" | "saved" | "skipped" | "failed";

interface Entry {
  id: string;
  file: File;
  status: Status;
  stage: string;
  progress: number | null;
  originalBlob?: Blob;
  originalUrl?: string;
  cutoutBlob?: Blob;
  cutoutUrl?: string;
  width?: number;
  height?: number;
  meta: ItemMeta;
  aiTagged: boolean;
  error?: string;
}

function tagsToMeta(t: ItemTags): ItemMeta {
  return {
    name: t.name,
    category: t.category,
    subcategory: t.subcategory ?? "",
    colors: t.colors,
    pattern: t.pattern,
    material: t.material ?? "",
    seasons: t.seasons,
    warmth: t.warmth,
    formality: t.formality,
    style_tags: t.style_tags,
    brand: "",
    notes: "",
  };
}

export default function AddItemFlow({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showOriginal, setShowOriginal] = useState(false);
  const [toast, showToast] = useToast();
  const processingRef = useRef(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const patch = useCallback((id: string, p: Partial<Entry> | ((e: Entry) => Partial<Entry>)) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...(typeof p === "function" ? p(e) : p) } : e)));
  }, []);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: Entry[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "pending",
      stage: "В очереди",
      progress: null,
      meta: { ...EMPTY_META },
      aiTagged: false,
    }));
    setEntries((prev) => [...prev, ...next]);
  }

  // Process one entry at a time: resize → remove background → trim → tag.
  useEffect(() => {
    if (processingRef.current) return;
    const entry = entries.find((e) => e.status === "pending");
    if (!entry) return;
    processingRef.current = true;
    (async () => {
      try {
        patch(entry.id, { status: "processing", stage: "Готовлю фото…", progress: null });
        const original = await resizeImage(entry.file, 1600, "image/jpeg", 0.86);
        patch(entry.id, { originalBlob: original.blob, originalUrl: URL.createObjectURL(original.blob) });

        patch(entry.id, { stage: "Вырезаю фон…" });
        const raw = await removeBg(original.blob, (fraction, stage) => {
          patch(entry.id, {
            stage: stage === "model" ? "Загружаю модель (один раз)…" : "Вырезаю фон…",
            progress: stage === "model" ? fraction : null,
          });
        });
        const trimmed = await trimTransparent(raw, 10);
        const cutout = trimmed.width > 1400 || trimmed.height > 1400 ? await resizeImage(trimmed.blob, 1400, "image/png") : trimmed;
        patch(entry.id, {
          cutoutBlob: cutout.blob,
          cutoutUrl: URL.createObjectURL(cutout.blob),
          width: cutout.width,
          height: cutout.height,
          stage: aiEnabled ? "Подбираю теги…" : "Готово",
          progress: null,
          status: aiEnabled ? "processing" : "ready",
        });

        if (aiEnabled) {
          try {
            const small = await resizeImage(cutout.blob, 640, "image/jpeg", 0.85);
            const tags = await api<ItemTags>("/api/tag", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: await blobToBase64(small.blob), mediaType: "image/jpeg" }),
            });
            patch(entry.id, { meta: tagsToMeta(tags), aiTagged: true });
          } catch (err) {
            patch(entry.id, { error: err instanceof Error ? err.message : "Теги не подобрались" });
          }
          patch(entry.id, { status: "ready", stage: "Готово" });
        }
      } catch (err) {
        patch(entry.id, { status: "failed", stage: "Ошибка", error: err instanceof Error ? err.message : String(err) });
      } finally {
        processingRef.current = false;
        // trigger the effect again for the next pending entry
        setEntries((prev) => [...prev]);
      }
    })();
  }, [entries, patch, aiEnabled]);

  const current = entries.find((e) => e.status === "ready" || e.status === "saving") ?? entries.find((e) => e.status === "processing" || e.status === "pending") ?? entries.find((e) => e.status === "failed");
  const savedCount = entries.filter((e) => e.status === "saved").length;
  const remaining = entries.filter((e) => ["pending", "processing", "ready"].includes(e.status)).length;
  const allDone = entries.length > 0 && remaining === 0 && !entries.some((e) => e.status === "failed");

  async function save(entry: Entry) {
    if (!entry.cutoutBlob) return;
    if (!entry.meta.name.trim()) {
      showToast("Дай вещи название");
      return;
    }
    patch(entry.id, { status: "saving" });
    try {
      const form = new FormData();
      form.append("image", entry.cutoutBlob, "item.png");
      if (entry.originalBlob) form.append("original", entry.originalBlob, "original.jpg");
      form.append(
        "meta",
        JSON.stringify({
          ...entry.meta,
          subcategory: entry.meta.subcategory || null,
          material: entry.meta.material || null,
          brand: entry.meta.brand || null,
          notes: entry.meta.notes || null,
          width: entry.width ?? null,
          height: entry.height ?? null,
        })
      );
      await api("/api/items", { method: "POST", body: form });
      patch(entry.id, { status: "saved" });
      showToast("Сохранено");
      router.refresh();
    } catch (err) {
      patch(entry.id, { status: "ready", error: err instanceof Error ? err.message : "Не сохранилось" });
    }
  }

  async function saveWithoutCutout(entry: Entry) {
    // Fallback when background removal is not available on this device.
    if (!entry.originalBlob) return;
    const png = await resizeImage(entry.originalBlob, 1400, "image/png");
    patch(entry.id, { cutoutBlob: png.blob, cutoutUrl: URL.createObjectURL(png.blob), width: png.width, height: png.height, status: "ready", error: undefined });
  }

  if (!entries.length) {
    return (
      <div className="space-y-4">
        <div className="card p-5">
          <p className="display text-2xl">Сфотографируй вещь</p>
          <p className="mt-1 text-sm text-ink-soft">
            Разложи её на любом ровном фоне, при дневном свете, целиком в кадре. Фон уберётся сам, прямо на телефоне.
            {aiEnabled ? " Название и теги подберутся автоматически — останется проверить." : ""}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn btn-primary" onClick={() => cameraRef.current?.click()}>
              Камера
            </button>
            <button className="btn btn-ghost" onClick={() => galleryRef.current?.click()}>
              Из галереи
            </button>
          </div>
          <p className="mt-3 text-xs text-ink-soft">Из галереи можно выбрать сразу несколько фото — они обработаются по очереди.</p>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </div>
    );
  }

  if (allDone || !current) {
    return (
      <div className="card p-6 text-center fade-up">
        <p className="display text-3xl">Готово</p>
        <p className="mt-1 text-sm text-ink-soft">
          Добавлено {plural(savedCount, "вещь", "вещи", "вещей")}
          {entries.some((e) => e.status === "skipped") ? ", часть пропущена" : ""}.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button className="btn btn-ghost" onClick={() => setEntries([])}>
            Добавить ещё
          </button>
          <Link href="/wardrobe" className="btn btn-primary">
            В гардероб
          </Link>
        </div>
        <Toast text={toast} />
      </div>
    );
  }

  const position = entries.filter((e) => e.status !== "pending" || e.id === current.id).indexOf(current) + 1;

  return (
    <div className="space-y-4 fade-up" key={current.id}>
      {entries.length > 1 && (
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Вещь {Math.min(position, entries.length)} из {entries.length} · сохранено {savedCount}
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="checker relative aspect-[4/5] w-full">
          {(current.cutoutUrl || current.originalUrl) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={showOriginal && current.originalUrl ? current.originalUrl : current.cutoutUrl ?? current.originalUrl}
              alt=""
              className="h-full w-full object-contain p-3"
            />
          )}
          {current.status === "processing" || current.status === "pending" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-elev/70 backdrop-blur-sm">
              <Spinner className="text-accent" />
              <p className="text-sm font-semibold">{current.stage}</p>
              {current.progress !== null && (
                <div className="h-1.5 w-40 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-accent transition-all" style={{ width: `${Math.round(current.progress * 100)}%` }} />
                </div>
              )}
            </div>
          ) : null}
          {current.status === "failed" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-elev/85 p-6 text-center">
              <p className="text-sm font-semibold text-danger">Не удалось вырезать фон</p>
              <p className="text-xs text-ink-soft">{current.error}</p>
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => patch(current.id, { status: "skipped" })}>
                  Пропустить
                </button>
                <button className="btn btn-primary" onClick={() => saveWithoutCutout(current)}>
                  Сохранить как есть
                </button>
              </div>
            </div>
          )}
          {current.status === "ready" && current.originalUrl && (
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
      </div>

      {(current.status === "ready" || current.status === "saving") && (
        <>
          {current.aiTagged ? (
            <p className="rounded-2xl bg-accent-soft px-3 py-2 text-xs text-accent">Теги подобраны автоматически — проверь и поправь, если что-то не так.</p>
          ) : current.error ? (
            <p className="rounded-2xl bg-accent-soft px-3 py-2 text-xs text-accent">Автотеги не подобрались ({current.error}) — заполни руками.</p>
          ) : null}
          <TagForm value={current.meta} onChange={(meta) => patch(current.id, { meta })} />
          <div className="sticky bottom-20 z-10 flex gap-2 rounded-full bg-bg/90 p-1 backdrop-blur">
            <button className="btn btn-ghost" onClick={() => patch(current.id, { status: "skipped" })} disabled={current.status === "saving"}>
              Пропустить
            </button>
            <button className="btn btn-primary flex-1" onClick={() => save(current)} disabled={current.status === "saving"}>
              {current.status === "saving" ? <Spinner /> : "Сохранить"}
            </button>
          </div>
        </>
      )}
      <Toast text={toast} />
    </div>
  );
}
