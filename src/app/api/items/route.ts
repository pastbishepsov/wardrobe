import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { createItem, listItems } from "@/lib/data";
import { removeFromBucket } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const MetaSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.enum(["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"]),
  subcategory: z.string().max(60).nullable().optional(),
  colors: z.array(z.string()).max(4).default([]),
  pattern: z.string().max(40).nullable().optional(),
  material: z.string().max(60).nullable().optional(),
  seasons: z.array(z.enum(["spring", "summer", "autumn", "winter"])).default([]),
  warmth: z.number().int().min(1).max(5).default(3),
  formality: z.number().int().min(1).max(5).default(3),
  style_tags: z.array(z.string()).max(6).default([]),
  brand: z.string().max(60).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
});

export async function GET() {
  try {
    return ok(await listItems());
  } catch (e) {
    return fail(e);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CreateSchema = z.object({
  // id and paths come from /api/upload-url; the files are already in Storage.
  id: z.string().regex(UUID),
  image_path: z.string(),
  original_path: z.string().nullable().default(null),
  meta: MetaSchema,
});

export async function POST(request: Request) {
  const parsed = CreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(new Error("Неверные данные вещи: " + parsed.error.issues[0]?.message), 400);
  const { id, meta } = parsed.data;
  const imagePath = `items/${id}.png`;
  const originalPath = parsed.data.original_path ? `originals/${id}.jpg` : null;
  if (parsed.data.image_path !== imagePath || (originalPath && parsed.data.original_path !== originalPath)) {
    return fail(new Error("Пути файлов не совпадают с id"), 400);
  }
  try {
    const item = await createItem({
      id,
      name: meta.name,
      category: meta.category,
      subcategory: meta.subcategory ?? null,
      colors: meta.colors,
      pattern: meta.pattern ?? null,
      material: meta.material ?? null,
      seasons: meta.seasons,
      warmth: meta.warmth,
      formality: meta.formality,
      style_tags: meta.style_tags,
      brand: meta.brand ?? null,
      notes: meta.notes ?? null,
      image_path: imagePath,
      original_path: originalPath,
      width: meta.width ?? null,
      height: meta.height ?? null,
    });
    return ok(item, { status: 201 });
  } catch (e) {
    await removeFromBucket([imagePath, ...(originalPath ? [originalPath] : [])]).catch(() => {});
    return fail(e);
  }
}
