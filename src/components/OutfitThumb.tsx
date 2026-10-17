"use client";

import type { Item, Outfit } from "@/lib/types";
import { imageUrl } from "@/lib/urls";

/** Static preview of a saved outfit (collage layout or a try-on triple). */
export default function OutfitThumb({ outfit, items, className = "" }: { outfit: Outfit; items: Map<string, Item>; className?: string }) {
  const layoutItems = outfit.layout.items ?? [];
  if (outfit.kind === "collage" && layoutItems.length) {
    return (
      <div className={`relative aspect-[3/4] w-full overflow-hidden rounded-[14px] bg-[#f3eee7] ${className}`}>
        {[...layoutItems]
          .sort((a, b) => a.z - b.z)
          .map((li) => {
            const item = items.get(li.item_id);
            if (!item) return null;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={li.item_id}
                src={imageUrl(item.image_path)}
                alt=""
                className="pointer-events-none absolute w-[45%] select-none"
                style={{
                  left: `${li.x * 100}%`,
                  top: `${li.y * 100}%`,
                  transform: `translate(-50%, -50%) scale(${li.scale}) rotate(${li.rotation}deg)`,
                  transformOrigin: "center",
                }}
              />
            );
          })}
      </div>
    );
  }
  const ids =
    outfit.kind === "tryon"
      ? ([outfit.layout.tryon?.top, outfit.layout.tryon?.bottom, outfit.layout.tryon?.shoes].filter(Boolean) as string[])
      : outfit.item_ids;
  return (
    <div className={`flex aspect-[3/4] w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[14px] bg-[#f3eee7] p-2 ${className}`}>
      {ids.slice(0, 3).map((id) => {
        const item = items.get(id);
        if (!item) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={id} src={imageUrl(item.image_path)} alt="" className="max-h-[32%] max-w-[70%] object-contain" />
        );
      })}
    </div>
  );
}
