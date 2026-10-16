import AddItemFlow from "@/components/AddItemFlow";
import { BackLink } from "@/components/ui";
import { aiEnabled } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

export default function NewItemPage() {
  return (
    <div>
      <BackLink href="/wardrobe" label="Гардероб" />
      <h1 className="mb-4 text-[32px] leading-none">Новая вещь</h1>
      <AddItemFlow aiEnabled={aiEnabled()} />
    </div>
  );
}
