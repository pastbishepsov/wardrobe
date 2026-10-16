import { notFound } from "next/navigation";
import ItemEditor from "@/components/ItemEditor";
import { BackLink } from "@/components/ui";
import { getItem, listWears } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, wears] = await Promise.all([getItem(id), listWears()]);
  if (!item) notFound();
  const mine = wears.filter((w) => w.item_ids.includes(item.id));
  return (
    <div>
      <BackLink href="/wardrobe" label="Гардероб" />
      <h1 className="mb-4 text-[28px] leading-tight">{item.name}</h1>
      <ItemEditor item={item} wornCount={mine.length} lastWorn={mine[0]?.worn_on ?? null} />
    </div>
  );
}
