import TryOn from "@/components/TryOn";
import { getTryonProfile, listItems, listPlacements } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TryOnPage() {
  const [profile, items, placements] = await Promise.all([getTryonProfile(), listItems(), listPlacements()]);
  return (
    <div>
      <header className="mb-4">
        <h1 className="text-[32px] leading-none">Примерка</h1>
        <p className="mt-1.5 text-sm text-ink-soft">Свайпай верх, низ и обувь прямо на себе</p>
      </header>
      <TryOn profile={profile} items={items} placements={placements} />
    </div>
  );
}
