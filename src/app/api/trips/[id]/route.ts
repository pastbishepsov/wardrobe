import { z } from "zod";
import { aiEnabled, capsulePlan } from "@/lib/anthropic";
import { fail, isUuid, ok } from "@/lib/api";
import { candidateItems, fallbackPlan, tripNeeds } from "@/lib/capsule";
import { deleteTrip, getTrip, listItems, updateTrip } from "@/lib/data";
import { tripWeather } from "@/lib/weather";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

const Patch = z.object({
  packed: z.array(z.string().uuid()).optional(),
  replan: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return fail(new Error("Не найдено"), 404);
  const parsed = Patch.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(new Error("Неверные данные"), 400);
  try {
    const trip = await getTrip(id);
    if (!trip) return fail(new Error("Поездка не найдена"), 404);
    if (parsed.data.replan) {
      const weather = await tripWeather(trip.lat, trip.lon, trip.start_date, trip.end_date);
      const items = await listItems();
      const needs = tripNeeds(weather.days, trip.start_date, weather.source);
      const candidates = candidateItems(items, needs, trip.purpose);
      const plan = aiEnabled()
        ? await capsulePlan({
            city: trip.city,
            startDate: trip.start_date,
            endDate: trip.end_date,
            purpose: trip.purpose,
            activities: trip.activities,
            weather: weather.days,
            weatherSource: weather.source,
            candidates,
          })
        : fallbackPlan(candidates, weather.days, needs);
      return ok(await updateTrip(id, { weather, plan, packed: [] }));
    }
    if (parsed.data.packed) return ok(await updateTrip(id, { packed: parsed.data.packed }));
    return ok(trip);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return fail(new Error("Не найдено"), 404);
  try {
    await deleteTrip(id);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
