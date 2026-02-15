import { getPatients } from "@/app/actions";
import PatientListClient from "./PatientListClient";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const patients = await getPatients();

  return <PatientListClient initialPatients={patients} />;
}
