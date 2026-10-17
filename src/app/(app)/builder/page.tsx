import Link from "next/link";
import Collage from "@/components/Collage";
import OutfitsList from "@/components/OutfitsList";
import { listItems, listOutfits, listWears } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BuilderPage() {
  const [items, outfits, wears] = await Promise.all([listItems(), listOutfits(), listWears()]);
  const wornCounts: Record<string, number> = {};
  for (const w of wears) if (w.outfit_id) wornCounts[w.outfit_id] = (wornCounts[w.outfit_id] ?? 0) + 1;

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-[32px] leading-none">Конструктор</h1>
        <p className="mt-1.5 text-sm text-ink-soft">Собери образ из того, что есть</p>
      </header>
      {items.length ? (
        <Collage items={items} />
      ) : (
        <div className="card p-6 text-center">
          <p className="display text-2xl">Сначала вещи</p>
          <p className="mt-1 text-sm text-ink-soft">Конструктору нужно из чего собирать.</p>
          <Link href="/wardrobe/new" className="btn btn-primary mt-4">
            Добавить вещь
          </Link>
        </div>
      )}
      <h2 className="mb-3 mt-8 text-2xl">Сохранённые образы</h2>
      <OutfitsList outfits={outfits} items={items} wornCounts={wornCounts} />
    </div>
  );
}
