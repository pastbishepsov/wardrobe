import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { addWear, listWears } from "@/lib/data";

export const dynamic = "force-dynamic";

const Body = z.object({
  item_ids: z.array(z.string().uuid()).min(1),
  outfit_id: z.string().uuid().nullable().optional(),
  worn_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET() {
  try {
    return ok(await listWears());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(new Error("Неверные данные"), 400);
  try {
    return ok(await addWear(parsed.data), { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
