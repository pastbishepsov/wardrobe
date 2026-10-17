import Link from "next/link";
import GapsPanel from "@/components/GapsPanel";
import { MATRIX_CATEGORIES, buildMatrix, combinationCount, wearStats } from "@/lib/analysis";
import { aiEnabled } from "@/lib/anthropic";
import { getLatestInsight, listItems, listOutfits, listWears } from "@/lib/data";
import { CATEGORY_LABEL, FORMALITY_BUCKETS, SEASONS, plural } from "@/lib/taxonomy";
import type { GapAdvice } from "@/lib/types";
import { imageUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const [items, wears, outfits, insight] = await Promise.all([listItems(), listWears(), listOutfits(), getLatestInsight<GapAdvice>("gaps")]);
  const matrix = buildMatrix(items);
  const stats = wearStats(items, wears);
  const combos = combinationCount(items);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[32px] leading-none">Советы</h1>
        <p className="mt-1.5 text-sm text-ink-soft">Что есть, чего нет и что лежит без дела</p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Stat value={items.length} label={plural(items.length, "вещь", "вещи", "вещей").replace(/^\d+ /, "")} />
        <Stat value={combos} label="сочетаний" />
        <Stat value={outfits.length} label={plural(outfits.length, "образ", "образа", "образов").replace(/^\d+ /, "")} />
      </div>

      <section>
        <h2 className="mb-1 text-2xl">Покрытие</h2>
        <p className="mb-3 text-xs text-ink-soft">
          Сколько вещей на сезон и уровень формальности. Три числа в клетке: кэжуал · смарт · деловое/вечер. Подсвечены пустые места.
        </p>
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[1.4fr_repeat(4,1fr)] text-[11px]">
            <div className="border-b border-line bg-bg px-2 py-2 font-semibold text-ink-soft" />
            {SEASONS.map((s) => (
              <div key={s.value} className="border-b border-l border-line bg-bg px-1 py-2 text-center font-semibold text-ink-soft">
                {s.label}
              </div>
            ))}
            {MATRIX_CATEGORIES.map((cat, row) => (
              <CategoryRow key={cat} cat={cat} last={row === MATRIX_CATEGORIES.length - 1} matrix={matrix} />
            ))}
          </div>
        </div>
        {matrix.holes.length > 0 && (
          <p className="mt-2 text-xs text-ink-soft">
            Пустых клеток: {matrix.holes.length}. Это ориентир, а не приговор — не всё обязано быть закрыто.
          </p>
        )}
      </section>

      <GapsPanel advice={insight?.payload ?? null} createdAt={insight?.created_at ?? null} items={items} aiEnabled={aiEnabled()} />

      <section className="space-y-3">
        <h2 className="text-2xl">Носка</h2>
        {wears.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Отмечай «надела сегодня» в карточке вещи или у образа — тогда здесь появится, что носится, а что нет.
          </p>
        ) : (
          <>
            {stats.mostWorn.length > 0 && (
              <div className="card p-4">
                <p className="font-semibold">Любимое</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {stats.mostWorn.map(({ item, count }) => (
                    <li key={item.id}>
                      <Link href={`/wardrobe/${item.id}`} className="flex items-center gap-2 rounded-full border border-line bg-bg py-1 pl-1 pr-3 text-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl(item.image_path)} alt="" className="h-8 w-8 rounded-full object-contain" />
                        {item.name} · {count}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(stats.neverWorn.length > 0 || stats.stale.length > 0) && (
              <div className="card p-4">
                <p className="font-semibold">Давно не надевалось</p>
                <p className="mt-0.5 text-xs text-ink-soft">Не носилось больше 90 дней или ни разу с момента добавления.</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {[...stats.stale, ...stats.neverWorn.filter((i) => !stats.stale.includes(i))].slice(0, 12).map((item) => (
                    <li key={item.id}>
                      <Link href={`/wardrobe/${item.id}`} className="flex items-center gap-2 rounded-full border border-line bg-bg py-1 pl-1 pr-3 text-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl(item.image_path)} alt="" className="h-8 w-8 rounded-full object-contain" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="card px-3 py-3 text-center">
      <p className="display text-3xl leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-ink-soft">{label}</p>
    </div>
  );
}

function CategoryRow({ cat, last, matrix }: { cat: (typeof MATRIX_CATEGORIES)[number]; last: boolean; matrix: ReturnType<typeof buildMatrix> }) {
  const border = last ? "" : "border-b";
  return (
    <>
      <div className={`${border} border-line px-2 py-2 font-semibold`}>{CATEGORY_LABEL[cat]}</div>
      {SEASONS.map((s) => (
        <div key={s.value} className={`${border} border-l border-line px-1 py-2`}>
          <div className="flex justify-center gap-0.5">
            {FORMALITY_BUCKETS.map((b) => {
              const cell = matrix.cells.find((c) => c.category === cat && c.season === s.value && c.bucket === b.key);
              const hole = matrix.holes.includes(cell!);
              return (
                <span
                  key={b.key}
                  title={b.label}
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 ${hole ? "bg-accent-soft text-accent" : cell?.count ? "bg-bg text-ink" : "text-ink-soft/50"}`}
                >
                  {cell?.count ?? 0}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
