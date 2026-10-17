import { db } from "./supabase";
import type {
  GapAdvice,
  Item,
  Outfit,
  Placement,
  Trip,
  TryonProfile,
  TryonZones,
  Wear,
} from "./types";

function fail(msg: string, error: { message: string } | null): never {
  throw new Error(`${msg}: ${error?.message ?? "unknown"}`);
}

// ---------- items ----------

export async function listItems(opts: { includeArchived?: boolean } = {}): Promise<Item[]> {
  let q = db().from("items").select("*").order("created_at", { ascending: false });
  if (!opts.includeArchived) q = q.eq("archived", false);
  const { data, error } = await q;
  if (error) fail("Не удалось загрузить вещи", error);
  return (data ?? []) as Item[];
}

export async function getItem(id: string): Promise<Item | null> {
  const { data, error } = await db().from("items").select("*").eq("id", id).maybeSingle();
  if (error) fail("Не удалось загрузить вещь", error);
  return (data as Item | null) ?? null;
}

export async function createItem(input: Omit<Item, "id" | "created_at" | "archived"> & { id?: string }): Promise<Item> {
  const { data, error } = await db().from("items").insert(input).select("*").single();
  if (error) fail("Не удалось сохранить вещь", error);
  return data as Item;
}

export async function updateItem(id: string, patch: Partial<Item>): Promise<Item> {
  const { data, error } = await db().from("items").update(patch).eq("id", id).select("*").single();
  if (error) fail("Не удалось обновить вещь", error);
  return data as Item;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await db().from("items").delete().eq("id", id);
  if (error) fail("Не удалось удалить вещь", error);
}

/**
 * Strip a deleted item out of outfits and trip plans so counters and layouts stay consistent.
 * Wear history keeps the id on purpose (it is history); readers tolerate unknown ids.
 */
export async function removeItemReferences(id: string): Promise<void> {
  const outfits = await listOutfits();
  for (const o of outfits) {
    if (!o.item_ids.includes(id)) continue;
    const item_ids = o.item_ids.filter((x) => x !== id);
    if (!item_ids.length) {
      await deleteOutfit(o.id);
      continue;
    }
    const layout: Outfit["layout"] = { ...o.layout };
    if (layout.items) layout.items = layout.items.filter((l) => l.item_id !== id);
    if (layout.tryon) {
      const t = { ...layout.tryon };
      for (const k of ["top", "bottom", "shoes"] as const) if (t[k] === id) t[k] = null;
      layout.tryon = t;
    }
    await updateOutfit(o.id, { item_ids, layout });
  }

  const trips = await listTrips();
  for (const t of trips) {
    const inPlan = t.plan && (t.plan.items.includes(id) || t.plan.days.some((d) => d.item_ids.includes(id)));
    const inPacked = t.packed.includes(id);
    if (!inPlan && !inPacked) continue;
    const plan = t.plan
      ? { ...t.plan, items: t.plan.items.filter((x) => x !== id), days: t.plan.days.map((d) => ({ ...d, item_ids: d.item_ids.filter((x) => x !== id) })) }
      : null;
    await updateTrip(t.id, { plan, packed: t.packed.filter((x) => x !== id) });
  }
}

// ---------- outfits ----------

export async function listOutfits(): Promise<Outfit[]> {
  const { data, error } = await db().from("outfits").select("*").order("created_at", { ascending: false });
  if (error) fail("Не удалось загрузить образы", error);
  return (data ?? []) as Outfit[];
}

export async function getOutfit(id: string): Promise<Outfit | null> {
  const { data, error } = await db().from("outfits").select("*").eq("id", id).maybeSingle();
  if (error) fail("Не удалось загрузить образ", error);
  return (data as Outfit | null) ?? null;
}

export async function createOutfit(input: Omit<Outfit, "id" | "created_at">): Promise<Outfit> {
  const { data, error } = await db().from("outfits").insert(input).select("*").single();
  if (error) fail("Не удалось сохранить образ", error);
  return data as Outfit;
}

export async function updateOutfit(id: string, patch: Partial<Outfit>): Promise<Outfit> {
  const { data, error } = await db().from("outfits").update(patch).eq("id", id).select("*").single();
  if (error) fail("Не удалось обновить образ", error);
  return data as Outfit;
}

