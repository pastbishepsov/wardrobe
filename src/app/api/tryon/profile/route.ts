import { z } from "zod";
import { fail, newId, ok } from "@/lib/api";
import { getTryonProfile, saveTryonProfile } from "@/lib/data";
import { removeFromBucket, uploadToBucket } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const Box = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0.05).max(1), h: z.number().min(0.05).max(1) });
const Zones = z.object({ top: Box, bottom: Box, shoes: Box });

export async function GET() {
  try {
    return ok(await getTryonProfile());
  } catch (e) {
    return fail(e);
  }
}

/** multipart: photo (jpeg) — replaces the full-body photo. */
export async function POST(request: Request) {
  const form = await request.formData();
  const photo = form.get("photo");
  if (!(photo instanceof Blob)) return fail(new Error("Нужно фото"), 400);
  const path = `tryon/${newId()}.jpg`;
  try {
    const prev = await getTryonProfile();
    await uploadToBucket(path, photo, "image/jpeg");
    const profile = await saveTryonProfile({ photo_path: path, zones: prev?.zones ?? null });
    if (prev?.photo_path) await removeFromBucket([prev.photo_path]).catch(() => {});
    return ok(profile);
  } catch (e) {
    return fail(e);
  }
}

/** json: { zones } */
export async function PUT(request: Request) {
  const parsed = z.object({ zones: Zones }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(new Error("Неверные зоны"), 400);
  try {
    return ok(await saveTryonProfile({ zones: parsed.data.zones }));
  } catch (e) {
    return fail(e);
  }
}
