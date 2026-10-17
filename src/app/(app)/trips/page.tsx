import TripsList from "@/components/TripsList";
import { listTrips } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const trips = await listTrips();
  return <TripsList trips={trips} />;
}
