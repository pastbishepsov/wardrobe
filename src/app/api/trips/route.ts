import { z } from "zod";
import { aiEnabled, capsulePlan } from "@/lib/anthropic";
import { fail, ok } from "@/lib/api";
import { candidateItems, fallbackPlan, tripNeeds } from "@/lib/capsule";
import { createTrip, listItems, listTrips } from "@/lib/data";
import { geocode, tripWeather } from "@/lib/weather";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({
  city: z.string().min(2).max(80),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  purpose: z.enum(["leisure", "work", "mixed"]).default("mixed"),
  activities: z.array(z.string().max(40)).max(10).default([]),
});

export async function GET() {
  try {
    return ok(await listTrips());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(new Error("Проверь город и даты"), 400);
  const { city, start_date, end_date, purpose, activities } = parsed.data;
  if (end_date < start_date) return fail(new Error("Дата окончания раньше начала"), 400);
  if ((Date.parse(end_date) - Date.parse(start_date)) / 86_400_000 > 21) return fail(new Error("Максимум 21 день"), 400);

  try {
    const geo = await geocode(city);
    if (!geo) return fail(new Error("Город не найден — попробуй написать иначе"), 404);
    const weather = await tripWeather(geo.lat, geo.lon, start_date, end_date);
    const items = await listItems();
    const needs = tripNeeds(weather.days, start_date, weather.source);
    const candidates = candidateItems(items, needs, purpose);
    if (candidates.length < 3) return fail(new Error("Под такую погоду в гардеробе почти ничего нет — добавь вещей"), 400);

    const plan = aiEnabled()
      ? await capsulePlan({
          city: geo.name,
          startDate: start_date,
          endDate: end_date,
          purpose,
          activities,
          weather: weather.days,
          weatherSource: weather.source,
          candidates,
        })
      : fallbackPlan(candidates, weather.days, needs);

    const trip = await createTrip({
      city: geo.name,
      country: geo.country,
      lat: geo.lat,
      lon: geo.lon,
      start_date,
      end_date,
      purpose,
      activities,
      weather,
      plan,
      packed: [],
    });
    return ok(trip, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
