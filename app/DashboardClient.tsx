"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  User,
  Clock,
  CheckCircle,
  X,
  RotateCcw,
  Search,
  Calendar,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  Stethoscope,
  AlertCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  createPatientAndVisit,
  updateVisitStatus,
  reorderWaitingVisits,
  getVisitCount,
  getDailyCounts,
  reactivateVisit,
} from "@/app/actions";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableVisitCard } from "./SortableVisitCard";
import DatePicker from "./components/DatePicker";

type Visit = any;

// Helper function to get specialty color
const getSpecialtyColor = (treatment?: string) => {
  if (!treatment)
    return {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-700",
      badge: "bg-gray-100",
      badgeText: "text-gray-700",
      accentDark: "#5A5A5A",
      accentLight: "#E5E7EB",
    };

  const lower = treatment.toLowerCase();
  if (
    lower.includes("soin") ||
    lower.includes("detartrage") ||
    lower.includes("obturation") ||
    lower.includes("devitalisation")
  ) {
    return {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-900",
      badge: "bg-red-100",
      badgeText: "text-red-700",
      accentDark: "#CC0000",
      accentLight: "#FF6B6B",
    };
  }
  if (
    lower.includes("odf") ||
    lower.includes("ortho") ||
    lower.includes("blanchiment")
  ) {
    return {
      bg: "bg-cyan-50",
      border: "border-cyan-200",
      text: "text-cyan-900",
      badge: "bg-cyan-100",
      badgeText: "text-cyan-700",
      accentDark: "#008B7F",
      accentLight: "#4ECDC4",
    };
  }
  if (lower.includes("chirurgie") || lower.includes("extraction")) {
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-900",
      badge: "bg-emerald-100",
      badgeText: "text-emerald-700",
      accentDark: "#00997A",
      accentLight: "#95E1D3",
    };
  }
  if (lower.includes("proth") || lower.includes("couronne")) {
    return {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      badge: "bg-amber-100",
      badgeText: "text-amber-700",
      accentDark: "#996600",
      accentLight: "#FFE66D",
    };
  }
  return {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    badge: "bg-gray-100",
    badgeText: "text-gray-700",
    accentDark: "#5A5A5A",
    accentLight: "#E5E7EB",
  };
};

