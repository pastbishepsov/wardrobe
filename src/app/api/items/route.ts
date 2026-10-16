import { z } from "zod";
import { fail, newId, ok } from "@/lib/api";
import { createItem, listItems } from "@/lib/data";
import { removeFromBucket, uploadToBucket } from "@/lib/supabase";

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

export async function POST(request: Request) {
  const form = await request.formData();
  const image = form.get("image");
  const original = form.get("original");
  const metaRaw = form.get("meta");
  if (!(image instanceof Blob) || typeof metaRaw !== "string") {
    return fail(new Error("Нужны файл image и поле meta"), 400);
  }
  const parsed = MetaSchema.safeParse(JSON.parse(metaRaw));
  if (!parsed.success) return fail(new Error("Неверные данные вещи: " + parsed.error.issues[0]?.message), 400);
  const meta = parsed.data;

  const id = newId();
  const imagePath = `items/${id}.png`;
  const originalPath = original instanceof Blob ? `originals/${id}.jpg` : null;
  try {
    await uploadToBucket(imagePath, image, "image/png");
    if (original instanceof Blob && originalPath) await uploadToBucket(originalPath, original, "image/jpeg");
    const item = await createItem({
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
