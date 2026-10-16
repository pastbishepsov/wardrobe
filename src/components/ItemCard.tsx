"use client";

import Link from "next/link";
import { COLOR_HEX } from "@/lib/taxonomy";
import type { Item } from "@/lib/types";
import { imageUrl } from "@/lib/urls";

export function ColorDots({ colors, size = 10 }: { colors: string[]; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      {colors.slice(0, 3).map((c) => (
        <span
          key={c}
          className="inline-block rounded-full border border-black/10"
          style={{ width: size, height: size, background: COLOR_HEX[c] ?? "#ccc" }}
          title={c}
        />
      ))}
    </span>
  );
}

export default function ItemCard({ item, href, onClick, selected }: { item: Item; href?: string; onClick?: () => void; selected?: boolean }) {
  const body = (
    <>
      <div className={`checker aspect-[3/4] w-full overflow-hidden rounded-[14px] ${selected ? "ring-2 ring-accent" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(item.image_path)} alt={item.name} loading="lazy" className="h-full w-full object-contain p-2" />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 px-0.5">
        <p className="truncate text-xs font-semibold">{item.name}</p>
        <ColorDots colors={item.colors} />
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="block active:opacity-80">
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className="block w-full text-left active:opacity-80">
      {body}
    </button>
  );
}
