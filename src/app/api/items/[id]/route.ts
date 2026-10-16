import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { deleteItem, getItem, updateItem } from "@/lib/data";
import { removeFromBucket } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const PatchSchema = z
  .object({
    name: z.string().min(1).max(80),
    category: z.enum(["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"]),
    subcategory: z.string().max(60).nullable(),
    colors: z.array(z.string()).max(4),
    pattern: z.string().max(40).nullable(),
    material: z.string().max(60).nullable(),
    seasons: z.array(z.enum(["spring", "summer", "autumn", "winter"])),
    warmth: z.number().int().min(1).max(5),
    formality: z.number().int().min(1).max(5),
    style_tags: z.array(z.string()).max(6),
    brand: z.string().max(60).nullable(),
    notes: z.string().max(500).nullable(),
    archived: z.boolean(),
  })
  .partial();

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const item = await getItem(id);
    if (!item) return fail(new Error("Вещь не найдена"), 404);
    return ok(item);
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = PatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(new Error("Неверные данные: " + parsed.error.issues[0]?.message), 400);
  try {
    return ok(await updateItem(id, parsed.data));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const item = await getItem(id);
    if (!item) return ok({ ok: true });
    await deleteItem(id);
    await removeFromBucket([item.image_path, ...(item.original_path ? [item.original_path] : [])]).catch(() => {});
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
