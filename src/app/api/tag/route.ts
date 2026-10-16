import { z } from "zod";
import { aiEnabled, tagItemImage } from "@/lib/anthropic";
import { fail, ok } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  image: z.string().min(100), // base64, no data: prefix
  mediaType: z.enum(["image/png", "image/jpeg", "image/webp"]).default("image/png"),
  hint: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  if (!aiEnabled()) return fail(new Error("ANTHROPIC_API_KEY не задан — автотеги выключены"), 503);
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(new Error("Нужно изображение в base64"), 400);
  try {
    const tags = await tagItemImage(parsed.data.image, parsed.data.mediaType, parsed.data.hint);
    return ok(tags);
  } catch (e) {
    return fail(e);
  }
}
