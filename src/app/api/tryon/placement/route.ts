import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { deletePlacement, listPlacements, savePlacement } from "@/lib/data";

export const dynamic = "force-dynamic";

const Body = z.object({
  item_id: z.string().uuid(),
  dx: z.number().min(-2).max(2),
  dy: z.number().min(-2).max(2),
  scale: z.number().min(0.2).max(4),
  rotation: z.number().min(-180).max(180).default(0),
});

export async function GET() {
  try {
    return ok(await listPlacements());
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(new Error("Неверная подгонка"), 400);
  try {
    await savePlacement(parsed.data);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(request: Request) {
  const parsed = z.object({ item_id: z.string().uuid() }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(new Error("Нужен item_id"), 400);
  try {
    await deletePlacement(parsed.data.item_id);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
