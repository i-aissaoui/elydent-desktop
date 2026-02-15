"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Calendar,
  Clock,
  Save,
  Edit3,
  Trash2,
  Upload,
  Plus,
  DollarSign,
  FileText,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Users,
  GripVertical,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  updatePatientDetails,
  createVisit,
  updateVisitStatus,
  updateVisitCost,
  addPayment,
  updateVisitNotes,
  cancelVisit,
  updateVisitTreatment,
  uploadVisitImage,
  deletePayment,
  deleteVisit,
  getDailyCounts,
  deletePatientIfSettled,
} from "@/app/actions";
import DatePicker from "@/app/components/DatePicker";
import Odontogram from "@/app/components/Odontogram";
import ConfirmationModal from "@/app/components/ConfirmationModal";

type Patient = any;
type Visit = any;
type Payment = any;

const TREATMENTS = [
  "Consultation",
  "Détartrage",
  "Extraction Simple",
  "Extraction Chirurgicale",
  "Dévitalisation",
  "Obturation (Plombage)",
  "Prothèse Fixe",
  "Prothèse Amovible",
  "Blanchiment",
  "Autre",
];

const SESSION_TYPE_RECOMMENDATIONS: { [key: string]: string[] } = {
  Soin: [
    "Consultation",
    "Détartrage",
    "Dévitalisation",
    "Obturation",
    "Fluoration",
    "Détection Carie",
    "Nettoyage",
  ],
  ODF: [
    "Consultation Orthodontie",
    "Pose Appareil",
    "Maintenance Appareil",
    "Pose Brackets",
    "Désensibilisation",
    "Suivi Appareil",
  ],
  Chirurgie: [
    "Extraction Simple",
    "Extraction Chirurgicale",
    "Extraction Sagesse",
    "Greffe Osseuse",
    "Implant",
    "Suivi Post-Op",
  ],
  Proteges: [
    "Pause appareil",
    "Maintenance",
    "Adapter appareil",
    "Nettoyage prothèse",
    "Réparation",
    "Nouvelle prothèse",
  ],
};

