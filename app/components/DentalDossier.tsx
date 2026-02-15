"use client";

import { useState } from "react";
import { History, AlertCircle } from "lucide-react";

interface ToothStatus {
  toothNumber: number;
  status:
    | "saine"
    | "carie"
    | "absente"
    | "couronne"
    | "obturation"
    | "pont"
    | "implant"
    | "extraire";
  observations: string;
}

interface DentalDossierProps {
  patientId: string;
  initialToothStatuses?: ToothStatus[];
  onSaveToHistory?: (entry: Record<string, unknown>) => void;
}

const TOOTH_STATUS_OPTIONS = [
  {
    id: "saine",
    label: "Saine (Healthy)",
    color: "bg-green-100 border-green-300 text-green-900",
    icon: "✅",
  },
  {
    id: "carie",
    label: "Carie (Cavity)",
    color: "bg-red-100 border-red-300 text-red-900",
    icon: "🔴",
  },
  {
    id: "absente",
    label: "Absente (Missing)",
    color: "bg-gray-100 border-gray-300 text-gray-900",
    icon: "⭕",
  },
  {
    id: "couronne",
    label: "Couronne (Crown)",
    color: "bg-purple-100 border-purple-300 text-purple-900",
    icon: "👑",
  },
  {
    id: "obturation",
    label: "Obturation (Filling)",
    color: "bg-blue-100 border-blue-300 text-blue-900",
    icon: "🔵",
  },
  {
    id: "pont",
    label: "Pont / Bridge",
    color: "bg-orange-100 border-orange-300 text-orange-900",
    icon: "🌉",
  },
  {
    id: "implant",
    label: "Implant",
    color: "bg-indigo-100 border-indigo-300 text-indigo-900",
    icon: "🔧",
  },
  {
    id: "extraire",
    label: "À Extraire (To Extract)",
    color: "bg-rose-100 border-rose-300 text-rose-900",
    icon: "⚠️",
  },
];

const FDI_TEETH = {
  "Maxillaire (Upper)": [
    18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  ],
  "Mandibule (Lower)": [
    48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
  ],
};

