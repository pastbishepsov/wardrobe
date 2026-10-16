import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "wardrobe";

let client: SupabaseClient | null = null;

/** Server-only Supabase client using the service role key. Never import from client components. */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY не заданы в .env.local");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export async function uploadToBucket(path: string, body: ArrayBuffer | Uint8Array | Blob, contentType: string) {
  const { error } = await db().storage.from(BUCKET).upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`Не удалось загрузить файл: ${error.message}`);
  return path;
}

export async function downloadFromBucket(path: string): Promise<Blob> {
  const { data, error } = await db().storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Файл не найден: ${path}`);
  return data;
}

export async function removeFromBucket(paths: string[]) {
  if (!paths.length) return;
  await db().storage.from(BUCKET).remove(paths);
}
