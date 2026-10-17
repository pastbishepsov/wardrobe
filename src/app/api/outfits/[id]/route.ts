import { z } from "zod";
import { fail, isUuid, ok } from "@/lib/api";
import { deleteOutfit, getOutfit, updateOutfit } from "@/lib/data";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const Patch = z
  .object({
    name: z.string().max(80).nullable(),
    occasion: z.string().max(60).nullable(),
  })
  .partial();

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return fail(new Error("Не найдено"), 404);
  const parsed = Patch.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(new Error("Неверные данные"), 400);
  try {
    const existing = await getOutfit(id);
    if (!existing) return fail(new Error("Образ не найден"), 404);
    return ok(await updateOutfit(id, parsed.data));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return fail(new Error("Не найдено"), 404);
  try {
    await deleteOutfit(id);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
