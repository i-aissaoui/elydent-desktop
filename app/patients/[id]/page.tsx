import { getPatient } from "@/app/actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import PatientTabs from "./PatientTabs";
import { serialize } from "@/app/utils";

export default async function PatientValues({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patientData = await getPatient(id);
  const patient = serialize(patientData);

  if (!patient) {
    redirect("/");
  }

  return (
    <div className='max-w-6xl mx-auto space-y-6 pb-20'>
      <div className='flex items-center gap-4 mb-4'>
        <Link
          href='/'
          className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
        >
          <ArrowLeft size={24} className='text-gray-500' />
        </Link>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>
            {patient.firstName} {patient.lastName}
          </h1>
          <p className='text-gray-500 text-sm flex items-center gap-2'>
            <span>{patient.phone}</span>
            {patient.bloodType && (
              <span className='bg-red-50 text-red-600 px-2 rounded text-xs font-bold'>
                {patient.bloodType}
              </span>
            )}
          </p>
        </div>
      </div>

      <PatientTabs patient={patient} />
    </div>
  );
}
