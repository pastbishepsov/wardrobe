import Link from "next/link";
import WardrobeGrid from "@/components/WardrobeGrid";
import { listItems } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function WardrobePage() {
  const items = await listItems();
  return (
    <div>
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[32px] leading-none">Гардероб</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Всё, что есть, в одном месте</p>
        </div>
        <Link href="/wardrobe/new" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Добавить
        </Link>
      </header>
      <WardrobeGrid items={items} />
    </div>
  );
}
