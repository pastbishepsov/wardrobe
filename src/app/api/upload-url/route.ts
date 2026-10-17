import { z } from "zod";
import { fail, newId, ok } from "@/lib/api";
import { BUCKET, db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Signed upload targets for a new item. The browser PUTs the files straight to Storage,
 * so big PNG cutouts never pass through a serverless function (4.5 MB body limit).
 */
export async function POST(request: Request) {
  const parsed = z.object({ original: z.boolean().default(true) }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(new Error("Неверный запрос"), 400);
  const id = newId();
  try {
    const storage = db().storage.from(BUCKET);
    const image = await storage.createSignedUploadUrl(`items/${id}.png`);
    if (image.error || !image.data) throw new Error(image.error?.message ?? "Не удалось подготовить загрузку");
    let original: { path: string; signedUrl: string } | null = null;
    if (parsed.data.original) {
      const o = await storage.createSignedUploadUrl(`originals/${id}.jpg`);
      if (o.error || !o.data) throw new Error(o.error?.message ?? "Не удалось подготовить загрузку");
      original = { path: o.data.path, signedUrl: o.data.signedUrl };
    }
    return ok({ id, image: { path: image.data.path, signedUrl: image.data.signedUrl }, original });
  } catch (e) {
    return fail(e);
  }
}
