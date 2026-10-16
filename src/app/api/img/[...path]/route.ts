import { downloadFromBucket } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const key = path.map(decodeURIComponent).join("/");
  if (key.includes("..")) return new Response("Bad path", { status: 400 });
  try {
    const blob = await downloadFromBucket(key);
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    return new Response(blob, {
      headers: {
        "Content-Type": TYPES[ext] ?? blob.type ?? "application/octet-stream",
        // Paths contain a random id and never change, so the browser can keep them for a long time.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
