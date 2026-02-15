"use client";

import React, { useState, useMemo } from "react";
import {
  addToothProcess,
  deleteToothProcess,
  updatePatientDentition,
} from "@/app/actions";
import {
  Check,
  X,
  Shield,
  Star,
  AlertCircle,
  Plus,
  Info,
  Trash2,
  MessageSquare,
  History,
} from "lucide-react";

type ToothStatus =
  | "HEALTHY"
  | "CARIES"
  | "MISSING"
  | "CROWN"
  | "FILLING"
  | "BRIDGE"
  | "IMPLANT"
  | "EXTRACT";

interface ToothHistoryItem {
  id: string;
  toothNumber: number;
  status: ToothStatus;
  notes?: string;
  date: Date | string;
  createdAt?: Date | string;
}

const TOOTH_PATHS = {
  MOLAR: {
    // Professional molar shapes with cusps
    upper:
      "M9 14 C9 7 13 3 18 2 C22 2 26 3 29 6 C32 9 33 14 32 20 L31 28 C30 35 27 40 23 43 C20 45 17 46 14 45 C11 44 8 40 7 33 L6 20 C6 16 7 14 9 14 Z M12 16 L13 22 M20 17 L20 25 M28 18 L27 24",
    lower:
      "M9 36 C8 42 7 45 10 48 C13 50 18 51 20 51 C22 51 27 50 30 48 C33 45 32 42 31 36 L30 28 C29 21 27 16 23 13 C20 11 16 10 13 11 C10 12 8 16 8 22 L9 28 Z M12 34 L13 28 M20 33 L20 25 M28 32 L27 26",
    crown:
      "M11 14 C11 10 14 8 18 7 C22 7 26 8 28 11 L27 19 C27 22 24 24 20 24 C16 24 13 22 13 19 Z",
  },
  PREMOLAR: {
    // Professional premolar with one cusp
    upper:
      "M11 12 C11 6 15 3 19 2 C23 2 27 4 29 8 C30 12 30 16 29 22 L28 34 C27 41 24 45 20 47 C16 48 12 48 10 45 L9 34 C8 26 8 18 9 14 C9 13 10 12 11 12 Z M16 15 L19 24 L22 15",
    lower:
      "M11 38 C10 44 10 47 13 49 C16 51 21 52 20 52 C23 52 28 51 31 49 C34 47 34 44 33 38 L32 26 C31 18 29 12 27 9 C25 5 21 3 18 3 C15 4 11 7 10 12 L11 26 Z M16 35 L19 26 L22 35",
    crown:
      "M13 12 C13 8 16 6 19 5 C23 5 26 7 27 11 L26 20 C26 23 23 25 19 25 C15 25 12 23 12 20 Z",
  },
  CANINE: {
    // Professional canine with pointed cusp
    upper:
      "M13 12 C13 6 16 3 19 2 C21 2 24 3 26 6 C28 10 29 15 28 22 L26 36 C25 42 23 46 20 48 C17 49 15 49 13 47 L11 36 C10 28 10 20 12 14 C12 13 12 12 13 12 Z M19 15 L20 30",
    lower:
      "M13 38 C12 43 12 46 15 48 C17 50 21 51 20 51 C22 51 25 50 28 48 C30 46 29 43 28 38 L26 24 C25 16 24 10 22 7 C20 3 17 1 14 2 C12 3 10 7 10 12 L12 24 Z M19 35 L20 20",
    crown:
      "M15 12 C15 8 17 5 19 4 C21 4 23 6 24 10 L23 20 C23 23 21 24 19 25 C17 24 15 23 15 20 Z",
  },
  INCISOR: {
    // Professional incisor - flat rectangular with slight taper
    upper:
      "M12 10 C12 5 15 2 18 1 C20 1 22 2 25 4 C27 6 28 10 28 15 L27 33 C26 40 24 44 20 46 C16 47 14 47 12 45 L11 33 C11 25 11 17 12 10 Z M18 15 L20 30",
    lower:
      "M12 40 C11 44 11 46 14 48 C16 50 20 51 20 51 C20 51 24 50 26 48 C29 46 29 44 28 40 L27 22 C27 15 26 9 24 5 C22 2 19 0 16 1 C13 2 11 6 11 12 L12 22 Z M18 38 L20 20",
    crown:
      "M14 10 C14 7 16 5 18 4 C20 4 22 6 24 9 L23 22 C23 24 21 25 18 25 C15 25 13 24 13 22 Z",
  },
};

