import { notFound } from "next/navigation";
import TripView from "@/components/TripView";
import { BackLink } from "@/components/ui";
import { getTrip, listItems } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [trip, items] = await Promise.all([getTrip(id), listItems()]);
  if (!trip) notFound();
  return (
    <div>
      <BackLink href="/trips" label="Поездки" />
      <TripView trip={trip} items={items} />
    </div>
  );
}