export default function PatientTabs({ patient }: { patient: Patient }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Early return if patient is null
  if (!patient) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-gray-500'>Chargement du dossier patient...</p>
        </div>
      </div>
    );
  }

  const initialTab = (searchParams.get("tab") as any) || "today";
  const [activeTab, setActiveTab] = useState<
    "info" | "history" | "today" | "planning" | "odontogram" | "dossier"
  >(initialTab);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("Soin");
  const [sessionTypeRecommendations, setSessionTypeRecommendations] = useState<
    string[]
  >(SESSION_TYPE_RECOMMENDATIONS["Soin"]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };
  const [customTreatment, setCustomTreatment] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editingVisit, setEditingVisit] = useState<string | null>(null); // ID of visit being edited
  const [planningDate, setPlanningDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dailyCounts, setDailyCounts] = useState<{ [date: string]: number }>(
    {},
  );
  const [savingTreatment, setSavingTreatment] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingCost, setSavingCost] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [patientDeleteError, setPatientDeleteError] = useState<string | null>(
    null,
  );
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [contacts, setContacts] = useState<{ label: string; phone: string }[]>(
    () => {
      try {
        return patient?.contacts ? JSON.parse(patient.contacts) : [];
      } catch {
        return [];
      }
    },
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImageForPreview, setSelectedImageForPreview] = useState<
    string | null
  >(null);
  const [previewingImageIndex, setPreviewingImageIndex] = useState<
    number | null
  >(null);
  const [selectedPaymentForInvoice, setSelectedPaymentForInvoice] =
    useState<Payment | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => void) | null;
  }>({ isOpen: false, title: "", message: "", action: null });

  // Filter visits - add null safety checks
  const todayDate = new Date().toDateString();
  const visits = patient?.visits || [];
  const todayVisit = visits.find(
    (v: Visit) =>
      new Date(v.date).toDateString() === todayDate &&
      v.status !== "CANCELLED" &&
      v.status !== "COMPLETED",
  );

  const historyVisits = visits.filter((v: Visit) => v.id !== todayVisit?.id);

  const completedVisits = historyVisits.filter(
    (v: Visit) => v.status === "COMPLETED",
  );
  const upcomingVisits = historyVisits.filter(
    (v: Visit) => v.status !== "COMPLETED" && v.status !== "CANCELLED",
  );
  const cancelledVisits = historyVisits.filter(
    (v: Visit) => v.status === "CANCELLED",
  );

  // Handlers
  const handleUpload = async (
    visitId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files?.[0]) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("visitId", visitId);
    formData.append("file", e.target.files[0]);
    formData.append("patientId", patient.id);

    await uploadVisitImage(formData);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Calculate Financials - add null safety
  const activeVisits = visits.filter((v: Visit) => v.status !== "CANCELLED");
  const totalCost = activeVisits.reduce(
    (sum: number, v: Visit) => sum + Number(v.cost || 0),
    0,
  );
  const totalPaid = activeVisits.reduce(
    (sum: number, v: Visit) => sum + Number(v.paid || 0),
    0,
  );
  const balance = totalCost - totalPaid;

  return (
    <div className='bg-white rounded-2xl shadow-sm border border-border min-h-[600px] flex flex-col'>
      {/* --- Financial Header (Global State) --- */}
      <div className='p-8 bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 text-white rounded-t-2xl flex flex-col md:flex-row justify-between items-center gap-6'>
        <div>
          <h1 className='text-3xl font-black'>
            {patient.firstName} {patient.lastName}
          </h1>
          <p className='text-gray-200 text-sm flex items-center gap-2 mt-2'>
            <span>📁 Dossier #{patient.id.slice(-4)}</span> •
            <span>📱 {patient.phone}</span>
          </p>

          <div className='mt-3'>
            <button
              type='button'
              disabled={isDeletingPatient}
              onClick={async () => {
                setPatientDeleteError(null);
                const ok = confirm(
                  "Supprimer définitivement ce client et tous ses documents/images de séances ? Cette action est irréversible.",
                );
                if (!ok) return;

                setIsDeletingPatient(true);
                try {
                  const result = await deletePatientIfSettled(patient.id);
                  if (!result?.success) {
                    setPatientDeleteError(
                      result?.error || "Suppression impossible.",
                    );
                    return;
                  }
                  router.push("/patients");
                  router.refresh();
                } finally {
                  setIsDeletingPatient(false);
                }
              }}
              className='px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white disabled:opacity-50'
            >
              {isDeletingPatient ? "Suppression..." : "Supprimer client"}
            </button>
          </div>

          {patientDeleteError && (
            <p className='mt-2 text-xs font-bold text-red-200'>
              {patientDeleteError}
            </p>
          )}
        </div>

        <div className='flex gap-4 flex-wrap'>
          <div className='bg-white/15 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 text-right hover:bg-white/25 transition-all transform hover:scale-105'>
            <span className='text-xs text-gray-100 block uppercase tracking-wider font-bold'>
              💳 À Percevoir
            </span>
            <span className='font-black text-2xl text-amber-300'>
              {totalCost.toLocaleString()} DA
            </span>
          </div>
          <div className='bg-white/15 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 text-right hover:bg-white/25 transition-all transform hover:scale-105'>
            <span className='text-xs text-gray-100 block uppercase tracking-wider font-bold'>
              ✓ Versé
            </span>
            <span className='font-black text-2xl text-green-300'>
              {totalPaid.toLocaleString()} DA
            </span>
          </div>
          <div
            className={`px-6 py-4 rounded-2xl backdrop-blur-md border-2 text-right transition-all transform hover:scale-105 ${balance > 0 ? "bg-red-500/30 border-red-300/50" : "bg-green-500/30 border-green-300/50"}`}
          >
            <span
              className={`text-xs block uppercase tracking-wider font-bold ${balance > 0 ? "text-red-100" : "text-green-100"}`}
            >
              Solde
            </span>
            <span
              className={`font-black text-2xl ${balance > 0 ? "text-red-200" : "text-green-200"}`}
            >
              {balance.toLocaleString()} DA
            </span>
          </div>
        </div>
      </div>

      <div className='flex border-b-2 border-gray-200 sticky top-0 bg-white z-10 shadow-md overflow-x-auto'>
        <button
          onClick={() => handleTabChange("today")}
          className={`flex-1 min-w-[120px] py-4 text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === "today" ? "text-blue-900 border-b-4 border-blue-600 bg-blue-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
          style={activeTab === "today" ? { borderBottomColor: "#2563EB" } : {}}
        >
          <Clock size={18} />
          ⏱️ Séance
          {todayVisit && (
            <span className='bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black'>
              En cours
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange("odontogram")}
          className={`flex-1 min-w-[120px] py-4 text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === "odontogram" ? "text-cyan-900 border-b-4 border-cyan-600 bg-cyan-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
          style={
            activeTab === "odontogram" ? { borderBottomColor: "#0891B2" } : {}
          }
        >
          <Plus size={18} className='rotate-45' />
          🦷 Dossier Dentaire
          {patient.teeth?.length > 0 && (
            <span className='bg-cyan-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black'>
              {patient.teeth.length}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange("history")}
          className={`flex-1 min-w-[120px] py-4 text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === "history" ? "text-amber-900 border-b-4 border-amber-600 bg-amber-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
          style={
            activeTab === "history" ? { borderBottomColor: "#D97706" } : {}
          }
        >
          <Calendar size={18} />
          📅 Historique ({historyVisits.length})
        </button>
        <button
          onClick={() => {
            handleTabChange("planning");
            getDailyCounts(planningDate, 1).then((counts) =>
              setDailyCounts((prev) => ({ ...prev, ...counts })),
            );
          }}
          className={`flex-1 min-w-[120px] py-4 text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === "planning" ? "text-emerald-900 border-b-4 border-emerald-600 bg-emerald-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
          style={
            activeTab === "planning" ? { borderBottomColor: "#059669" } : {}
          }
        >
          <Plus size={18} />
          📅 Rendez-vous
        </button>
        <button
          onClick={() => handleTabChange("info")}
          className={`flex-1 min-w-[120px] py-4 text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === "info" ? "text-purple-900 border-b-4 border-purple-600 bg-purple-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
          style={activeTab === "info" ? { borderBottomColor: "#7C3AED" } : {}}
        >
          <User size={18} />
          👤 Fiche Patient
        </button>
      </div>

      {/* Content */}
      <div className='p-6 flex-1 bg-gray-50/30'>
        {/* --- TAB: ODONTOGRAM --- */}
        {activeTab === "odontogram" && (
          <div className='animate-in fade-in slide-in-from-bottom-4 duration-500'>
            <Odontogram
              patientId={patient.id}
              initialTeeth={patient.teeth || []}
              dentitionType={patient.dentitionType}
            />
          </div>
        )}

        {/* --- TAB: TODAY --- */}
        {activeTab === "today" && (
          <div className='max-w-4xl mx-auto'>
            {todayVisit ? (
              <div className='space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 relative'>
                {lastSaved && (
                  <div className='fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-primary text-white px-6 py-3 rounded-full shadow-2xl font-black text-sm flex items-center gap-2 animate-in slide-in-from-top-4 zoom-in duration-300'>
                    <CheckCircle size={18} />
                    {lastSaved}
                  </div>
                )}
                {/* Status Bar */}
                <div className='bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-6 justify-between items-center'>
                  <div className='flex items-center gap-4'>
                    <div className='bg-primary/10 p-3 rounded-2xl text-primary'>
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h2 className='text-xl font-black text-gray-900'>
                        {new Date().toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </h2>
                      <div className='flex items-center gap-2 mt-1'>
                        <span
                          className={`w-2 h-2 rounded-full animate-pulse ${todayVisit.status === "IN_PROGRESS" ? "bg-green-500" : "bg-amber-500"}`}
                        />
                        <p className='text-xs font-bold text-gray-500 uppercase tracking-widest'>
                          Statut:{" "}
                          <span className='text-primary'>
                            {todayVisit.status === "SCHEDULED"
                              ? "Prévu"
                              : todayVisit.status === "WAITING"
                                ? "En Attente"
                                : "En Cours"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='text-right px-4 border-r border-gray-100'>
                      <span className='text-[10px] font-black text-gray-400 uppercase tracking-widest block'>
                        Prix Prévu
                      </span>
                      <span className='text-lg font-black text-gray-900'>
                        {Number(todayVisit.cost).toLocaleString()} DA
                      </span>
                    </div>
                    <div className='text-right px-4'>
                      <span className='text-[10px] font-black text-gray-400 uppercase tracking-widest block'>
                        Déjà Versé
                      </span>
                      <span className='text-lg font-black text-green-600'>
                        {Number(todayVisit.paid).toLocaleString()} DA
                      </span>
                    </div>
                  </div>
                </div>

                {/* Specialty & Description Banner */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='p-2 bg-blue-50 text-blue-600 rounded-lg'>
                        <GripVertical size={16} />
                      </div>
                      <div>
                        <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest'>
                          Service / Spécialité
                        </p>
                        <p className='font-bold text-gray-900'>
                          {todayVisit.specialty || "Général"}
                        </p>
                      </div>
                    </div>
                    {todayVisit.sessionType && (
                      <span className='bg-blue-100 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full uppercase'>
                        {todayVisit.sessionType}
                      </span>
                    )}
                  </div>
                  <div className='bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm flex items-start gap-3'>
                    <div className='p-2 bg-amber-100 text-amber-600 rounded-lg'>
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className='text-[10px] font-black text-amber-700/60 uppercase tracking-widest'>
                        Note Pré-séance
                      </p>
                      <p className='text-sm font-medium text-amber-900 italic line-clamp-2'>
                        {todayVisit.description ||
                          "Aucune description pré-remplie."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  {/* Treatment & Notes */}
                  <div className='space-y-4'>
                    <div className='bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-2xl border-2 border-red-200 shadow-sm'>
                      <h3 className='text-sm font-black text-red-900 uppercase mb-3 flex items-center gap-2'>
                        <FileText size={16} className='text-red-600' /> 🩺 Acte
                        / Soin
                      </h3>
                      <form
                        action={async (formData) => {
                          setSavingTreatment(true);
                          try {
                            await updateVisitTreatment(formData);
                            setLastSaved("Acte enregistré");
                            setTimeout(() => setLastSaved(null), 2000);
                          } finally {
                            setSavingTreatment(false);
                          }
                        }}
                        className='space-y-3'
                      >
                        <input
                          type='hidden'
                          name='visitId'
                          value={todayVisit.id}
                        />
                        <input
                          type='hidden'
                          name='patientId'
                          value={patient.id}
                        />
                        <div className='relative'>
                          <select
                            name='treatment'
                            disabled={savingTreatment}
                            defaultValue={
                              TREATMENTS.includes(todayVisit.treatment)
                                ? todayVisit.treatment
                                : "Autre"
                            }
                            onChange={(e) =>
                              e.target.value === "Autre"
                                ? setCustomTreatment("")
                                : setCustomTreatment(e.target.value)
                            }
                            className='w-full p-3 border-2 border-red-300 rounded-xl text-sm font-semibold focus:border-red-600 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:opacity-50 bg-white'
                          >
                            {TREATMENTS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          {savingTreatment && (
                            <div className='absolute right-8 top-1/2 -translate-y-1/2 animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent' />
                          )}
                        </div>

                        {(!TREATMENTS.includes(todayVisit.treatment) ||
                          customTreatment !== "") && (
                          <input
                            name='customTreatment'
                            disabled={savingTreatment}
                            defaultValue={
                              !TREATMENTS.includes(todayVisit.treatment)
                                ? todayVisit.treatment
                                : ""
                            }
                            placeholder="Préciser l'acte..."
                            className='w-full p-3 border-2 border-red-300 rounded-xl text-sm font-semibold focus:border-red-600 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:opacity-50 bg-white'
                          />
                        )}
                        <button
                          disabled={savingTreatment}
                          className='w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-black rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2'
                        >
                          {savingTreatment
                            ? "📝 Enregistrement..."
                            : "✓ Enregistrer l'acte"}
                        </button>
                      </form>
                    </div>

                    <div className='bg-gradient-to-br from-yellow-50 to-amber-50 p-6 rounded-2xl border-2 border-yellow-200 shadow-sm'>
                      <h3 className='text-sm font-black text-amber-900 uppercase mb-3 flex items-center gap-2'>
                        <FileText size={16} className='text-amber-600' /> 📋
                        Notes Cliniques
                      </h3>
                      <form
                        action={async (formData) => {
                          setSavingNotes(true);
                          try {
                            await updateVisitNotes(formData);
                            setLastSaved("Notes sauvegardées");
                            setTimeout(() => setLastSaved(null), 2000);
                          } finally {
                            setSavingNotes(false);
                          }
                        }}
                      >
                        <input
                          type='hidden'
                          name='visitId'
                          value={todayVisit.id}
                        />
                        <input
                          type='hidden'
                          name='patientId'
                          value={patient.id}
                        />
                        <div className='relative'>
                          <textarea
                            name='notes'
                            disabled={savingNotes}
                            defaultValue={todayVisit.notes || ""}
                            rows={10}
                            className='w-full p-4 border-2 border-yellow-300 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-yellow-300 focus:border-yellow-500 focus:outline-none resize-none bg-yellow-50 shadow-inner disabled:opacity-50'
                            placeholder='Détails du traitement, observations cliniques...'
                          />
                          {savingNotes && (
                            <div className='absolute right-4 bottom-4 flex items-center gap-2 text-[10px] font-black text-amber-700 bg-white/90 px-3 py-1.5 rounded-full shadow-md animate-pulse'>
                              <div className='h-2 w-2 rounded-full bg-amber-600 animate-ping' />
                              Sauvegarde...
                            </div>
                          )}
                        </div>
                        <button
                          disabled={savingNotes}
                          className='mt-4 w-full bg-gradient-to-r from-amber-600 to-yellow-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50'
                        >
                          {savingNotes ? (
                            <>
                              <div className='h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                              Enregistrement...
                            </>
                          ) : (
                            <>💾 Sauvegarder les notes</>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Bottom Control Actions (Finish/Cancel) */}
                    <div className='flex gap-3'>
                      {todayVisit.status !== "IN_PROGRESS" && (
                        <form
                          action={updateVisitStatus.bind(
                            null,
                            todayVisit.id,
                            "IN_PROGRESS",
                          )}
                          className='flex-1'
                        >
                          <button className='w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:shadow-lg text-white py-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95'>
                            ⏱️ Reprendre
                          </button>
                        </form>
                      )}
                      <form
                        action={updateVisitStatus.bind(
                          null,
                          todayVisit.id,
                          "COMPLETED",
                        )}
                        className='flex-[2]'
                      >
                        <button className='w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:shadow-lg text-white py-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95'>
                          ✓ Terminer la Séance
                        </button>
                      </form>
                      <form action={cancelVisit}>
                        <input
                          type='hidden'
                          name='visitId'
                          value={todayVisit.id}
                        />
                        <input
                          type='hidden'
                          name='patientId'
                          value={patient.id}
                        />
                        <button
                          className='p-4 bg-red-100 hover:bg-red-200 text-red-600 rounded-2xl transition-all shadow-md font-black'
                          title='Annuler le rendez-vous'
                        >
                          ✕
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Payment & Images */}
                  <div className='space-y-4'>
                    <div className='bg-white p-5 rounded-xl border border-gray-200 shadow-sm'>
                      <h3 className='text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2'>
                        <DollarSign size={16} /> Paiement
                      </h3>

                      <div className='grid grid-cols-2 gap-4 mb-4'>
                        <div className='bg-gray-50 p-3 rounded-lg text-center'>
                          <span className='text-xs text-gray-500 block mb-1'>
                            Prix (DA)
                          </span>
                          <form
                            action={async (formData) => {
                              setSavingCost(true);
                              try {
                                await updateVisitCost(formData);
                                setLastSaved("Prix mis à jour");
                                setTimeout(() => setLastSaved(null), 2000);
                              } finally {
                                setSavingCost(false);
                              }
                            }}
                            className='relative'
                          >
                            <input
                              type='hidden'
                              name='visitId'
                              value={todayVisit.id}
                            />
                            <input
                              type='hidden'
                              name='patientId'
                              value={patient.id}
                            />
                            <input
                              name='cost'
                              disabled={savingCost}
                              defaultValue={Number(todayVisit.cost)}
                              onBlur={(e) => e.target.form?.requestSubmit()}
                              className='w-full text-center bg-transparent font-bold text-xl focus:outline-none focus:border-b border-primary disabled:opacity-50'
                            />
                            {savingCost && (
                              <div className='absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin' />
                            )}
                          </form>
                        </div>
                        <div className='bg-gray-50 p-3 rounded-lg text-center'>
                          <span className='text-xs text-gray-500 block mb-1'>
                            Total Payé (DA)
                          </span>
                          <span
                            className={`block font-bold text-xl ${Number(todayVisit.paid) >= Number(todayVisit.cost) && Number(todayVisit.cost) > 0 ? "text-green-600" : "text-gray-800"}`}
                          >
                            {Number(todayVisit.paid)}
                          </span>
                        </div>
                      </div>

                      <form action={addPayment} className='flex gap-2'>
                        <input
                          type='hidden'
                          name='visitId'
                          value={todayVisit.id}
                        />
                        <input
                          type='hidden'
                          name='patientId'
                          value={patient.id}
                        />
                        <input
                          name='amount'
                          type='number'
                          placeholder='Montant à encaisser...'
                          className='flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:border-primary focus:outline-none'
                        />
                        <button className='bg-primary text-white px-3 rounded-lg hover:bg-purple-800 font-bold'>
                          +
                        </button>
                      </form>
                    </div>

                    <div className='bg-white p-5 rounded-xl border border-gray-200 shadow-sm'>
                      <h3 className='text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2'>
                        <Upload size={16} /> Images / Radio
                      </h3>

                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors flex flex-col items-center justify-center gap-2'
                      >
                        <Upload size={24} className='text-gray-400' />
                        <span className='text-xs text-gray-500'>
                          {isUploading
                            ? "Envoi..."
                            : "Cliquez pour ajouter une image"}
                        </span>
                      </div>
                      <input
                        type='file'
                        ref={fileInputRef}
                        className='hidden'
                        accept='image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv'
                        onChange={(e) => handleUpload(todayVisit.id, e)}
                      />

                      {todayVisit.images && (
                        <div className='grid grid-cols-3 gap-2 mt-4'>
                          {JSON.parse(todayVisit.images).map(
                            (img: string, idx: number) => (
                              <div
                                key={idx}
                                className='relative aspect-square rounded overflow-hidden border border-gray-200 group'
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img}
                                  alt='Document'
                                  className='object-cover w-full h-full cursor-pointer hover:opacity-75 transition-opacity'
                                  onClick={() =>
                                    setSelectedImageForPreview(img)
                                  }
                                />
                                <div className='absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100'>
                                  <button
                                    onClick={() =>
                                      setSelectedImageForPreview(img)
                                    }
                                    className='p-2 bg-white hover:bg-blue-100 rounded-lg transition-colors'
                                    title='Voir'
                                  >
                                    <Eye size={18} className='text-blue-600' />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const images = JSON.parse(
                                        todayVisit.images,
                                      );
                                      const newImages = images.filter(
                                        (_: string, i: number) => i !== idx,
                                      );
                                      await updateVisitNotes(
                                        new FormData(
                                          Object.assign(
                                            document.createElement("form"),
                                            {
                                              elements: [
                                                {
                                                  name: "visitId",
                                                  value: todayVisit.id,
                                                },
                                                {
                                                  name: "patientId",
                                                  value: patient.id,
                                                },
                                                {
                                                  name: "notes",
                                                  value: todayVisit.notes || "",
                                                },
                                                {
                                                  name: "images",
                                                  value:
                                                    JSON.stringify(newImages),
                                                },
                                              ],
                                            },
                                          ),
                                        ),
                                      );
                                      router.refresh();
                                    }}
                                    className='p-2 bg-white hover:bg-red-100 rounded-lg transition-colors'
                                    title='Supprimer'
                                  >
                                    <Trash2
                                      size={18}
                                      className='text-red-600'
                                    />
                                  </button>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200'>
                <Calendar size={48} className='text-gray-300 mb-4' />
                <h2 className='text-xl font-bold text-gray-700 mb-2'>
                  Aucune séance aujourd&apos;hui
                </h2>
                <p className='text-gray-500 mb-8'>
                  Le patient n&apos;a pas de rendez-vous programmé ce jour.
                  Dossier prêt.
                </p>

                <form
                  action={async (formData) => {
                    if (isSubmitting) return;
                    setIsSubmitting(true);
                    try {
                      await createVisit(formData);
                      setShowSuccess(new Date().toISOString().split("T")[0]);
                      setTimeout(() => setShowSuccess(null), 3000);
                      router.refresh();
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className='w-full max-w-2xl space-y-6 bg-gray-50 p-8 rounded-xl border-2 border-gray-200'
                >
                  <input type='hidden' name='patientId' value={patient.id} />
                  <input
                    type='hidden'
                    name='date'
                    value={new Date().toISOString().split("T")[0]}
                  />

                  <div className='grid grid-cols-2 gap-4'>
                    {/* Specialty */}
                    <div className='space-y-2'>
                      <label className='text-sm font-bold text-gray-700 ml-1'>
                        Spécialité
                      </label>
                      <select
                        name='specialty'
                        required
                        onChange={(e) => {
                          setSelectedSpecialty(e.target.value);
                          setSessionTypeRecommendations(
                            SESSION_TYPE_RECOMMENDATIONS[e.target.value] || [],
                          );
                        }}
                        className='w-full p-4 bg-white border-2 border-gray-300 rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all font-medium text-gray-900'
                      >
                        <option value=''>Sélectionnez une spécialité</option>
                        <option value='Soin'>🔴 Soin</option>
                        <option value='ODF'>🔵 ODF</option>
                        <option value='Chirurgie'>🟢 Chirurgie</option>
                        <option value='Proteges'>🟡 Protège</option>
                      </select>
                    </div>

                    {/* Session Type */}
                    <div className='space-y-2'>
                      <label className='text-sm font-bold text-gray-700 ml-1'>
                        Type de Séance
                      </label>
                      <div className='space-y-2'>
                        <input
                          name='sessionType'
                          list='sessionType-suggestions-today'
                          placeholder='Tapez ou sélectionnez...'
                          className='w-full p-4 bg-white border-2 border-gray-300 rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all font-medium text-gray-900'
                        />
                        <datalist id='sessionType-suggestions-today'>
                          {sessionTypeRecommendations.map((type) => (
                            <option key={type} value={type} />
                          ))}
                        </datalist>
                        {sessionTypeRecommendations.length > 0 && (
                          <div className='flex flex-wrap gap-2 mt-2'>
                            {sessionTypeRecommendations
                              .slice(0, 3)
                              .map((type) => (
                                <button
                                  key={type}
                                  type='button'
                                  onClick={() => {
                                    const input = document.querySelector(
                                      '[name="sessionType"]',
                                    ) as HTMLInputElement;
                                    if (input) input.value = type;
                                  }}
                                  className='text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-bold hover:bg-blue-200 transition-colors cursor-pointer'
                                >
                                  {type}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Treatment */}
                  <div className='space-y-2'>
                    <label className='text-sm font-bold text-gray-700 ml-1'>
                      Motif / Traitement
                    </label>
                    <input
                      name='treatment'
                      list='treatment-list-today'
                      placeholder='Ex: Détartrage, Consultation...'
                      className='w-full p-4 bg-white border-2 border-gray-300 rounded-2xl focus:border-primary focus:bg-white focus:outline-none transition-all font-medium'
                      required
                    />
                    <datalist id='treatment-list-today'>
                      {TREATMENTS.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>

                  {/* Description */}
                  <div className='space-y-2'>
                    <label className='text-sm font-bold text-gray-700 ml-1'>
                      Description / Notes Pré-séance
                    </label>
                    <textarea
                      name='description'
                      placeholder='Notes, observations, antécédents pertinents...'
                      className='w-full p-4 bg-white border-2 border-gray-300 rounded-2xl focus:border-primary focus:bg-white focus:outline-none transition-all font-medium resize-none'
                      rows={3}
                    />
                  </div>

                  {/* Cost */}
                  <div className='space-y-2'>
                    <label className='text-sm font-bold text-gray-700 ml-1'>
                      Coût Estimé (DA)
                    </label>
                    <input
                      type='number'
                      name='cost'
                      placeholder='0'
                      defaultValue='0'
                      className='w-full p-4 bg-white border-2 border-gray-300 rounded-2xl focus:border-primary focus:bg-white focus:outline-none transition-all font-medium'
                    />
                  </div>

                  <button
                    type='submit'
                    disabled={isSubmitting}
                    className='w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-4 rounded-lg hover:shadow-lg font-black shadow-lg shadow-blue-200 transition-all transform hover:scale-105 flex items-center justify-center gap-2 uppercase text-sm tracking-wider disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    🚀 Démarrer une séance
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* --- TAB: HISTORY (Segmented) --- */}
        {activeTab === "history" && (
          <div className='space-y-8'>
            {/* 1. Visites À venir / En cours */}
            {upcomingVisits.length > 0 && (
              <section className='space-y-3'>
                <h3 className='text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-4'>
                  <Clock size={16} /> À venir / En cours (
                  {upcomingVisits.length})
                </h3>
                <div className='grid grid-cols-1 gap-3'>
                  {upcomingVisits.map((visit: Visit) => (
                    <VisitHistoryCard
                      key={visit.id}
                      visit={visit}
                      patient={patient}
                      onPaymentClick={setSelectedPaymentForInvoice}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 2. Visites Effectuées */}
            <section className='space-y-3'>
              <h3 className='text-sm font-black text-green-600 uppercase tracking-widest flex items-center gap-2 mb-4'>
                <CheckCircle size={16} /> Visites Effectuées (
                {completedVisits.length})
              </h3>
              {completedVisits.length === 0 ? (
                <div className='bg-white p-6 rounded-2xl border-2 border-dashed border-gray-100 text-center text-gray-400'>
                  <p className='text-sm'>
                    Aucune visite effectuée pour le moment.
                  </p>
                </div>
              ) : (
                <div className='grid grid-cols-1 gap-3'>
                  {completedVisits.map((visit: Visit) => (
                    <VisitHistoryCard
                      key={visit.id}
                      visit={visit}
                      patient={patient}
                      onPaymentClick={setSelectedPaymentForInvoice}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* 3. Visites Annulées */}
            {cancelledVisits.length > 0 && (
              <section className='space-y-3'>
                <h3 className='text-sm font-black text-red-400 uppercase tracking-widest flex items-center gap-2 mb-4'>
                  <X size={16} /> Historique des Annulations (
                  {cancelledVisits.length})
                </h3>
                <div className='grid grid-cols-1 gap-3 opacity-60'>
                  {cancelledVisits.map((visit: Visit) => (
                    <VisitHistoryCard
                      key={visit.id}
                      visit={visit}
                      patient={patient}
                      onPaymentClick={setSelectedPaymentForInvoice}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* --- TAB: PLANNING --- */}
        {activeTab === "planning" && (
          <div className='max-w-xl mx-auto py-8'>
            <div className='bg-white p-8 rounded-3xl shadow-xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500'>
              <div className='mb-8 text-center'>
                <div className='inline-flex p-4 bg-primary/10 text-primary rounded-2xl mb-4'>
                  <Calendar size={32} />
                </div>
                <h3 className='text-2xl font-black text-gray-900 tracking-tight'>
                  Programmer un Rendez-vous
                </h3>
                <p className='text-gray-500 font-medium mt-1'>
                  Ajouter une nouvelle séance pour ce patient
                </p>
              </div>

              <form
                action={async (formData) => {
                  if (isSubmitting) return;
                  setIsSubmitting(true);
                  try {
                    await createVisit(formData);
                    setShowSuccess(planningDate);
                    setTimeout(() => setShowSuccess(null), 3000);
                    router.refresh();
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className='space-y-6'
              >
                <input type='hidden' name='patientId' value={patient.id} />

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <label className='text-sm font-bold text-gray-700 ml-1'>
                      Spécialité
                    </label>
                    <select
                      name='specialty'
                      required
                      id='specialty-select'
                      onChange={(e) => {
                        setSelectedSpecialty(e.target.value);
                        setSessionTypeRecommendations(
                          SESSION_TYPE_RECOMMENDATIONS[e.target.value] || [],
                        );
                      }}
                      className='w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all font-medium text-gray-900'
                    >
                      <option value='Soin'>🔴 Soin</option>
                      <option value='ODF'>🔵 ODF</option>
                      <option value='Chirurgie'>🟢 Chirurgie</option>
                      <option value='Proteges'>🟡 Protège</option>
                    </select>
                  </div>
                  <div className='space-y-2'>
                    <label className='text-sm font-bold text-gray-700 ml-1'>
                      Type de Séance
                    </label>
                    <div className='space-y-2'>
                      <input
                        name='sessionType'
                        list='sessionType-suggestions'
                        placeholder='Tapez ou sélectionnez...'
                        className='w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all font-medium text-gray-900'
                      />
                      <datalist id='sessionType-suggestions'>
                        {sessionTypeRecommendations.map((type) => (
                          <option key={type} value={type} />
                        ))}
                      </datalist>
                      {sessionTypeRecommendations.length > 0 && (
                        <div className='flex flex-wrap gap-2 mt-2'>
                          {sessionTypeRecommendations
                            .slice(0, 4)
                            .map((type) => (
                              <button
                                key={type}
                                type='button'
                                onClick={() => {
                                  const input = document.querySelector(
                                    '[name="sessionType"]',
                                  ) as HTMLInputElement;
                                  if (input) input.value = type;
                                }}
                                className='text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-bold hover:bg-blue-200 transition-colors cursor-pointer'
                              >
                                {type}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className='space-y-2'>
                  <label className='text-sm font-bold text-gray-700 ml-1'>
                    Motif / Traitement
                  </label>
                  <input
                    name='treatment'
                    list='treatment-list'
                    placeholder='Ex: Détartrage, Consultation...'
                    className='w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white focus:outline-none transition-all font-medium'
                    required
                  />
                  <datalist id='treatment-list'>
                    {TREATMENTS.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div className='space-y-2'>
                  <label className='text-sm font-bold text-gray-700 ml-1'>
                    Description / Notes Pré-séance
                  </label>
                  <textarea
                    name='description'
                    placeholder='Détails importants avant de commencer...'
                    rows={3}
                    className='w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white focus:outline-none transition-all font-medium resize-none text-sm'
                  />
                </div>

                <div className='space-y-4'>
                  <label className='text-sm font-bold text-gray-700 ml-1'>
                    Date du rendez-vous (Français)
                  </label>
                  <div className='bg-white border-2 border-gray-100 rounded-3xl p-1 shadow-inner overflow-hidden'>
                    <DatePicker
                      selectedDate={planningDate}
                      onChange={(date) => {
                        setPlanningDate(date);
                        getDailyCounts(date, 1).then((counts) =>
                          setDailyCounts((prev) => ({ ...prev, ...counts })),
                        );
                      }}
                    />
                  </div>
                  <input type='hidden' name='date' value={planningDate} />

                  {dailyCounts[planningDate] !== undefined && (
                    <div
                      className={`mt-3 p-4 rounded-2xl flex items-center justify-between border ${dailyCounts[planningDate] > 10 ? "bg-red-50 border-red-100 text-red-700" : "bg-blue-50 border-blue-100 text-blue-700"}`}
                    >
                      <div className='flex items-center gap-3'>
                        <div
                          className={`p-2 rounded-lg ${dailyCounts[planningDate] > 10 ? "bg-red-100" : "bg-blue-100"}`}
                        >
                          <Users size={16} />
                        </div>
                        <div>
                          <p className='text-xs font-bold uppercase tracking-wider opacity-60'>
                            Charge du jour
                          </p>
                          <p className='text-sm font-black'>
                            {dailyCounts[planningDate]} RDVs prévus
                          </p>
                        </div>
                      </div>
                      {dailyCounts[planningDate] > 10 && (
                        <span className='text-[10px] font-bold bg-red-100 px-2 py-1 rounded-full'>
                          Surchargé
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {showSuccess && (
                  <div className='bg-green-500 text-white p-4 rounded-2xl flex items-center justify-center gap-2 animate-in zoom-in duration-300'>
                    <CheckCircle size={20} />
                    <span className='font-bold text-sm'>
                      Rendez-vous ajouté au{" "}
                      {new Date(showSuccess).toLocaleDateString("fr-FR")} ✅
                    </span>
                  </div>
                )}

                <button
                  type='submit'
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 mt-4 ${isSubmitting ? "bg-gray-400 text-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5"}`}
                >
                  {isSubmitting ? (
                    <Clock className='animate-spin' size={22} />
                  ) : (
                    <CheckCircle size={22} />
                  )}
                  {isSubmitting
                    ? "Traitement..."
                    : "✅ Confirmer le Rendez-vous"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- TAB: INFO (Comprehensive) --- */}
        {activeTab === "info" && (
          <div className='max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-in fade-in'>
            <form action={updatePatientDetails} className='space-y-8'>
              <input type='hidden' name='id' value={patient.id} />

              {/* 1. État Civil */}
              <section>
                <h3 className='text-lg font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4 flex items-center gap-2'>
                  <User size={20} className='text-primary' /> État Civil
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='space-y-1'>
                    <label className='text-xs font-bold text-gray-500 uppercase'>
                      Prénom
                    </label>
                    <input
                      name='firstName'
                      defaultValue={patient.firstName}
                      className='w-full border p-2.5 rounded-lg bg-gray-50 text-gray-700 font-medium'
                      disabled
                    />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-xs font-bold text-gray-500 uppercase'>
                      Nom
                    </label>
                    <input
                      name='lastName'
                      defaultValue={patient.lastName}
                      className='w-full border p-2.5 rounded-lg bg-gray-50 text-gray-700 font-medium'
                      disabled
                    />
                  </div>

                  <div className='space-y-1'>
                    <label className='text-xs font-bold text-gray-500 uppercase'>
                      Genre
                    </label>
                    <select
                      name='gender'
                      defaultValue={patient.gender || ""}
                      className='w-full border p-2.5 rounded-lg bg-white focus:border-primary focus:outline-none'
                    >
                      <option value=''>Sélectionner...</option>
                      <option value='Homme'>Homme</option>
                      <option value='Femme'>Femme</option>
                      <option value='Enfant'>Enfant</option>
                    </select>
                  </div>

                  <div className='space-y-1'>
                    <label className='text-xs font-bold text-gray-500 uppercase'>
                      Date de Naissance
                    </label>
                    <input
                      name='birthDate'
                      type='date'
                      defaultValue={
                        patient.birthDate
                          ? new Date(patient.birthDate)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      className='w-full border p-2.5 rounded-lg focus:border-primary focus:outline-none'
                    />
                  </div>
                </div>
              </section>

              {/* 2. Contact Principal & Additionnels */}
              <section>
                <h3 className='text-lg font-bold text-gray-900 border-b-2 border-blue-500 pb-2 mb-4 flex items-center gap-2'>
                  <Clock size={20} className='text-blue-500' /> Contacts &
                  Coordonnées
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='space-y-1'>
                    <label className='text-xs font-bold text-gray-900 uppercase'>
                      Téléphone (Principal){" "}
                      <span className='text-red-500'>*</span>
                    </label>
                    <input
                      name='phone'
                      defaultValue={patient.phone}
                      className='w-full border-2 border-blue-300 p-3 rounded-xl font-black text-lg focus:border-blue-500 focus:outline-none'
                    />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-xs font-bold text-gray-500 uppercase'>
                      Email
                    </label>
                    <input
                      name='email'
                      defaultValue={patient.email || ""}
                      className='w-full border p-3 rounded-xl focus:border-primary focus:outline-none'
                      placeholder='email@exemple.com'
                    />
                  </div>
                  <div className='md:col-span-2 space-y-4'>
                    <label className='text-xs font-bold text-gray-500 uppercase flex items-center gap-2'>
                      Numéros Additionnels (Parents, Travail...)
                      <span className='text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black'>
                        MULTI-CONTACT
                      </span>
                    </label>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      {contacts.map((c, idx) => (
                        <div
                          key={idx}
                          className='flex gap-2 animate-in slide-in-from-left-2 duration-200'
                        >
                          <input
                            placeholder='Étiquette (ex: Père)'
                            value={c.label}
                            onChange={(e) => {
                              const newC = [...contacts];
                              newC[idx].label = e.target.value;
                              setContacts(newC);
                            }}
                            className='w-1/3 p-2 text-xs font-bold border rounded-xl focus:border-primary focus:outline-none'
                          />
                          <input
                            placeholder='0660707796'
                            value={c.phone}
                            onChange={(e) => {
                              const newC = [...contacts];
                              const digits = e.target.value.replace(/\D/g, "");
                              if (digits.startsWith("213")) {
                                newC[idx].phone = `0${digits.slice(3)}`.slice(
                                  0,
                                  10,
                                );
                              } else if (digits.startsWith("0")) {
                                newC[idx].phone = digits.slice(0, 10);
                              } else {
                                newC[idx].phone = digits.length
                                  ? `0${digits}`.slice(0, 10)
                                  : "";
                              }
                              setContacts(newC);
                            }}
                            className='flex-1 p-2 text-xs font-bold border rounded-xl focus:border-primary focus:outline-none'
                          />
                          <button
                            type='button'
                            onClick={() =>
                              setContacts(contacts.filter((_, i) => i !== idx))
                            }
                            className='p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all'
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}

                      <button
                        type='button'
                        onClick={() =>
                          setContacts([...contacts, { label: "", phone: "" }])
                        }
                        className='flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-primary hover:text-primary transition-all text-xs font-bold'
                      >
                        <Plus size={16} /> Ajouter un contact
                      </button>
                    </div>
                    <input
                      type='hidden'
                      name='contacts'
                      value={JSON.stringify(contacts)}
                    />
                  </div>
                  <div className='md:col-span-2 space-y-1'>
                    <label className='text-xs font-bold text-gray-500 uppercase'>
                      Adresse Domicile
                    </label>
                    <textarea
                      name='address'
                      defaultValue={patient.address || ""}
                      className='w-full border p-2.5 rounded-lg resize-none focus:border-primary focus:outline-none'
                      rows={2}
                      placeholder='Adresse complète...'
                    />
                  </div>
                </div>
              </section>

              {/* 3. Contact d'Urgence */}
              <section>
                <div className='bg-red-50 p-6 rounded-lg border-2 border-red-200'>
                  <h3 className='text-lg font-bold text-red-800 mb-4 flex items-center gap-2 uppercase'>
                    ⚠️ Contact d'Urgence
                  </h3>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='space-y-1'>
                      <label className='text-xs font-bold text-red-700 uppercase'>
                        Nom du Contact (Père, Mère, Conjoint...)
                      </label>
                      <input
                        name='emergencyContact'
                        defaultValue={patient.emergencyContact || ""}
                        className='w-full border-2 border-red-200 p-2 rounded-lg bg-white text-sm focus:border-red-400 focus:outline-none'
                        placeholder='Ex: Épouse, Père...'
                      />
                    </div>
                    <div className='space-y-1'>
                      <label className='text-xs font-bold text-red-700 uppercase'>
                        Téléphone d'Urgence
                      </label>
                      <input
                        name='emergencyPhone'
                        defaultValue={patient.emergencyPhone || ""}
                        className='w-full border-2 border-red-200 p-2 rounded-lg bg-white text-sm font-medium focus:border-red-400 focus:outline-none'
                        placeholder='0XXX XX XX XX'
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. Dossier Médical */}
              <section>
                <h3 className='text-lg font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4 flex items-center gap-2'>
                  <FileText size={20} className='text-green-500' /> Dossier
                  Médical
                </h3>
                <div className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='space-y-1'>
                      <label className='text-xs font-bold text-gray-500 uppercase'>
                        Groupe Sanguin
                      </label>
                      <select
                        name='bloodType'
                        defaultValue={patient.bloodType || ""}
                        className='w-full border p-2.5 rounded-lg focus:border-primary focus:outline-none'
                      >
                        <option value=''>Inconnu</option>
                        <option value='A+'>A+</option>
                        <option value='A-'>A-</option>
                        <option value='B+'>B+</option>
                        <option value='B-'>B-</option>
                        <option value='AB+'>AB+</option>
                        <option value='AB-'>AB-</option>
                        <option value='O+'>O+</option>
                        <option value='O-'>O-</option>
                      </select>
                    </div>
                    <div className='space-y-1'>
                      <label className='text-xs font-bold text-red-600 uppercase flex items-center gap-1'>
                        ⚠️ Allergies
                      </label>
                      <input
                        name='allergies'
                        defaultValue={patient.allergies || ""}
                        className='w-full border-2 border-red-100 p-2.5 rounded-lg bg-red-50 text-red-700 font-medium placeholder-red-300 focus:border-red-300 focus:outline-none'
                        placeholder='Pénicilline, Latex...'
                      />
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <label className='text-xs font-bold text-gray-500 uppercase'>
                      Antécédents Médicaux (Maladies, Chirurgies...)
                    </label>
                    <textarea
                      name='medicalHistory'
                      defaultValue={patient.medicalHistory || ""}
                      className='w-full border p-2.5 rounded-lg resize-none bg-blue-50/30 focus:border-primary focus:outline-none'
                      rows={3}
                      placeholder='Hypertension, diabète, problèmes cardiaques...'
                    />
                  </div>

                  <div className='space-y-1'>
                    <label className='text-xs font-bold text-gray-500 uppercase'>
                      Médicaments Quotidiens (Traitement en cours)
                    </label>
                    <textarea
                      name='currentMedications'
                      defaultValue={patient.currentMedications || ""}
                      className='w-full border p-2.5 rounded-lg resize-none bg-yellow-50/30 focus:border-primary focus:outline-none'
                      rows={2}
                      placeholder='Aspirine, Metformine, Amlodipine...'
                    />
                  </div>
                </div>
              </section>

              {/* 5. Notes */}
              <section>
                <div className='space-y-1'>
                  <label className='text-xs font-bold text-gray-500 uppercase'>
                    Notes Générales / Observations
                  </label>
                  <textarea
                    name='notes'
                    defaultValue={patient.notes || ""}
                    className='w-full border p-3 rounded-lg resize-none bg-yellow-50 focus:border-primary focus:outline-none'
                    rows={4}
                    placeholder='Notes diverses, préférences, remarques...'
                  />
                </div>
              </section>

              <button
                type='submit'
                className='w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3.5 rounded-lg font-bold hover:from-black hover:to-gray-900 transition-all shadow-lg flex items-center justify-center gap-2'
              >
                <Save size={20} /> Enregistrer les Modifications
              </button>
            </form>
          </div>
        )}

        {/* Invoice Modal */}
        {selectedPaymentForInvoice && (
          <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
            <div className='bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-300'>
              {/* Header */}
              <div className='bg-gradient-to-r from-primary to-purple-600 text-white p-6 rounded-t-2xl flex justify-between items-center'>
                <div>
                  <h3 className='text-2xl font-black'>📄 FACTURE</h3>
                  <p className='text-white/80 text-sm font-bold mt-1'>
                    Cabinet ELYDENT
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPaymentForInvoice(null)}
                  className='p-2 hover:bg-white/20 rounded-lg transition-colors'
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className='p-8 space-y-6'>
                {/* Clinic Info */}
                <div className='border-b-2 border-gray-200 pb-4'>
                  <h4 className='font-black text-gray-900 text-lg'>
                    🦷 ELYDENT
                  </h4>
                  <p className='text-sm text-gray-600 font-bold'>
                    Cabinet Dentaire
                  </p>
                  <p className='text-xs text-gray-500 font-semibold mt-1'>
                    Algérie
                  </p>
                </div>

                {/* Patient Info */}
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <p className='text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1'>
                      Patient
                    </p>
                    <p className='font-bold text-gray-900'>
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className='text-sm text-gray-600'>{patient.phone}</p>
                  </div>
                  <div className='text-right'>
                    <p className='text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1'>
                      Date de paiement
                    </p>
                    <p className='font-bold text-gray-900'>
                      {new Date(
                        selectedPaymentForInvoice.date,
                      ).toLocaleDateString("fr-FR")}
                    </p>
                    <p className='text-sm text-primary font-black'>
                      Paiement reçu
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className='bg-gray-50 p-4 rounded-lg border-2 border-gray-200'>
                  <div className='flex justify-between items-center mb-3 pb-3 border-b border-gray-200'>
                    <span className='text-sm font-bold text-gray-600'>
                      Montant versé
                    </span>
                    <span className='text-2xl font-black text-primary'>
                      {Number(
                        selectedPaymentForInvoice.amount,
                      ).toLocaleString()}{" "}
                      DA
                    </span>
                  </div>
                  {selectedPaymentForInvoice.note && (
                    <div className='text-xs text-gray-600 italic'>
                      <strong>Référence:</strong>{" "}
                      {selectedPaymentForInvoice.note}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className='text-center border-t-2 border-gray-200 pt-4'>
                  <p className='text-[10px] text-gray-500 font-bold uppercase tracking-widest'>
                    Facture générée le {new Date().toLocaleDateString("fr-FR")}
                  </p>
                  <p className='text-xs text-gray-400 mt-2'>
                    Merci de votre confiance! 🙏
                  </p>
                </div>

                {/* Action Buttons */}
                <div className='flex gap-3'>
                  <button
                    onClick={() => window.print()}
                    className='flex-1 bg-blue-600 text-white py-3 rounded-lg font-black hover:bg-blue-700 transition-colors flex items-center justify-center gap-2'
                  >
                    🖨️ Imprimer
                  </button>
                  <button
                    onClick={() => setSelectedPaymentForInvoice(null)}
                    className='flex-1 bg-gray-200 text-gray-900 py-3 rounded-lg font-black hover:bg-gray-300 transition-colors'
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Preview Modal */}
        {selectedImageForPreview && (
          <div
            className='fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4'
            onClick={() => setSelectedImageForPreview(null)}
          >
            <div
              className='relative max-w-4xl max-h-[90vh] flex items-center justify-center'
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImageForPreview}
                alt='Preview'
                className='max-w-full max-h-[90vh] rounded-xl shadow-2xl'
              />
              <button
                onClick={() => setSelectedImageForPreview(null)}
                className='absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white'
              >
                <X size={28} />
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => {
            if (confirmModal.action) {
              confirmModal.action();
            }
            setConfirmModal({
              isOpen: false,
              title: "",
              message: "",
              action: null,
            });
          }}
          onCancel={() => {
            setConfirmModal({
              isOpen: false,
              title: "",
              message: "",
              action: null,
            });
          }}
        />
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: VISIT HISTORY CARD ---
function VisitHistoryCard({
  visit,
  patient,
  onPaymentClick,
}: {
  visit: Visit;
  patient: Patient;
  onPaymentClick: (payment: Payment) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [customTreatment, setCustomTreatment] = useState("");

  return (
    <div
      key={visit.id}
      className={`bg-white rounded-xl shadow-sm border transition-all ${isEditing ? "border-primary ring-1 ring-primary" : "border-gray-100 hover:border-gray-300"}`}
    >
      {/* Header Row */}
      <div
        className='p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer'
        onClick={() => setIsEditing(!isEditing)}
      >
        <div className='flex items-center gap-3'>
          <div
            className={`p-2 rounded-lg ${visit.status === "COMPLETED" ? "bg-green-100 text-green-600" : visit.status === "CANCELLED" ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-500"}`}
          >
            {visit.status === "CANCELLED" ? (
              <X size={20} />
            ) : visit.status === "COMPLETED" ? (
              <CheckCircle size={20} />
            ) : (
              <Clock size={20} />
            )}
          </div>
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <h3
                className={`font-bold text-gray-900 ${visit.status === "CANCELLED" ? "line-through text-gray-400" : ""}`}
              >
                {visit.treatment}
              </h3>
              {visit.specialty && (
                <span className='text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-700'>
                  {visit.specialty}
                </span>
              )}
            </div>
            <div className='flex items-center gap-2'>
              {visit.status === "CANCELLED" && (
                <span className='text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black uppercase'>
                  Annulé
                </span>
              )}
              {visit.status === "WAITING" && (
                <span className='text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-black uppercase'>
                  En attente
                </span>
              )}
              {visit.status === "IN_PROGRESS" && (
                <span className='text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-black uppercase'>
                  En cours
                </span>
              )}
              <p className='text-xs text-gray-500 capitalize'>
                {new Date(visit.date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className='flex items-center gap-6'>
          <div className='text-right min-w-[80px]'>
            <p className='text-xs font-bold text-gray-600'>Prix</p>
            <p className='font-bold text-gray-900 text-lg'>
              {Number(visit.cost).toLocaleString()} DA
            </p>
          </div>
          <div className='text-right min-w-[80px]'>
            <p className='text-xs text-gray-500'>Versé</p>
            <p
              className={`font-bold ${Number(visit.paid) >= Number(visit.cost) && Number(visit.cost) > 0 ? "text-green-600" : "text-orange-500"}`}
            >
              {Number(visit.paid).toLocaleString()} DA
            </p>
          </div>
          <div className='text-gray-400'>
            {isEditing ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {/* Expanded Editing Panel */}
      {isEditing && (
        <div className='p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl animate-in slide-in-from-top-2'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Left: Treatment, Specialty & Notes Edit */}
            <div className='space-y-4'>
              {/* Specialty */}
              <div>
                <label className='text-xs font-bold text-gray-500 uppercase'>
                  Spécialité
                </label>
                <form action={updateVisitTreatment} className='flex gap-2 mt-1'>
                  <input type='hidden' name='visitId' value={visit.id} />
                  <input type='hidden' name='patientId' value={patient.id} />
                  <select
                    name='specialty'
                    defaultValue={visit.specialty || ""}
                    className='flex-1 p-2 text-sm border rounded bg-white shadow-inner'
                  >
                    <option value=''>Sélectionnez</option>
                    <option value='Soin'>🔴 Soin</option>
                    <option value='ODF'>🔵 ODF</option>
                    <option value='Chirurgie'>🟢 Chirurgie</option>
                    <option value='Proteges'>🟡 Protège</option>
                  </select>
                  <button className='bg-gray-900 text-white p-2 rounded hover:bg-black transition-colors'>
                    <Save size={14} />
                  </button>
                </form>
              </div>

              {/* Session Type */}
              <div>
                <label className='text-xs font-bold text-gray-500 uppercase'>
                  Type de Séance
                </label>
                <form action={updateVisitTreatment} className='flex gap-2 mt-1'>
                  <input type='hidden' name='visitId' value={visit.id} />
                  <input type='hidden' name='patientId' value={patient.id} />
                  <input
                    name='sessionType'
                    defaultValue={visit.sessionType || ""}
                    placeholder='Session type...'
                    className='flex-1 p-2 text-sm border rounded bg-white shadow-inner'
                  />
                  <button className='bg-gray-900 text-white p-2 rounded hover:bg-black transition-colors'>
                    <Save size={14} />
                  </button>
                </form>
              </div>

              {/* Treatment */}
              <div>
                <label className='text-xs font-bold text-gray-500 uppercase'>
                  Motif / Traitement
                </label>
                <form action={updateVisitTreatment} className='flex gap-2 mt-1'>
                  <input type='hidden' name='visitId' value={visit.id} />
                  <input type='hidden' name='patientId' value={patient.id} />
                  <input
                    name='customTreatment'
                    defaultValue={visit.treatment}
                    className='flex-1 p-2 text-sm border rounded bg-white shadow-inner'
                  />
                  <button className='bg-gray-900 text-white p-2 rounded hover:bg-black transition-colors'>
                    <Save size={14} />
                  </button>
                </form>
              </div>

              {/* Notes */}
              <div>
                <label className='text-xs font-bold text-gray-500 uppercase'>
                  Notes / Observations
                </label>
                <form action={updateVisitNotes} className='mt-1'>
                  <input type='hidden' name='visitId' value={visit.id} />
                  <input type='hidden' name='patientId' value={patient.id} />
                  <div className='flex gap-2'>
                    <textarea
                      name='notes'
                      defaultValue={visit.notes || ""}
                      className='flex-1 p-2 text-sm border rounded resize-none bg-white shadow-inner'
                      rows={2}
                      placeholder='Ajouter une note...'
                    />
                    <button className='bg-gray-200 text-gray-700 p-2 rounded hover:bg-gray-300 self-start transition-colors'>
                      <Save size={14} />
                    </button>
                  </div>
                </form>
              </div>

              {/* Description */}
              <div>
                <label className='text-xs font-bold text-gray-500 uppercase'>
                  Description / Détails
                </label>
                <form action={updateVisitNotes} className='mt-1'>
                  <input type='hidden' name='visitId' value={visit.id} />
                  <input type='hidden' name='patientId' value={patient.id} />
                  <div className='flex gap-2'>
                    <textarea
                      name='notes'
                      defaultValue={visit.description || ""}
                      className='flex-1 p-2 text-sm border rounded resize-none bg-white shadow-inner'
                      rows={2}
                      placeholder='Détails supplémentaires...'
                    />
                    <button className='bg-gray-200 text-gray-700 p-2 rounded hover:bg-gray-300 self-start transition-colors'>
                      <Save size={14} />
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: Financials */}
            <div className='bg-white p-4 rounded-lg border border-gray-200 shadow-sm'>
              <h4 className='font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm'>
                <DollarSign size={14} className='text-green-600' /> Gestion
                Paiements
              </h4>

              {/* Edit Cost */}
              <div className='flex justify-between items-center mb-4 pb-4 border-b border-gray-100'>
                <span className='text-sm text-gray-600'>
                  Coût total séance:
                </span>
                <form
                  action={updateVisitCost}
                  className='flex items-center gap-2'
                >
                  <input type='hidden' name='visitId' value={visit.id} />
                  <input type='hidden' name='patientId' value={patient.id} />
                  <input
                    name='cost'
                    defaultValue={Number(visit.cost)}
                    className='w-20 text-right font-bold border-b border-gray-300 focus:border-primary focus:outline-none bg-transparent'
                  />
                  <span className='text-xs text-gray-500'>DA</span>
                  <button className='text-primary hover:text-purple-800 transition-colors'>
                    <Save size={14} />
                  </button>
                </form>
              </div>

              {/* Payments List */}
              <div className='space-y-2 mb-4 max-h-[100px] overflow-y-auto pr-1'>
                {visit.payments.length === 0 ? (
                  <p className='text-[10px] text-gray-400 italic text-center py-2'>
                    Aucun versement enregistré
                  </p>
                ) : (
                  visit.payments.map((p: Payment) => (
                    <div
                      key={p.id}
                      className='flex justify-between items-center text-xs bg-gray-50 p-2 rounded border border-gray-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors'
                      onClick={() => onPaymentClick(p)}
                    >
                      <span className='font-medium text-gray-700'>
                        {new Date(p.date).toLocaleDateString("fr-FR")}
                      </span>
                      <span className='font-mono font-bold text-primary text-sm'>
                        {Number(p.amount).toLocaleString()} DA
                      </span>
                      <form
                        action={deletePayment}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input type='hidden' name='paymentId' value={p.id} />
                        <input type='hidden' name='visitId' value={visit.id} />
                        <input
                          type='hidden'
                          name='patientId'
                          value={patient.id}
                        />
                        <button className='text-red-300 hover:text-red-500 transition-colors'>
                          <Trash2 size={12} />
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>

              {/* Add Payment */}
              <form action={addPayment} className='flex gap-2'>
                <input type='hidden' name='visitId' value={visit.id} />
                <input type='hidden' name='patientId' value={patient.id} />
                <input
                  name='amount'
                  type='number'
                  placeholder='Nouveau versement...'
                  className='flex-1 p-1.5 text-xs border rounded focus:outline-none focus:border-primary shadow-inner'
                />
                <button className='bg-green-600 text-white px-3 py-1.5 rounded text-[10px] font-black hover:bg-green-700 transition-colors uppercase'>
                  Verser
                </button>
              </form>
            </div>
          </div>

          {/* Images/PDFs Section */}
          <div className='mt-4 pt-4 border-t border-gray-200'>
            <h4 className='font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm'>
              <Upload size={14} className='text-blue-600' /> Images / Documents
            </h4>
            {visit.images ? (
              <div className='grid grid-cols-3 gap-2 mb-3'>
                {JSON.parse(visit.images).map((img: string, idx: number) => (
                  <a
                    key={idx}
                    href={img}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='block relative aspect-square rounded overflow-hidden border border-gray-200 hover:border-primary transition-colors'
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt='Document'
                      className='object-cover w-full h-full'
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p className='text-sm text-gray-400 italic mb-3'>
                Aucun document attaché
              </p>
            )}
          </div>

          <div className='mt-4 pt-4 border-t border-gray-200 flex justify-end'>
            <form
              action={deleteVisit}
              onSubmit={(e) =>
                !confirm("Supprimer définitivement cette visite ?") &&
                e.preventDefault()
              }
            >
              <input type='hidden' name='visitId' value={visit.id} />
              <input type='hidden' name='patientId' value={patient.id} />
              <button className='text-red-500 text-[10px] font-bold hover:underline flex items-center gap-1 uppercase tracking-tighter'>
                <Trash2 size={12} /> Supprimer l'historique
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENT:  ConfirmationModal is imported from components ---
// Add this to the end of PatientTabs component to render the confirmation modal