const getToothType = (id: number) => {
  const lastDigit = id % 10;
  if (lastDigit <= 2) return "INCISOR";
  if (lastDigit === 3) return "CANINE";
  if (lastDigit <= 5) return "PREMOLAR";
  return "MOLAR";
};

const getAnatomicalName = (id: number) => {
  const lastDigit = id % 10;
  const isUpper = (id >= 11 && id <= 28) || (id >= 51 && id <= 65);
  const isRight =
    (id >= 11 && id <= 18) ||
    (id >= 41 && id <= 48) ||
    (id >= 51 && id <= 55) ||
    (id >= 81 && id <= 85);

  let name = "";
  if (lastDigit === 1) name = "Incisive Centrale";
  else if (lastDigit === 2) name = "Incisive Latérale";
  else if (lastDigit === 3) name = "Canine";
  else if (lastDigit === 4) name = "1ère Prémolaire";
  else if (lastDigit === 5) name = "2ème Prémolaire";
  else if (lastDigit === 6) name = "1ère Molaire";
  else if (lastDigit === 7) name = "2ème Molaire";
  else if (lastDigit === 8) name = "3ème Molaire";

  return `${name} ${isUpper ? "Sup." : "Inf."} ${isRight ? "D" : "G"}`;
};

const ToothSVG = ({
  id,
  status,
  isSelected,
  onClick,
  isUpper,
}: {
  id: number;
  status: ToothStatus;
  isSelected: boolean;
  onClick: () => void;
  isUpper: boolean;
}) => {
  const type = getToothType(id);
  const paths = TOOTH_PATHS[type];
  const toothPath = isUpper ? paths.upper : paths.lower;
  const crownPath = paths.crown;

  const [isHovered, setIsHovered] = useState(false);

  const getStatusColor = (s: ToothStatus) => {
    switch (s) {
      case "CARIES":
        return "fill-red-600 drop-shadow-lg";
      case "MISSING":
        return "fill-gray-300 opacity-40 drop-shadow-md";
      case "CROWN":
        return "fill-yellow-500 drop-shadow-lg";
      case "FILLING":
        return "fill-blue-500 drop-shadow-lg";
      case "BRIDGE":
        return "fill-purple-500 drop-shadow-lg";
      case "IMPLANT":
        return "fill-indigo-500 drop-shadow-lg";
      case "EXTRACT":
        return "fill-rose-500 drop-shadow-lg";
      default:
        return "fill-green-400 drop-shadow-md";
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex flex-col items-center cursor-pointer transition-all duration-300 ${isSelected ? "scale-125 z-40" : "hover:scale-110 z-10"}`}
    >
      {isHovered && !isSelected && (
        <div className='absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-black py-1 px-3 rounded-full whitespace-nowrap shadow-xl pointer-events-none animate-in fade-in zoom-in-95'>
          {getAnatomicalName(id)}
        </div>
      )}
      <span
        className={`text-[8px] font-black mb-0.5 ${isSelected ? "text-primary" : "text-gray-400"}`}
      >
        {id}
      </span>
      <svg
        width='40'
        height='50'
        viewBox='0 0 40 50'
        className='filter drop-shadow-sm overflow-visible'
      >
        <path
          d={toothPath}
          className={`stroke-[1.5] transition-colors duration-200 ${isSelected ? "stroke-primary fill-primary/5" : "stroke-gray-300 fill-white"}`}
        />
        <path
          d={crownPath}
          className={`${getStatusColor(status)} stroke-0 transition-all duration-300`}
        />
        {status === "MISSING" && (
          <line
            x1='10'
            y1='10'
            x2='30'
            y2='40'
            className='stroke-gray-400 stroke-2'
          />
        )}
      </svg>
    </div>
  );
};

export default function Odontogram({
  patientId,
  initialTeeth,
  dentitionType,
}: {
  patientId: string;
  initialTeeth: ToothHistoryItem[];
  dentitionType: string;
}) {
  const [view, setView] = useState<"ADULT" | "CHILD">(
    (dentitionType as any) || "ADULT",
  );
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync view with prop when it changes (e.g., after revalidatePath)
  React.useEffect(() => {
    if (dentitionType) setView(dentitionType as any);
  }, [dentitionType]);

  // Group teeth by number and get the LATEST status for the visual chart
  const currentStatusMap = useMemo(() => {
    const map: Record<number, ToothStatus> = {};
    const sorted = [...initialTeeth].sort((a, b) => {
      const dateA = a.date
        ? new Date(a.date).getTime()
        : a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0;
      const dateB = b.date
        ? new Date(b.date).getTime()
        : b.createdAt
          ? new Date(b.createdAt).getTime()
          : 0;
      return dateA - dateB;
    });
    sorted.forEach((t) => {
      map[t.toothNumber] = t.status;
    });
    return map;
  }, [initialTeeth]);

  const toothHistory = useMemo(() => {
    if (!selectedTooth) return [];
    return initialTeeth
      .filter((t) => t.toothNumber === selectedTooth)
      .sort((a, b) => {
        const dateA = a.date
          ? new Date(a.date).getTime()
          : a.createdAt
            ? new Date(a.createdAt).getTime()
            : 0;
        const dateB = b.date
          ? new Date(b.date).getTime()
          : b.createdAt
            ? new Date(b.createdAt).getTime()
            : 0;
        return dateB - dateA;
      });
  }, [selectedTooth, initialTeeth]);

  const [pendingStatus, setPendingStatus] = useState<ToothStatus | null>(null);

  const handleAddProcess = async () => {
    if (!selectedTooth || !pendingStatus) return;
    setIsSubmitting(true);
    try {
      await addToothProcess(patientId, selectedTooth, pendingStatus, noteInput);
      setNoteInput("");
      setPendingStatus(null);
    } catch (error) {
      alert("Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await deleteToothProcess(patientId, recordId);
      setConfirmDeleteId(null);
    } catch (error) {
      alert("Erreur lors de la suppression");
    }
  };

  const handleDentitionChange = async (type: "ADULT" | "CHILD") => {
    setView(type);
    await updatePatientDentition(patientId, type);
  };

  const adultUpper = [
    [18, 17, 16, 15, 14, 13, 12, 11],
    [21, 22, 23, 24, 25, 26, 27, 28],
  ];
  const adultLower = [
    [48, 47, 46, 45, 44, 43, 42, 41],
    [31, 32, 33, 34, 35, 36, 37, 38],
  ];
  const childUpper = [
    [55, 54, 53, 52, 51],
    [61, 62, 63, 64, 65],
  ];
  const childLower = [
    [85, 84, 83, 82, 81],
    [71, 72, 73, 74, 75],
  ];

  const currentUpper = view === "ADULT" ? adultUpper : childUpper;
  const currentLower = view === "ADULT" ? adultLower : childLower;

  const statuses: {
    id: ToothStatus;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: any;
    description: string;
  }[] = [
    {
      id: "HEALTHY",
      label: "Saine",
      color: "bg-green-400",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      icon: Shield,
      description: "Dent saine sans problèmes apparents",
    },
    {
      id: "CARIES",
      label: "Carie",
      color: "bg-red-500",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      icon: AlertCircle,
      description: "Présence de carie, déterminer le stade et le traitement",
    },
    {
      id: "MISSING",
      label: "Absente",
      color: "bg-gray-400",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      icon: X,
      description: "Dent manquante ou extraite",
    },
    {
      id: "CROWN",
      label: "Couronne",
      color: "bg-amber-400",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      icon: Star,
      description: "Couronne dentaire ou coiffage existant",
    },
    {
      id: "FILLING",
      label: "Obturation",
      color: "bg-blue-400",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      icon: Check,
      description: "Plombage ou obturation existant",
    },
    {
      id: "BRIDGE",
      label: "Pont / Bridge",
      color: "bg-purple-400",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      icon: Plus,
      description: "Dent pilier d'un bridge ou pont",
    },
    {
      id: "IMPLANT",
      label: "Implant",
      color: "bg-indigo-400",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
      icon: Star,
      description: "Implant dentaire avec couronne",
    },
    {
      id: "EXTRACT",
      label: "À Extraire",
      color: "bg-rose-500",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200",
      icon: AlertCircle,
      description: "Dent à extraire - déterminer la date et la technique",
    },
  ];

  return (
    <div className='bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative'>
      {/* Header / Mode Selector */}
      <div className='flex justify-between items-center mb-12'>
        <div className='space-y-1'>
          <h3 className='font-black text-2xl text-gray-900 tracking-tight'>
            Schéma Dentaire
          </h3>
          <p className='text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2'>
            {getAnatomicalName(selectedTooth || 0) || "Sélectionnez une dent"}
          </p>
        </div>

        <div className='flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100'>
          <button
            onClick={() => handleDentitionChange("ADULT")}
            className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${view === "ADULT" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
          >
            ADULTE
          </button>
          <button
            onClick={() => handleDentitionChange("CHILD")}
            className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${view === "CHILD" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
          >
            ENFANT
          </button>
        </div>
      </div>

      {/* Jaw Arches */}
      <div className='relative min-h-[450px] flex flex-col items-center justify-center gap-12 py-8 overflow-x-auto'>
        <div className='absolute left-0 top-1/2 -translate-y-1/2 text-5xl font-black text-gray-50/50 vertical-text select-none'>
          DROIT
        </div>
        <div className='absolute right-0 top-1/2 -translate-y-1/2 text-5xl font-black text-gray-50/50 vertical-text select-none'>
          GAUCHE
        </div>

        {/* Upper */}
        <div className='flex items-center gap-4'>
          {currentUpper.map((side, idx) => (
            <div
              key={idx}
              className={`flex items-end gap-1 ${idx === 0 ? "-rotate-[6deg] origin-right" : "rotate-[6deg] origin-left"}`}
            >
              {side.map((id) => (
                <ToothSVG
                  key={id}
                  id={id}
                  status={currentStatusMap[id] || "HEALTHY"}
                  isSelected={selectedTooth === id}
                  onClick={() => setSelectedTooth(id)}
                  isUpper={true}
                />
              ))}
              {idx === 0 && <div className='w-[1px] h-12 bg-gray-100 mx-2' />}
            </div>
          ))}
        </div>

        {/* Lower */}
        <div className='flex items-center gap-4'>
          {currentLower.map((side, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-1 ${idx === 0 ? "rotate-[6deg] origin-right" : "-rotate-[6deg] origin-left"}`}
            >
              {side.map((id) => (
                <ToothSVG
                  key={id}
                  id={id}
                  status={currentStatusMap[id] || "HEALTHY"}
                  isSelected={selectedTooth === id}
                  onClick={() => setSelectedTooth(id)}
                  isUpper={false}
                />
              ))}
              {idx === 0 && <div className='w-[1px] h-12 bg-gray-100 mx-2' />}
            </div>
          ))}
        </div>
      </div>

      {/* Combined History & Action Panel */}
      {selectedTooth && (
        <div className='mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-500 lg:min-h-96'>
          {/* Actions & Notes */}
          <div className='bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-6 flex flex-col overflow-y-auto'>
            <div className='flex justify-between items-center flex-shrink-0'>
              <h4 className='font-black text-gray-900 group flex items-center gap-2'>
                <Plus size={18} className='text-primary' />
                NOUVELLE ENTRÉE SYSTÈME
                <span className='bg-gradient-to-r from-blue-100 to-blue-50 text-primary text-[10px] px-3 py-1 rounded-full font-black border border-blue-200'>
                  DENT {selectedTooth}
                </span>
              </h4>
              <button
                onClick={() => setSelectedTooth(null)}
                className='p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors'
              >
                <X size={20} />
              </button>
            </div>

            <div className='space-y-4'>
              {pendingStatus && (
                <div
                  className={`p-4 rounded-2xl border-2 ${statuses.find((s) => s.id === pendingStatus)?.borderColor} ${statuses.find((s) => s.id === pendingStatus)?.bgColor}`}
                >
                  <p className='text-[10px] font-black text-gray-600 uppercase tracking-wide mb-2'>
                    Statut sélectionné
                  </p>
                  <p className='text-sm font-black text-gray-900'>
                    {statuses.find((s) => s.id === pendingStatus)?.label}
                  </p>
                  <p className='text-[11px] text-gray-600 mt-2'>
                    {statuses.find((s) => s.id === pendingStatus)?.description}
                  </p>
                </div>
              )}
              <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
                {statuses.map((s) => (
                  <button
                    key={s.id}
                    disabled={isSubmitting}
                    onClick={() => setPendingStatus(s.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 font-black uppercase text-[10px] ${isSubmitting ? "opacity-50 grayscale" : ""} ${pendingStatus === s.id ? `bg-white border-primary ring-2 ring-primary/30 shadow-lg text-primary` : `bg-white border-gray-200 text-gray-600 hover:${s.borderColor}`}`}
                  >
                    <div
                      className={`p-3 rounded-xl ${s.color} border-2 ${pendingStatus === s.id ? "border-primary scale-110" : "border-gray-200"} transition-all`}
                    >
                      <s.icon size={20} className='text-white' />
                    </div>
                    <span className='text-center leading-tight'>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className='space-y-3'>
              <label className='text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2'>
                <MessageSquare size={14} />
                Observations Cliniques
              </label>
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={`Décrivez l'état actuel de la dent, les observations cliniques, la profondeur des caries, la localisation, les allergies du patient, le traitement recommandé, etc.\nEx: "Carie profonde sur la surface occlusalem, patient sensible au froid, recommande dévitalisation"`}
                className='w-full bg-white border border-gray-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[120px] shadow-inner text-gray-700'
              />
              <p className='text-[9px] text-gray-400 font-bold italic'>
                💡 Incluez la localisation (surfaces M, D, O, B, L), la
                profondeur, et le traitement proposé
              </p>
            </div>

            <button
              disabled={!pendingStatus || isSubmitting}
              onClick={handleAddProcess}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm uppercase tracking-widest transition-all text-white shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 ${
                pendingStatus
                  ? (() => {
                      const selected = statuses.find(
                        (s) => s.id === pendingStatus,
                      );
                      const colorMap: Record<string, string> = {
                        HEALTHY:
                          "bg-green-500 shadow-green-500/30 hover:bg-green-600",
                        CARIES: "bg-red-500 shadow-red-500/30 hover:bg-red-600",
                        MISSING:
                          "bg-gray-500 shadow-gray-500/30 hover:bg-gray-600",
                        CROWN:
                          "bg-amber-500 shadow-amber-500/30 hover:bg-amber-600",
                        FILLING:
                          "bg-blue-500 shadow-blue-500/30 hover:bg-blue-600",
                        BRIDGE:
                          "bg-purple-500 shadow-purple-500/30 hover:bg-purple-600",
                        IMPLANT:
                          "bg-indigo-500 shadow-indigo-500/30 hover:bg-indigo-600",
                        EXTRACT:
                          "bg-rose-500 shadow-rose-500/30 hover:bg-rose-600",
                      };
                      return (
                        colorMap[selected?.id || "HEALTHY"] || colorMap.HEALTHY
                      );
                    })()
                  : "bg-gray-300 shadow-gray-300/30"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Ajouter à l'historique
                </>
              )}
            </button>
          </div>

          {/* History Sidebar */}
          <div className='bg-gradient-to-br from-white to-gray-50/50 p-8 rounded-3xl border-2 border-gray-100 space-y-6 flex flex-col h-full shadow-sm'>
            <div className='flex items-center justify-between flex-shrink-0'>
              <h4 className='font-black text-lg text-gray-900 flex items-center gap-3'>
                <div className='p-2 bg-primary/10 rounded-lg'>
                  <History size={20} className='text-primary' />
                </div>
                HISTORIQUE DES SOINS
              </h4>
              {toothHistory.length > 0 && (
                <span className='bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full border border-primary/20'>
                  {toothHistory.length} (
                  {toothHistory.length === 1 ? "1 entrée" : "entrées"})
                </span>
              )}
            </div>

            <div className='flex-1 space-y-3 overflow-y-auto pr-3 custom-scrollbar min-h-0 pb-2'>
              {toothHistory.length === 0 ? (
                <div className='h-full flex flex-col items-center justify-center text-gray-300 gap-4 opacity-50 py-8'>
                  <div className='p-4 bg-gray-100 rounded-2xl'>
                    <Shield size={40} />
                  </div>
                  <p className='text-[10px] font-black uppercase tracking-widest text-center'>
                    Aucun historique pour cette dent
                  </p>
                </div>
              ) : (
                toothHistory.map((item, idx) => {
                  const statusInfo = statuses.find((s) => s.id === item.status);
                  const isLatest = idx === 0;

                  return (
                    <div
                      key={item.id}
                      className={`relative transition-all flex-shrink-0 ${isLatest ? "ring-2 ring-primary/30 shadow-lg" : ""}`}
                    >
                      {isLatest && (
                        <div className='absolute -top-2 right-3 bg-primary text-white text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest'>
                          Dernière
                        </div>
                      )}
                      <div
                        className={`p-5 rounded-2xl border-2 transition-all ${
                          statusInfo?.borderColor || "border-gray-200"
                        } ${statusInfo?.bgColor || "bg-gray-50"} hover:shadow-md`}
                      >
                        {/* Status Badge */}
                        <div className='flex items-center justify-between mb-3'>
                          <div className='flex items-center gap-2'>
                            <div
                              className={`p-2 rounded-lg ${statusInfo?.color} ${statusInfo?.color.replace("bg-", "bg-opacity-10 text-")}`}
                            >
                              {statusInfo && (
                                <statusInfo.icon
                                  size={16}
                                  className='text-white'
                                />
                              )}
                            </div>
                            <div>
                              <span
                                className={`text-[11px] font-black uppercase tracking-wider ${statusInfo?.color.replace("bg-", "text-").split("-")[0]}-700`}
                              >
                                {statusInfo?.label}
                              </span>
                              <p className='text-[9px] text-gray-500 font-bold'>
                                {item.date || (item as any).createdAt
                                  ? new Date(
                                      item.date || (item as any).createdAt,
                                    ).toLocaleDateString("fr-FR", {
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                    })
                                  : "Date inconnue"}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteRecord(item.id)}
                            className='p-2 opacity-0 hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-gray-300 rounded-lg transition-all'
                            title='Supprimer cette entrée'
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Notes */}
                        {item.notes && (
                          <div className='bg-white/60 p-4 rounded-xl border border-gray-100 space-y-1'>
                            <p className='text-[9px] font-black text-gray-500 uppercase tracking-widest'>
                              Notes Cliniques
                            </p>
                            <p className='text-sm text-gray-700 leading-relaxed font-medium'>
                              "{item.notes}"
                            </p>
                          </div>
                        )}

                        {!item.notes && (
                          <p className='text-[9px] text-gray-400 italic font-medium'>
                            Aucune note associée
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
