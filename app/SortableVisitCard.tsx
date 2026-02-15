"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { GripVertical, ChevronRight, Clock } from "lucide-react";

interface Visit {
  id: string;
  treatment: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface SortableVisitCardProps {
  visit: Visit;
  handleUpdateVisitStatus: (id: string, status: string) => Promise<void>;
}

// Specialty color mapping
const getSpecialtyColor = (treatment: string) => {
  const cleanTreatment = (treatment || "").toLowerCase().trim();

  if (cleanTreatment.includes("odf") || cleanTreatment.includes("orthodont")) {
    return {
      bg: "bg-cyan-50",
      border: "border-cyan-300",
      text: "text-cyan-900",
      badge: "bg-cyan-100",
      badgeText: "text-cyan-700",
      accentLight: "#4ECDC4",
      accentDark: "#008B7F",
    };
  } else if (cleanTreatment.includes("chirurgi")) {
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-300",
      text: "text-emerald-900",
      badge: "bg-emerald-100",
      badgeText: "text-emerald-700",
      accentLight: "#95E1D3",
      accentDark: "#00997A",
    };
  } else if (
    cleanTreatment.includes("prothes") ||
    cleanTreatment.includes("bridge") ||
    cleanTreatment.includes("couronne")
  ) {
    return {
      bg: "bg-amber-50",
      border: "border-amber-300",
      text: "text-amber-900",
      badge: "bg-amber-100",
      badgeText: "text-amber-700",
      accentLight: "#FFE66D",
      accentDark: "#996600",
    };
  } else {
    // Soin (General Care) - Red
    return {
      bg: "bg-red-50",
      border: "border-red-300",
      text: "text-red-900",
      badge: "bg-red-100",
      badgeText: "text-red-700",
      accentLight: "#FF6B6B",
      accentDark: "#CC0000",
    };
  }
};

export function SortableVisitCard({
  visit,
  handleUpdateVisitStatus,
}: SortableVisitCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: visit.id });

  const colors = getSpecialtyColor(visit.treatment);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${colors.bg} ${colors.border} border-l-4 rounded-2xl shadow-sm hover:shadow-lg transition-all ${
        isDragging ? "z-50 shadow-2xl scale-105" : ""
      }`}
    >
      <div className='p-4 space-y-3'>
        {/* Header */}
        <div className='flex justify-between items-start gap-3'>
          <div className='flex items-center gap-3 flex-1 min-w-0'>
            <button
              {...attributes}
              {...listeners}
              className='cursor-grab active:cursor-grabbing p-2 hover:bg-white/50 rounded-lg transition-colors flex-shrink-0'
              title='Glisser pour réorganiser'
              style={{ color: colors.accentDark }}
            >
              <GripVertical size={20} />
            </button>
            <div className='flex-1 min-w-0'>
              <h3 className={`font-black text-xl ${colors.text} truncate`}>
                {visit.patient.firstName} {visit.patient.lastName}
              </h3>
              <p className={`text-sm font-bold ${colors.badgeText} mt-1`}>
                {visit.treatment}
              </p>
            </div>
          </div>
        </div>

        {/* Treatment Badge */}
        <div className='flex items-center gap-2'>
          <span
            className={`${colors.badge} ${colors.badgeText} px-3 py-1.5 rounded-full font-black text-xs`}
          >
            ⏱️ En attente
          </span>
          <span
            className='inline-block w-2.5 h-2.5 rounded-full animate-pulse'
            style={{ backgroundColor: colors.accentLight }}
          ></span>
        </div>

        {/* Action Buttons */}
        <div className='flex gap-2 pt-2'>
          <form
            action={handleUpdateVisitStatus.bind(null, visit.id, "IN_PROGRESS")}
            className='flex-1'
          >
            <button
              className='w-full py-2.5 px-4 bg-gradient-to-r text-white rounded-lg text-sm font-black transition-all hover:shadow-md active:scale-95 flex items-center justify-center gap-2'
              style={{
                backgroundImage: `linear-gradient(to right, ${colors.accentDark}, ${colors.accentLight})`,
              }}
            >
              <Clock size={16} />
              Commencer
            </button>
          </form>
          <Link
            href={`/patients/${visit.patient.id}`}
            className={`py-2.5 px-3 ${colors.badge} ${colors.badgeText} rounded-lg text-sm font-bold hover:shadow-md transition-all flex items-center justify-center`}
          >
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
