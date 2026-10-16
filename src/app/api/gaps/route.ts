import { buildMatrix, matrixToText } from "@/lib/analysis";
import { aiEnabled, gapAdvice } from "@/lib/anthropic";
import { fail, ok } from "@/lib/api";
import { getLatestInsight, listItems, listWears, saveInsight } from "@/lib/data";
import type { GapAdvice } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  try {
    return ok(await getLatestInsight<GapAdvice>("gaps"));
  } catch (e) {
    return fail(e);
  }
}

export async function POST() {
  if (!aiEnabled()) return fail(new Error("ANTHROPIC_API_KEY не задан — советы выключены"), 503);
  try {
    const [items, wears] = await Promise.all([listItems(), listWears()]);
    if (items.length < 5) return fail(new Error("Добавь хотя бы 5 вещей, иначе анализировать нечего"), 400);
    const advice = await gapAdvice(items, matrixToText(buildMatrix(items)), wears);
    await saveInsight("gaps", advice);
    return ok({ created_at: new Date().toISOString(), payload: advice });
  } catch (e) {
    return fail(e);
  }
}
