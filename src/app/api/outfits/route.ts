import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { createOutfit, listOutfits } from "@/lib/data";

export const dynamic = "force-dynamic";

const LayoutItem = z.object({
  item_id: z.string().uuid(),
  x: z.number(),
  y: z.number(),
  scale: z.number().positive(),
  rotation: z.number(),
  z: z.number().int(),
});

const Body = z.object({
  name: z.string().max(80).nullable().optional(),
  kind: z.enum(["collage", "tryon"]).default("collage"),
  item_ids: z.array(z.string().uuid()).min(1),
  layout: z
    .object({
      items: z.array(LayoutItem).optional(),
      tryon: z
        .object({
          top: z.string().uuid().nullable().optional(),
          bottom: z.string().uuid().nullable().optional(),
          shoes: z.string().uuid().nullable().optional(),
        })
        .optional(),
    })
    .default({}),
  occasion: z.string().max(60).nullable().optional(),
});

export async function GET() {
  try {
    return ok(await listOutfits());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(new Error("Неверные данные образа: " + parsed.error.issues[0]?.message), 400);
  try {
    const outfit = await createOutfit({
      name: parsed.data.name ?? null,
      kind: parsed.data.kind,
      item_ids: parsed.data.item_ids,
      layout: parsed.data.layout,
      occasion: parsed.data.occasion ?? null,
    });
    return ok(outfit, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