export async function deleteOutfit(id: string): Promise<void> {
  const { error } = await db().from("outfits").delete().eq("id", id);
  if (error) fail("Не удалось удалить образ", error);
}

// ---------- wears ----------

export async function listWears(limitDays = 365): Promise<Wear[]> {
  const since = new Date();
  since.setDate(since.getDate() - limitDays);
  const { data, error } = await db()
    .from("wears")
    .select("*")
    .gte("worn_on", since.toISOString().slice(0, 10))
    .order("worn_on", { ascending: false });
  if (error) fail("Не удалось загрузить историю", error);
  return (data ?? []) as Wear[];
}

export async function addWear(input: { outfit_id?: string | null; item_ids: string[]; worn_on?: string }): Promise<Wear> {
  const { data, error } = await db()
    .from("wears")
    .insert({
      outfit_id: input.outfit_id ?? null,
      item_ids: input.item_ids,
      worn_on: input.worn_on ?? new Date().toISOString().slice(0, 10),
    })
    .select("*")
    .single();
  if (error) fail("Не удалось отметить", error);
  return data as Wear;
}

// ---------- try-on ----------

export async function getTryonProfile(): Promise<TryonProfile | null> {
  const { data, error } = await db().from("tryon_profile").select("*").eq("id", 1).maybeSingle();
  if (error) fail("Не удалось загрузить профиль примерки", error);
  return (data as TryonProfile | null) ?? null;
}

export async function saveTryonProfile(patch: { photo_path?: string | null; zones?: TryonZones | null }): Promise<TryonProfile> {
  const { data, error } = await db()
    .from("tryon_profile")
    .upsert({ id: 1, ...patch, updated_at: new Date().toISOString() }, { onConflict: "id" })
    .select("*")
    .single();
  if (error) fail("Не удалось сохранить профиль примерки", error);
  return data as TryonProfile;
}

export async function listPlacements(): Promise<Placement[]> {
  const { data, error } = await db().from("item_placements").select("*");
  if (error) fail("Не удалось загрузить подгонку", error);
  return (data ?? []) as Placement[];
}

export async function savePlacement(p: Placement): Promise<void> {
  const { error } = await db().from("item_placements").upsert(p, { onConflict: "item_id" });
  if (error) fail("Не удалось сохранить подгонку", error);
}

export async function deletePlacement(itemId: string): Promise<void> {
  const { error } = await db().from("item_placements").delete().eq("item_id", itemId);
  if (error) fail("Не удалось сбросить подгонку", error);
}

// ---------- insights ----------

export async function getLatestInsight<T>(kind: string): Promise<{ id: string; created_at: string; payload: T } | null> {
  const { data, error } = await db()
    .from("insights")
    .select("id, created_at, payload")
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("Не удалось загрузить инсайты", error);
  return (data as { id: string; created_at: string; payload: T } | null) ?? null;
}

export async function saveInsight(kind: string, payload: GapAdvice | Record<string, unknown>): Promise<void> {
  const { error } = await db().from("insights").insert({ kind, payload });
  if (error) fail("Не удалось сохранить инсайты", error);
}

// ---------- trips ----------

export async function listTrips(): Promise<Trip[]> {
  const { data, error } = await db().from("trips").select("*").order("start_date", { ascending: false });
  if (error) fail("Не удалось загрузить поездки", error);
  return (data ?? []) as Trip[];
}

export async function getTrip(id: string): Promise<Trip | null> {
  const { data, error } = await db().from("trips").select("*").eq("id", id).maybeSingle();
  if (error) fail("Не удалось загрузить поездку", error);
  return (data as Trip | null) ?? null;
}

export async function createTrip(input: Omit<Trip, "id" | "created_at">): Promise<Trip> {
  const { data, error } = await db().from("trips").insert(input).select("*").single();
  if (error) fail("Не удалось сохранить поездку", error);
  return data as Trip;
}

export async function updateTrip(id: string, patch: Partial<Trip>): Promise<Trip> {
  const { data, error } = await db().from("trips").update(patch).eq("id", id).select("*").single();
  if (error) fail("Не удалось обновить поездку", error);
  return data as Trip;
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await db().from("trips").delete().eq("id", id);
  if (error) fail("Не удалось удалить поездку", error);
}