export default function DashboardClient({
  initialScheduled,
  initialWaiting,
  initialInProgress,
  initialCompleted,
  initialCancelled = [],
}: {
  initialScheduled: Visit[];
  initialWaiting: Visit[];
  initialInProgress: Visit[];
  initialCompleted: Visit[];
  initialCancelled?: Visit[];
}) {
  const normalizePhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.startsWith("213")) {
      const local = digits.slice(3);
      return `0${local}`.slice(0, 10);
    }
    if (digits.startsWith("0")) {
      return digits.slice(0, 10);
    }
    if (digits.length > 0) {
      return `0${digits}`.slice(0, 10);
    }
    return "";
  };

  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const [scheduledQuery, setScheduledQuery] = useState("");
  const [waitingQuery, setWaitingQuery] = useState("");

  const [waitingVisits, setWaitingVisits] = useState(initialWaiting);
  const [selectedSpecialty, setSelectedSpecialty] = useState<
    string | undefined
  >(undefined);
  const [isMounted, setIsMounted] = useState(false);

  // Charge Strip State
  const [dailyCounts, setDailyCounts] = useState<{ [date: string]: number }>(
    {},
  );
  const getLocalDateString = (d: Date) => {
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  };

  const [selectedDate, setSelectedDate] = useState(
    dateParam || getLocalDateString(new Date()),
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  // Form States
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRequestIdRef = useRef(0);
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    treatment: "",
    date: selectedDate,
    patientId: "",
  });

  useEffect(() => {
    setIsMounted(true);
    loadDailyCounts();
  }, []);

  // Sync state with props when data changes on server
  useEffect(() => {
    setWaitingVisits(initialWaiting);
    loadDailyCounts();
  }, [
    initialWaiting,
    initialScheduled,
    initialCompleted,
    initialCancelled,
    dateParam,
  ]);

  const loadDailyCounts = async () => {
    const start = new Date();
    start.setDate(start.getDate() - 3); // Show from 3 days ago
    const counts = await getDailyCounts(
      getLocalDateString(start),
      21,
      selectedSpecialty,
    ); // 3 weeks
    setDailyCounts(counts);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    router.push(
      `/?date=${date}${selectedSpecialty ? `&specialty=${selectedSpecialty}` : ""}`,
    );
  };

  const handleSpecialtyChange = (specialty: string | undefined) => {
    setSelectedSpecialty(specialty);
    router.push(
      `/?date=${selectedDate}${specialty ? `&specialty=${specialty}` : ""}`,
    );
    router.refresh(); // Ensure counts and list reload
  };

  const handleUpdateVisitStatus = async (visitId: string, status: string) => {
    await updateVisitStatus(visitId, status);
    router.refresh();
  };

  useEffect(() => {
    const query = searchQuery.trim();

    if (!showCreateForm || query.length < 1) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const requestId = ++searchRequestIdRef.current;
      setIsSearching(true);
      try {
        const { getPatients } = await import("./actions");
        const results = await getPatients(query);
        if (requestId === searchRequestIdRef.current) {
          setSearchResults(results);
        }
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery, showCreateForm]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = waitingVisits.findIndex((v: Visit) => v.id === active.id);
    const newIndex = waitingVisits.findIndex((v: Visit) => v.id === over.id);

    const newOrder = arrayMove(waitingVisits, oldIndex, newIndex);
    setWaitingVisits(newOrder);

    await reorderWaitingVisits(newOrder.map((v: Visit) => v.id));
    router.refresh();
  };

  const filterVisits = (visits: Visit[], query: string) => {
    if (!query) return visits;
    const lowerQuery = query.toLowerCase();
    return visits.filter(
      (v: Visit) =>
        v.patient.firstName.toLowerCase().includes(lowerQuery) ||
        v.patient.lastName.toLowerCase().includes(lowerQuery) ||
        v.treatment.toLowerCase().includes(lowerQuery),
    );
  };

  const filteredScheduled = filterVisits(initialScheduled, scheduledQuery);
  const filteredCompleted = filterVisits(initialCompleted, "");
  const filteredCancelled = filterVisits(initialCancelled, "");

  // Generate dates for the strip (5 weeks starting from the previous Saturday)
  const stripDates: Date[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday

  // Find the previous Saturday
  const prevSaturday = new Date(today);
  // If today is Saturday (6), we go back 0 days.
  // If today is Sunday (0), we go back 1 day.
  // If today is Monday (1), we go back 2 days.
  // ...
  const daysToSubtract = (dayOfWeek + 1) % 7;
  prevSaturday.setDate(today.getDate() - daysToSubtract);
  prevSaturday.setHours(0, 0, 0, 0);

  for (let i = 0; i < 35; i++) {
    const d = new Date(prevSaturday);
    d.setDate(prevSaturday.getDate() + i);
    stripDates.push(d);
  }

  return (
    <div className='space-y-6 max-w-7xl mx-auto px-4 py-8 bg-gray-50/50 min-h-screen'>
      {/* Top Bar with Quick Add and Search */}
      <header className='flex flex-col gap-6 mb-8'>
        <div className='flex justify-between items-center'>
          <div>
            <h1 className='text-4xl font-extrabold text-gray-900 tracking-tight'>
              Tableau de bord
            </h1>
            <p className='text-gray-500 font-medium mt-1'>
              Gérer vos patients et rendez-vous du jour
            </p>
          </div>
          <button
            onClick={() => {
              setCreateFeedback(null);
              setShowCreateForm(true);
            }}
            className='flex items-center gap-2 px-6 py-3 text-white rounded-2xl font-black shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all text-lg'
            style={{
              backgroundImage:
                "linear-gradient(135deg, #9B2C3E 0%, #E63946 50%, #FF6B6B 100%)",
              boxShadow: "0 10px 25px rgba(230, 57, 70, 0.3)",
            }}
          >
            <Plus size={22} />
            🚀 Ajoût Rapide
          </button>
        </div>

        <div className='flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar flex-wrap'>
          <button
            onClick={() => handleSpecialtyChange(undefined)}
            className={`px-4 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap ${!selectedSpecialty ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white"}`}
          >
            ✓ Tous les Services
          </button>
          {[
            { name: "Soin", dark: "#CC0000", light: "#FF6B6B" },
            { name: "ODF", dark: "#008B7F", light: "#4ECDC4" },
            { name: "Chirurgie", dark: "#00997A", light: "#95E1D3" },
            { name: "Proteges", dark: "#996600", light: "#FFE66D" },
          ].map((specialty) => (
            <button
              key={specialty.name}
              onClick={() => handleSpecialtyChange(specialty.name)}
              className='px-4 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap text-white shadow-md'
              style={{
                backgroundColor:
                  selectedSpecialty === specialty.name
                    ? specialty.dark
                    : specialty.light,
                color: "white",
                border: `2px solid ${specialty.dark}`,
              }}
            >
              {selectedSpecialty === specialty.name ? "✓ " : ""}
              {specialty.name === "Proteges" ? "Protège" : specialty.name}
            </button>
          ))}
        </div>

        {/* Enhanced 5-Week Timeline grouped by weeks */}
        <div className='bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4'>
          <div className='flex justify-between items-center'>
            <h2 className='text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2'>
              <Calendar size={16} className='text-primary' /> Planning sur 5
              Semaines
            </h2>
            <div className='flex gap-2'>
              <button
                onClick={() =>
                  scrollRef.current?.scrollBy({
                    left: -400,
                    behavior: "smooth",
                  })
                }
                className='p-2 hover:bg-gray-50 rounded-xl text-gray-400 border border-transparent hover:border-gray-200 transition-all'
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() =>
                  scrollRef.current?.scrollBy({ left: 400, behavior: "smooth" })
                }
                className='p-2 hover:bg-gray-50 rounded-xl text-gray-400 border border-transparent hover:border-gray-200 transition-all'
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className='flex gap-6 overflow-x-auto pb-4 no-scrollbar'
          >
            {Array.from({ length: 5 }).map((_, weekIndex) => (
              <div
                key={weekIndex}
                className='flex-shrink-0 grid grid-cols-7 gap-2 p-3 bg-gray-50/50 rounded-2xl border border-gray-100 min-w-[500px]'
              >
                {stripDates
                  .slice(weekIndex * 7, (weekIndex + 1) * 7)
                  .map((date) => {
                    const dateStr = getLocalDateString(date);
                    const isSelected = dateStr === selectedDate;
                    const isToday = getLocalDateString(new Date()) === dateStr;
                    const count = dailyCounts[dateStr] || 0;
                    const dayName = date.toLocaleDateString("fr-FR", {
                      weekday: "short",
                    });
                    const dayNum = date.getDate();

                    const dateColor = (() => {
                      if (!selectedSpecialty)
                        return { bg: "bg-blue-600", ring: "ring-blue-200" };
                      if (selectedSpecialty === "Soin")
                        return { bg: "bg-red-600", ring: "ring-red-200" };
                      if (selectedSpecialty === "ODF")
                        return { bg: "bg-cyan-600", ring: "ring-cyan-200" };
                      if (selectedSpecialty === "Chirurgie")
                        return {
                          bg: "bg-emerald-600",
                          ring: "ring-emerald-200",
                        };
                      if (selectedSpecialty === "Proteges")
                        return { bg: "bg-amber-600", ring: "ring-amber-200" };
                      return { bg: "bg-blue-600", ring: "ring-blue-200" };
                    })();
                    return (
                      <button
                        key={dateStr}
                        onClick={() => handleDateChange(dateStr)}
                        className={`
                                                flex flex-col items-center justify-center p-2 rounded-xl transition-all relative font-bold
                                                ${isSelected ? `${dateColor.bg} text-white shadow-lg ring-4 ${dateColor.ring}` : "bg-white/70 hover:bg-white text-gray-600"}
                                                ${!isSelected && isToday ? `ring-2 ${dateColor.ring}` : ""}
                                            `}
                      >
                        <span
                          className={`text-[9px] font-bold uppercase ${isSelected ? "opacity-80" : "text-gray-400"}`}
                        >
                          {dayName}
                        </span>
                        <span className='text-lg font-black tracking-tighter my-0.5'>
                          {dayNum}
                        </span>
                        <div
                          className={`
                                                flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[9px] font-bold px-1
                                                ${
                                                  isSelected
                                                    ? "bg-white/20 text-white"
                                                    : count > 0
                                                      ? "bg-primary/10 text-primary"
                                                      : "bg-gray-100 text-gray-300"
                                                }
                                            `}
                        >
                          {count}
                        </div>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Colonne 1: Rendez-vous prévus - Colorful with Specialty Indicators */}
        <section className='bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[750px] overflow-hidden'>
          <div className='p-5 border-b border-gray-50 bg-gradient-to-r from-blue-50 to-transparent'>
            <h2 className='text-xl font-black text-gray-900 flex items-center gap-2 mb-4'>
              <Clock className='text-blue-500 animate-bounce' size={24} />{" "}
              Rendez-vous prévus
              <span className='ml-auto bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-black'>
                {filteredScheduled.length}
              </span>
            </h2>

            <div className='relative'>
              <Search
                className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'
                size={16}
              />
              <input
                type='text'
                placeholder='Rechercher par nom ou service...'
                className='w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none transition-all'
                value={scheduledQuery}
                onChange={(e) => setScheduledQuery(e.target.value)}
              />
            </div>
          </div>

          <div className='flex-1 overflow-y-auto p-4 space-y-3'>
            {filteredScheduled.length === 0 && (
              <div className='flex flex-col items-center justify-center py-20 text-gray-400'>
                <Calendar size={48} className='mb-4 opacity-20' />
                <p className='text-sm font-bold'>Aucun rendez-vous prévu</p>
              </div>
            )}
            {filteredScheduled.map((visit: Visit) => {
              const colors = getSpecialtyColor(visit.treatment);
              return (
                <div
                  key={visit.id}
                  className={`group ${colors.bg} ${colors.border} border-l-4 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 p-4 space-y-3`}
                >
                  <div className='flex justify-between items-start gap-3'>
                    <div className='flex-1 min-w-0'>
                      <h3
                        className={`font-black text-lg ${colors.text} truncate group-hover:scale-105 transition-transform`}
                      >
                        {visit.patient.firstName} {visit.patient.lastName}
                      </h3>
                      <div className='flex items-center gap-2 mt-2'>
                        <span
                          className={`${colors.badge} ${colors.badgeText} px-3 py-1 rounded-full font-bold text-xs truncate`}
                        >
                          {visit.treatment}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/patients/${visit.patientId}`}
                      className={`p-2 rounded-lg transition-colors flex-shrink-0`}
                      style={{
                        color: colors.accentDark,
                        backgroundColor: colors.accentLight + "20",
                      }}
                    >
                      <ChevronRight size={20} />
                    </Link>
                  </div>
                  <div className='flex gap-2 pt-2'>
                    <form
                      action={handleUpdateVisitStatus.bind(
                        null,
                        visit.id,
                        "WAITING",
                      )}
                      className='flex-1'
                    >
                      <button
                        className='w-full py-2.5 text-white text-xs font-black rounded-lg transition-all hover:shadow-md active:scale-95'
                        style={{
                          backgroundImage: `linear-gradient(to right, ${colors.accentDark}, ${colors.accentLight})`,
                        }}
                      >
                        ✓ Arrivé
                      </button>
                    </form>
                    <form
                      action={handleUpdateVisitStatus.bind(
                        null,
                        visit.id,
                        "CANCELLED",
                      )}
                    >
                      <button
                        title='Annuler ce rendez-vous'
                        className='p-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all font-bold border-2 border-red-200 hover:border-red-600'
                      >
                        <X size={18} />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Colonne 2: Salle d'attente */}
        <section className='bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[750px] overflow-hidden'>
          <div className='p-5 border-b border-gray-50 bg-gradient-to-r from-primary/5 to-transparent'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-2 bg-primary/20 text-primary rounded-xl animate-pulse-subtle'>
                <User size={20} />
              </div>
              <div>
                <h2 className='text-lg font-bold text-gray-800'>
                  Salle d&apos;attente
                </h2>
                <p className='text-[10px] text-primary font-bold uppercase tracking-wider'>
                  Patients présents
                </p>
              </div>
              <span className='ml-auto bg-primary text-white px-3 py-1 rounded-full text-xs font-black shadow-inner'>
                {waitingVisits.length}
              </span>
            </div>
            <div className='relative'>
              <Search
                className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'
                size={16}
              />
              <input
                type='text'
                placeholder="Filtrer l'attente..."
                className='w-full pl-10 pr-4 py-2.5 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/10 outline-none shadow-sm'
                value={waitingQuery}
                onChange={(e) => setWaitingQuery(e.target.value)}
              />
            </div>
          </div>

          {!isMounted ? (
            <div className='flex-1 overflow-y-auto p-4 space-y-3'>
              <div className='h-24 bg-gray-100 rounded-2xl animate-pulse' />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={waitingVisits.map((v: Visit) => v.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className='flex-1 overflow-y-auto p-4 space-y-4'>
                  {waitingVisits.length === 0 && (
                    <div className='flex flex-col items-center justify-center py-20 text-gray-400'>
                      <p className='text-sm font-medium'>
                        Salle d&apos;attente vide
                      </p>
                    </div>
                  )}
                  {waitingVisits
                    .filter((v: Visit) =>
                      `${v.patient.firstName} ${v.patient.lastName}`
                        .toLowerCase()
                        .includes(waitingQuery.toLowerCase()),
                    )
                    .map((visit: Visit) => (
                      <SortableVisitCard
                        key={visit.id}
                        visit={visit}
                        handleUpdateVisitStatus={handleUpdateVisitStatus}
                      />
                    ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        {/* Colonne 3: En Consultation / Terminés / Autres */}
        <section className='space-y-6'>
          {/* En Consultation - Large, Colorful Cards */}
          {initialInProgress.length > 0 && (
            <div className='space-y-4'>
              <h2 className='text-2xl font-black text-gray-900 flex items-center gap-3'>
                <Zap className='text-yellow-500 animate-pulse' size={28} />
                <span>En Consultation ({initialInProgress.length})</span>
              </h2>
              <div className='space-y-4'>
                {initialInProgress.map((visit: Visit) => {
                  const colors = getSpecialtyColor(visit.treatment);
                  return (
                    <div
                      key={visit.id}
                      className={`${colors.bg} ${colors.border} border-2 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}
                    >
                      <div className='flex items-start justify-between mb-4'>
                        <div className='flex-1'>
                          <h3 className='text-2xl font-black text-gray-900 mb-2'>
                            {visit.patient.firstName} {visit.patient.lastName}
                          </h3>
                          <div className='flex items-center gap-2 mb-3'>
                            <span
                              className={`${colors.badge} ${colors.badgeText} px-4 py-2 rounded-full font-black text-sm`}
                            >
                              {visit.treatment}
                            </span>
                            <span
                              className='inline-block h-3 w-3 rounded-full animate-pulse'
                              style={{ backgroundColor: colors.accentLight }}
                            ></span>
                          </div>
                          <p className='text-gray-600 font-semibold'>
                            🚪 Salle - En Cours
                          </p>
                        </div>
                        <Link
                          href={`/patients/${visit.patientId}`}
                          className={`p-3 rounded-2xl transition-colors hover:bg-white/50`}
                          style={{ color: colors.accentDark }}
                        >
                          <ChevronRight size={24} />
                        </Link>
                      </div>
                      <div
                        className='flex gap-3 pt-4 border-t-2'
                        style={{ borderColor: colors.accentLight }}
                      >
                        <form
                          action={handleUpdateVisitStatus.bind(
                            null,
                            visit.id,
                            "COMPLETED",
                          )}
                          className='flex-1'
                        >
                          <button
                            type='submit'
                            className='w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-black hover:shadow-lg transition-all flex items-center justify-center gap-2'
                          >
                            <CheckCircle size={18} />
                            TERMINER
                          </button>
                        </form>
                        <form
                          action={handleUpdateVisitStatus.bind(
                            null,
                            visit.id,
                            "WAITING",
                          )}
                        >
                          <button
                            type='submit'
                            title='Retour en attente'
                            className={`p-3 ${colors.badge} rounded-xl hover:shadow-lg transition-all`}
                            style={{ color: colors.accentDark }}
                          >
                            <RotateCcw size={18} />
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Terminés */}
          <div className='bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl shadow-sm border-2 border-green-200 p-6'>
            <h2 className='text-xl font-black text-green-900 flex justify-between items-center mb-4'>
              <span className='flex items-center gap-2'>
                <CheckCircle size={24} className='text-green-600' /> Terminés
              </span>
              <span className='text-2xl font-black text-green-600 bg-white px-4 py-1 rounded-full'>
                {initialCompleted.length}
              </span>
            </h2>
            <div className='space-y-3 max-h-[250px] overflow-y-auto pr-2'>
              {initialCompleted.length === 0 ? (
                <p className='text-green-600 font-semibold py-8 text-center'>
                  Aucun rendez-vous terminé
                </p>
              ) : (
                initialCompleted.map((visit: Visit) => {
                  const colors = getSpecialtyColor(visit.treatment);
                  return (
                    <Link
                      key={visit.id}
                      href={`/patients/${visit.patientId}`}
                      className={`p-4 ${colors.bg} border-2 ${colors.border} rounded-2xl hover:shadow-md transition-all block group`}
                    >
                      <h3
                        className={`text-sm font-black ${colors.text} group-hover:underline`}
                      >
                        {visit.patient.firstName} {visit.patient.lastName}
                      </h3>
                      <p className='text-xs text-gray-600 font-semibold mt-1'>
                        {visit.treatment}
                      </p>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Annulés */}
          <div className='bg-gradient-to-br from-red-50 to-pink-50 rounded-3xl shadow-sm border-2 border-red-200 p-6'>
            <h2 className='text-xl font-black text-red-900 flex justify-between items-center mb-4'>
              <span className='flex items-center gap-2'>
                <AlertCircle size={24} className='text-red-600' /> Annulés
              </span>
              <span className='text-2xl font-black text-red-600 bg-white px-4 py-1 rounded-full'>
                {initialCancelled.length}
              </span>
            </h2>
            <div className='space-y-3 max-h-[250px] overflow-y-auto pr-2'>
              {initialCancelled.length === 0 ? (
                <p className='text-red-600 font-semibold py-8 text-center'>
                  Aucun rendez-vous annulé
                </p>
              ) : (
                initialCancelled.map((visit: Visit) => (
                  <div
                    key={visit.id}
                    className='p-4 bg-red-100/50 border-2 border-red-200 rounded-2xl flex justify-between items-center group hover:bg-red-100 transition-all'
                  >
                    <div className='flex-1'>
                      <Link
                        href={`/patients/${visit.patientId}`}
                        className='text-sm font-black text-red-800 line-through hover:no-underline'
                      >
                        {visit.patient.firstName} {visit.patient.lastName}
                      </Link>
                      <p className='text-xs text-red-600 font-semibold mt-1'>
                        {visit.treatment}
                      </p>
                    </div>
                    <form
                      action={async (f) => {
                        await reactivateVisit(f);
                        router.refresh();
                      }}
                    >
                      <input type='hidden' name='visitId' value={visit.id} />
                      <button
                        type='submit'
                        className='p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all'
                        title='Réactiver'
                      >
                        <RotateCcw size={14} />
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Quick Add Modal */}
      {showCreateForm && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border-2 border-primary/20 max-h-[90vh] flex flex-col'>
            <div className='p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-primary to-purple-600 text-white'>
              <h2 className='text-xl font-bold'>
                ✨ Nouveau Patient / RDV Rapide
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateFeedback(null);
                  setFormState({
                    firstName: "",
                    lastName: "",
                    phone: "",
                    treatment: "",
                    date: selectedDate,
                    patientId: "",
                  });
                  setSearchResults([]);
                  setSearchQuery("");
                }}
                className='p-1 hover:bg-white/20 rounded-lg transition-all'
              >
                <X size={24} />
              </button>
            </div>
            <div className='p-6 space-y-4 overflow-y-auto flex-1 no-scrollbar'>
              <div className='relative'>
                <Search
                  className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'
                  size={18}
                />
                <input
                  type='text'
                  placeholder='Chercher patient existant...'
                  className='w-full pl-10 pr-4 py-3 border border-gray-100 bg-gray-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20'
                  value={searchQuery}
                  onChange={(e) => {
                    const query = e.target.value;
                    setSearchQuery(query);
                    setCreateFeedback(null);
                    if (query.length === 0) {
                      setSearchResults([]);
                    }
                  }}
                />
                {isSearching && (
                  <p className='text-xs text-gray-500 mt-2 ml-2'>
                    Recherche en cours...
                  </p>
                )}
                {searchResults.length > 0 && (
                  <div className='absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-xl rounded-2xl z-10 max-h-48 overflow-y-auto'>
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setFormState({
                            firstName: p.firstName,
                            lastName: p.lastName,
                            phone: p.phone || "",
                            treatment: "",
                            date: selectedDate,
                            patientId: p.id,
                          });
                          setCreateFeedback(null);
                          setSearchResults([]);
                          setSearchQuery("");
                        }}
                        className='w-full text-left px-4 py-3 hover:bg-primary/5 border-b last:border-0 flex justify-between items-center'
                      >
                        <span className='font-bold text-gray-700'>
                          {p.firstName} {p.lastName}
                        </span>
                        <span className='text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500'>
                          {p.phone || "Sans téléphone"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {formState.patientId && (
                <div className='flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3'>
                  <div>
                    <p className='text-xs font-bold text-emerald-700 uppercase tracking-wide'>
                      Patient sélectionné
                    </p>
                    <p className='text-sm font-semibold text-emerald-900'>
                      {formState.firstName} {formState.lastName}
                      {formState.phone ? ` • ${formState.phone}` : ""}
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => {
                      setFormState({
                        firstName: "",
                        lastName: "",
                        phone: "",
                        treatment: "",
                        date: selectedDate,
                        patientId: "",
                      });
                      setCreateFeedback(null);
                    }}
                    className='text-xs font-bold text-emerald-700 hover:text-emerald-900'
                  >
                    Changer
                  </button>
                </div>
              )}
              {createFeedback && (
                <div className='bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3'>
                  <p className='text-sm font-semibold text-amber-800'>
                    {createFeedback}
                  </p>
                </div>
              )}

              <form
                action={async (formData) => {
                  const result = await createPatientAndVisit(formData);
                  if (!result?.ok) {
                    if (result?.reason === "duplicate-visit") {
                      setCreateFeedback(
                        "Ce patient a déjà un rendez-vous actif pour cette date.",
                      );
                    } else if (result?.reason === "capacity-exceeded") {
                      setCreateFeedback(
                        "Ce jour est complet (60 rendez-vous maximum). Choisissez une autre date.",
                      );
                    } else {
                      setCreateFeedback(
                        result?.message ||
                          "Impossible de créer le rendez-vous.",
                      );
                    }
                    return;
                  }

                  setShowCreateForm(false);
                  setCreateFeedback(null);
                  setFormState({
                    firstName: "",
                    lastName: "",
                    phone: "",
                    treatment: "",
                    date: selectedDate,
                    patientId: "",
                  });
                  setSearchResults([]);
                  setSearchQuery("");
                  router.refresh();
                }}
                className='space-y-4'
              >
                <input
                  type='hidden'
                  name='patientId'
                  value={formState.patientId}
                />
                <div className='space-y-2'>
                  <label className='text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest'>
                    Date de Rendez-vous (Français)
                  </label>
                  <div className='bg-gray-50 border-2 border-gray-100 rounded-3xl p-1 overflow-hidden'>
                    <DatePicker
                      selectedDate={formState.date}
                      onChange={(date) => setFormState({ ...formState, date })}
                    />
                  </div>
                  <input type='hidden' name='date' value={formState.date} />
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <label className='text-[10px] font-bold text-gray-400 uppercase ml-2'>
                      Prénom
                    </label>
                    <input
                      name='firstName'
                      required
                      value={formState.firstName}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          firstName: e.target.value,
                        })
                      }
                      className='w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm'
                    />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-[10px] font-bold text-gray-400 uppercase ml-2'>
                      Nom
                    </label>
                    <input
                      name='lastName'
                      required
                      value={formState.lastName}
                      onChange={(e) =>
                        setFormState({ ...formState, lastName: e.target.value })
                      }
                      className='w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm'
                    />
                  </div>
                </div>
                <div className='space-y-1'>
                  <label className='text-[10px] font-bold text-gray-400 uppercase ml-2'>
                    Téléphone
                  </label>
                  <input
                    name='phone'
                    type='tel'
                    inputMode='numeric'
                    autoComplete='tel'
                    maxLength={10}
                    pattern='0[0-9]{9}'
                    value={formState.phone}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        phone: normalizePhoneInput(e.target.value),
                      })
                    }
                    placeholder='Ex: 0550123456 (ou +213...)'
                    className='w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20'
                  />
                  <p className='text-[11px] text-gray-500 ml-2'>
                    Format accepté: 0XXXXXXXXX (10 chiffres)
                  </p>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <label className='text-[10px] font-bold text-gray-400 uppercase ml-2'>
                      Spécialité
                    </label>
                    <select
                      name='specialty'
                      required
                      onChange={(e) => {
                        const specialty = e.target.value;
                        const sessionTypeMap: { [key: string]: string } = {
                          Soin: "Détartrage",
                          ODF: "Bagues",
                          Chirurgie: "Extraction",
                          Proteges: "Prothèse",
                        };
                        const form = e.target.closest("form");
                        if (form) {
                          const sessionTypeInput = form.querySelector(
                            'input[name="sessionType"]',
                          ) as HTMLInputElement;
                          if (sessionTypeInput) {
                            sessionTypeInput.value =
                              sessionTypeMap[specialty] || "";
                          }
                        }
                      }}
                      className='w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20'
                    >
                      <option value=''>Sélectionner...</option>
                      <option value='Soin'>🔴 Soin</option>
                      <option value='ODF'>🔵 ODF</option>
                      <option value='Chirurgie'>🟢 Chirurgie</option>
                      <option value='Proteges'>🟡 Protège</option>
                    </select>
                  </div>
                  <div className='space-y-1'>
                    <label className='text-[10px] font-bold text-gray-400 uppercase ml-2'>
                      Type de Séance
                    </label>
                    <input
                      name='sessionType'
                      placeholder='ex: Suivi, Pose...'
                      className='w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20'
                    />
                  </div>
                </div>
                <div className='space-y-1'>
                  <label className='text-[10px] font-bold text-gray-400 uppercase ml-2'>
                    Motif / Traitement
                  </label>
                  <input
                    name='treatment'
                    required
                    list='treatment-suggestions'
                    value={formState.treatment}
                    onChange={(e) =>
                      setFormState({ ...formState, treatment: e.target.value })
                    }
                    className='w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20'
                  />
                  <datalist id='treatment-suggestions'>
                    <option value='Consultation' />
                    <option value='Détartrage' />
                    <option value='Extraction Simple' />
                    <option value='Extraction Chirurgicale' />
                    <option value='Dévitalisation' />
                    <option value='Obturation (Plombage)' />
                    <option value='Prothèse Fixe' />
                    <option value='Prothèse Amovible' />
                    <option value='Blanchiment' />
                    <option value='Urgence' />
                  </datalist>
                </div>
                <div className='space-y-1'>
                  <label className='text-[10px] font-bold text-gray-400 uppercase ml-2'>
                    Description / Notes Pré-séance
                  </label>
                  <textarea
                    name='description'
                    placeholder='Détails importants avant de commencer...'
                    rows={2}
                    className='w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none'
                  />
                </div>
                <div className='flex gap-4'>
                  <button
                    type='button'
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateFeedback(null);
                      setFormState({
                        firstName: "",
                        lastName: "",
                        phone: "",
                        treatment: "",
                        date: selectedDate,
                        patientId: "",
                      });
                      setSearchResults([]);
                      setSearchQuery("");
                    }}
                    className='flex-1 py-4 bg-gray-300 text-gray-900 rounded-2xl font-black shadow-lg hover:shadow-xl hover:bg-gray-400 transition-all transform active:scale-[0.98] text-lg'
                  >
                    ANNULER
                  </button>
                  <button
                    type='submit'
                    className='flex-1 py-4 bg-gradient-to-r from-primary to-purple-600 text-white rounded-2xl font-black shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 active:scale-[0.98] text-lg'
                  >
                    🚀 AJOUTER LE RENDEZ-VOUS
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