export function DentalDossier({
  patientId,
  initialToothStatuses = [],
  onSaveToHistory,
}: DentalDossierProps) {
  const [toothStatuses, setToothStatuses] = useState<Map<number, ToothStatus>>(
    new Map(initialToothStatuses.map((t) => [t.toothNumber, t])),
  );
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("saine");
  const [observations, setObservations] = useState<string>("");
  const [dossierNotes, setDossierNotes] = useState<string>("");
  // const [showObservations, setShowObservations] = useState(false);

  const getStatusConfig = (id: string) =>
    TOOTH_STATUS_OPTIONS.find((opt) => opt.id === id);

  const handleToothClick = (toothNumber: number) => {
    const existing = toothStatuses.get(toothNumber);
    if (existing) {
      setSelectedTooth(toothNumber);
      setSelectedStatus(existing.status);
      setObservations(existing.observations || "");
    } else {
      setSelectedTooth(toothNumber);
      setSelectedStatus("saine");
      setObservations("");
    }
  };

  const handleSaveToothStatus = async () => {
    if (selectedTooth === null) return;

    const newStatus: ToothStatus = {
      toothNumber: selectedTooth,
      status: (selectedStatus || "saine") as
        | "saine"
        | "carie"
        | "absente"
        | "couronne"
        | "obturation"
        | "pont"
        | "implant"
        | "extraire",
      observations,
    };

    setToothStatuses(new Map(toothStatuses).set(selectedTooth, newStatus));

    // Save to API
    try {
      await fetch("/api/dental/teeth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          toothNumber: selectedTooth,
          status: selectedStatus,
          observations,
        }),
      });
    } catch (error) {
      console.error("Error saving tooth status:", error);
    }

    setSelectedTooth(null);
  };

  const handleAddToHistory = () => {
    if (!dossierNotes.trim()) {
      alert("Veuillez ajouter des notes au dossier");
      return;
    }

    const historyEntry = {
      date: new Date().toISOString(),
      notes: dossierNotes,
      toothStatuses: Array.from(toothStatuses.values()),
    };

    if (onSaveToHistory) {
      onSaveToHistory(historyEntry);
    }

    // Save to API
    try {
      fetch("/api/dental/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          ...historyEntry,
        }),
      });
    } catch (error) {
      console.error("Error saving to history:", error);
    }

    setDossierNotes("");
    alert("✓ Entrée ajoutée à l'historique");
  };

  const getToothStatusSummary = () => {
    const summary = TOOTH_STATUS_OPTIONS.map((option) => {
      const count = Array.from(toothStatuses.values()).filter(
        (t) => t.status === option.id,
      ).length;
      return count > 0 ? `${count} ${option.label}` : null;
    }).filter(Boolean);
    return summary.length > 0 ? summary.join(", ") : "Aucun statut enregistré";
  };

  return (
    <div className='space-y-6 max-w-5xl mx-auto'>
      {/* Header */}
      <div className='bg-linear-to-r from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-200'>
        <h2 className='text-2xl font-black text-blue-900 flex items-center gap-3 mb-2'>
          <span className='text-3xl'>🦷</span>
          Dossier Dentaire Détaillé
        </h2>
        <p className='text-blue-700 text-sm'>
          Enregistrez l&apos;état actuel de chaque dent avec observations
          cliniques
        </p>
      </div>

      {/* Summary */}
      <div className='bg-white p-6 rounded-xl border border-gray-200 shadow-sm'>
        <h3 className='font-bold text-gray-900 mb-3'>Résumé Actuel</h3>
        <p className='text-gray-700'>{getToothStatusSummary()}</p>
      </div>

      {/* Tooth Grid by Jaw */}
      <div className='space-y-6'>
        {Object.entries(FDI_TEETH).map(([jawName, teeth]) => (
          <div key={jawName} className='space-y-3'>
            <h3 className='text-lg font-bold text-gray-900 flex items-center gap-2'>
              <span className='inline-block w-3 h-3 bg-blue-600 rounded-full'></span>
              {jawName}
            </h3>
            <div className='grid grid-cols-8 gap-2 bg-white p-4 rounded-xl border border-gray-200'>
              {teeth.map((toothNumber) => {
                const toothData = toothStatuses.get(toothNumber);
                const statusConfig = toothData
                  ? getStatusConfig(toothData.status)
                  : null;

                return (
                  <button
                    key={toothNumber}
                    onClick={() => handleToothClick(toothNumber)}
                    className={`p-3 rounded-lg border-2 transition-all transform hover:scale-105 font-bold cursor-pointer ${
                      selectedTooth === toothNumber
                        ? "ring-2 ring-offset-2 ring-blue-500 shadow-lg"
                        : ""
                    } ${statusConfig ? statusConfig.color : "bg-gray-50 border-gray-300 text-gray-600"}`}
                    title={toothData ? toothData.status : "Non défini"}
                  >
                    <div className='text-lg mb-1'>
                      {statusConfig?.icon || "?"}
                    </div>
                    <div className='text-xs'>{toothNumber}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tooth Status Editor */}
      {selectedTooth !== null && (
        <div className='bg-linear-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-300 shadow-lg'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-xl font-bold text-gray-900'>
              ✏️ NOUVELLE ENTRÉE SYSTÈME - DENT {selectedTooth}
            </h3>
            <button
              onClick={() => setSelectedTooth(null)}
              className='text-gray-500 hover:text-gray-700 text-2xl'
            >
              ✕
            </button>
          </div>

          <div className='space-y-4'>
            {/* Status Options */}
            <div>
              <label className='block text-sm font-bold text-gray-900 mb-3'>
                État Dentaire
              </label>
              <div className='grid grid-cols-2 gap-2'>
                {TOOTH_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedStatus(option.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      selectedStatus === option.id
                        ? `${option.color} border-current shadow-md ring-2 ring-offset-2`
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <div className='font-bold text-sm flex items-center gap-2'>
                      <span>{option.icon}</span>
                      {option.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Observations */}
            <div>
              <label className='block text-sm font-bold text-gray-900 mb-2'>
                Observations Cliniques
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder='Ex: Légère sensibilité au froid, légère inflammation gingivale, couleur jaunie...'
                className='w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                rows={3}
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveToothStatus}
              className='w-full bg-linear-to-r from-blue-600 to-blue-700 text-white font-bold py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md'
            >
              💾 Enregistrer État Dent {selectedTooth}
            </button>
          </div>
        </div>
      )}

      {/* Dossier Notes Section */}
      <div className='bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4'>
        <h3 className='text-lg font-bold text-gray-900 flex items-center gap-2'>
          📝 Observations Générales du Dossier
        </h3>

        <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3'>
          <AlertCircle className='w-5 h-5 text-blue-600 shrink-0 mt-0.5' />
          <p className='text-sm text-blue-800'>
            <strong>Instructions :</strong> Ajoutez des observations générales,
            recommandations de traitement, notes d&apos;urgence ou contexte
            clinique important.
          </p>
        </div>

        <textarea
          value={dossierNotes}
          onChange={(e) => setDossierNotes(e.target.value)}
          placeholder={`Ex: 
- Patient a une sensibilité générale
- Recommander traitement fluoré
- Urgence : extraction dent 14 envisagée
- Suivi orthodontie nécessaire
- Hygiène dentaire à améliorer`}
          className='w-full p-4 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-30'
        />

        {/* Save to History Button */}
        <button
          onClick={handleAddToHistory}
          className='w-full bg-linear-to-r from-green-600 to-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2 transform hover:scale-105'
        >
          <History size={20} />
          📅 Ajouter au Historique
        </button>
      </div>

      {/* Status Legend */}
      <div className='bg-gray-50 p-6 rounded-xl border border-gray-200'>
        <h3 className='font-bold text-gray-900 mb-4'>📖 Légende des États</h3>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          {TOOTH_STATUS_OPTIONS.map((option) => (
            <div
              key={option.id}
              className={`p-3 rounded-lg border-2 ${option.color}`}
            >
              <div className='text-lg mb-1'>{option.icon}</div>
              <div className='text-xs font-bold'>{option.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
