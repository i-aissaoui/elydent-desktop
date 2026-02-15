import { getVisitsByStatus, autoMarkMissedVisits } from "./actions";
import DashboardClient from "./DashboardClient";
import { serialize } from "./utils";
import { Suspense } from "react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;

  // Auto-mark missed visits before fetching
  await autoMarkMissedVisits();

  const today = new Date();
  const localToday =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");
  const dateStr = params.date || localToday;
  const { scheduled, waiting, inProgress, completed, cancelled } =
    await getVisitsByStatus(dateStr);

  return (
    <Suspense
      fallback={
        <div className='p-8 text-center text-gray-500'>
          Chargement du tableau de bord...
        </div>
      }
    >
      <DashboardClient
        initialScheduled={serialize(scheduled)}
        initialWaiting={serialize(waiting)}
        initialInProgress={serialize(inProgress)}
        initialCompleted={serialize(completed)}
        initialCancelled={serialize(cancelled)}
      />
    </Suspense>
  );
}
