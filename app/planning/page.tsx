"use client";
import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Clock,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useBookingSync } from "../../lib/booking-sync";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  date: Date;
  specialty: string;
  doctorName?: string;
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  status: "available" | "booked" | "completed" | "missed" | "cancelled";
  isFromBookingPortal?: boolean;
  syncStatus?: "synced" | "pending" | "error";
}

// Mock data for planning slots
const mockTimeSlots: TimeSlot[] = [
  {
    id: "1",
    startTime: "09:00",
    endTime: "09:30",
    date: new Date(),
    specialty: "Soin",
    doctorName: "Dr. Alami",
    patientId: "1",
    patientName: "Marie Dubois",
    patientPhone: "0606789012",
    status: "booked",
    syncStatus: "synced",
  },
  {
    id: "2",
    startTime: "09:30",
    endTime: "10:00",
    date: new Date(),
    specialty: "ODF",
    doctorName: "Dr. Bennani",
    status: "available",
    syncStatus: "synced",
  },
  {
    id: "3",
    startTime: "10:00",
    endTime: "11:00",
    date: new Date(),
    specialty: "Chirurgie",
    doctorName: "Dr. El Fassi",
    patientId: "3",
    patientName: "Sophie Bernard",
    patientPhone: "0608901234",
    status: "booked",
    isFromBookingPortal: true,
    syncStatus: "pending",
  },
];

const specialties = ["Soin", "ODF", "Chirurgie", "Proteges"];
const timeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

export default function Planning() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  // const [currentPlan, setCurrentPlan] = useState<TimeSlot[]>([]);
  const [timeSlotData] = useState<TimeSlot[]>([]);
  const [isOnline, setIsOnline] = useState(false); // Initialize to false to match SSR
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const { syncWithVercel } = useBookingSync();

  const loadPlanningData = useCallback(async () => {
    // TODO: Replace with actual API call
    // For now, using mock data filtered by date
    const filteredSlots = mockTimeSlots.filter((slot) => {
      const slotDate = new Date(slot.date);
      return (
        slotDate.getFullYear() === currentDate.getFullYear() &&
        slotDate.getMonth() === currentDate.getMonth() &&
        slotDate.getDate() === currentDate.getDate()
      );
    });
    // setCurrentPlan(filteredSlots); // Commented out - variable not used
  }, [currentDate]);

  useEffect(() => {
    loadPlanningData();

    // Set initial online state after component mounts to avoid hydration mismatch
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadPlanningData]);

  const syncWithVercelBooking = async () => {
    if (!isOnline) return;

    setIsSyncing(true);
    try {
      const result = await syncWithVercel();
      if (result.success) {
        setLastSyncTime(new Date());
        // Reload planning data to show synced reservations
        await loadPlanningData();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === "next" ? 1 : -1));
    setCurrentDate(newDate);
  };

  const getSpecialtyColor = (specialty: string) => {
    switch (specialty) {
      case "Soin":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "ODF":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Chirurgie":
        return "bg-red-100 text-red-700 border-red-200";
      case "Proteges":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-gray-50 border-gray-200";
      case "booked":
        return "bg-blue-50 border-blue-200";
      case "completed":
        return "bg-green-50 border-green-200";
      case "missed":
        return "bg-red-50 border-red-200";
      case "cancelled":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getSyncIcon = (syncStatus?: string) => {
    switch (syncStatus) {
      case "synced":
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case "pending":
        return <RefreshCw className='h-4 w-4 text-yellow-500 animate-spin' />;
      case "error":
        return <AlertCircle className='h-4 w-4 text-red-500' />;
      default:
        return null;
    }
  };

  const filteredSlots =
    selectedSpecialty === "all"
      ? timeSlotData
      : timeSlotData.filter((slot) => slot.specialty === selectedSpecialty);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Planning Partagé</h1>
          <p className='text-gray-600'>
            Synchronisation avec le portail de réservation Vercel
          </p>
        </div>

        {/* Sync Status */}
        <div className='flex items-center space-x-4'>
          <div
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              isOnline
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isOnline ? (
              <Wifi className='h-4 w-4' />
            ) : (
              <WifiOff className='h-4 w-4' />
            )}
            <span className='text-sm font-medium'>
              {isOnline ? "En ligne" : "Hors ligne"}
            </span>
          </div>

          {isOnline && (
            <button
              onClick={syncWithVercelBooking}
              disabled={isSyncing}
              className='flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50'
            >
              <RefreshCw
                className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span>{isSyncing ? "Synchronisation..." : "Sync Vercel"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Navigation */}
      <div className='bg-white p-4 rounded-lg shadow-sm border'>
        <div className='flex items-center justify-between'>
          <button
            onClick={() => navigateDate("prev")}
            className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
          >
            <ChevronLeft className='h-5 w-5' />
          </button>

          <div className='text-center'>
            <h2 className='text-lg font-semibold text-gray-900'>
              {formatDate(currentDate)}
            </h2>
            {lastSyncTime && (
              <p className='text-sm text-gray-500'>
                Dernière sync: {lastSyncTime.toLocaleTimeString("fr-FR")}
              </p>
            )}
          </div>

          <button
            onClick={() => navigateDate("next")}
            className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
          >
            <ChevronRight className='h-5 w-5' />
          </button>
        </div>

        {/* Specialty Filter */}
        <div className='flex justify-center mt-4'>
          <div className='flex space-x-2'>
            <button
              onClick={() => setSelectedSpecialty("all")}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedSpecialty === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Toutes
            </button>
            {specialties.map((specialty) => (
              <button
                key={specialty}
                onClick={() => setSelectedSpecialty(specialty)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedSpecialty === specialty
                    ? getSpecialtyColor(specialty)
                        .replace("bg-", "bg-")
                        .replace("100", "500")
                        .replace("text-", "text-white")
                    : getSpecialtyColor(specialty)
                }`}
              >
                {specialty}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Planning Grid */}
      <div className='bg-white rounded-lg shadow-sm border overflow-hidden'>
        <div className='p-4 border-b'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-semibold text-gray-900'>
              Créneaux de la journée
            </h3>
            <button className='flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'>
              <Plus className='h-4 w-4' />
              <span>Nouveau créneau</span>
            </button>
          </div>
        </div>

        <div className='divide-y divide-gray-200'>
          {timeSlots.map((time) => {
            const slotsAtTime = filteredSlots.filter(
              (slot) => slot.startTime === time,
            );

            return (
              <div key={time} className='p-4'>
                <div className='flex items-start space-x-4'>
                  <div className='w-16 text-sm font-medium text-gray-600'>
                    {time}
                  </div>

                  <div className='flex-1'>
                    {slotsAtTime.length === 0 ? (
                      <div className='text-gray-400 text-sm italic'>
                        Aucun créneau programmé
                      </div>
                    ) : (
                      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                        {slotsAtTime.map((slot) => (
                          <div
                            key={slot.id}
                            className={`p-3 rounded-lg border-2 ${getStatusColor(slot.status)}`}
                          >
                            <div className='flex items-start justify-between mb-2'>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded ${getSpecialtyColor(slot.specialty)}`}
                              >
                                {slot.specialty}
                              </span>

                              <div className='flex items-center space-x-1'>
                                {slot.isFromBookingPortal && (
                                  <span className='text-xs bg-orange-100 text-orange-700 px-1 py-0.5 rounded'>
                                    Vercel
                                  </span>
                                )}
                                {getSyncIcon(slot.syncStatus)}
                              </div>
                            </div>

                            {slot.doctorName && (
                              <div className='text-sm font-medium text-gray-900 mb-1'>
                                {slot.doctorName}
                              </div>
                            )}

                            {slot.patientName ? (
                              <div className='space-y-1'>
                                <div className='flex items-center space-x-1 text-sm text-gray-700'>
                                  <User className='h-3 w-3' />
                                  <span>{slot.patientName}</span>
                                </div>
                                {slot.patientPhone && (
                                  <div className='flex items-center space-x-1 text-sm text-gray-600'>
                                    <Phone className='h-3 w-3' />
                                    <span>{slot.patientPhone}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className='text-sm text-gray-500'>
                                Créneau disponible
                              </div>
                            )}

                            <div className='flex items-center justify-between mt-2 pt-2 border-t border-gray-200'>
                              <div className='flex items-center space-x-1 text-xs text-gray-500'>
                                <Clock className='h-3 w-3' />
                                <span>
                                  {slot.startTime} - {slot.endTime}
                                </span>
                              </div>

                              {slot.status === "booked" && (
                                <button className='text-xs text-blue-600 hover:text-blue-800'>
                                  Modifier
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync Status Legend */}
      <div className='bg-gray-50 p-4 rounded-lg'>
        <h4 className='text-sm font-medium text-gray-900 mb-2'>
          État de synchronisation
        </h4>
        <div className='flex items-center space-x-6 text-sm'>
          <div className='flex items-center space-x-1'>
            <CheckCircle className='h-4 w-4 text-green-500' />
            <span className='text-gray-600'>Synchronisé</span>
          </div>
          <div className='flex items-center space-x-1'>
            <RefreshCw className='h-4 w-4 text-yellow-500' />
            <span className='text-gray-600'>En cours</span>
          </div>
          <div className='flex items-center space-x-1'>
            <AlertCircle className='h-4 w-4 text-red-500' />
            <span className='text-gray-600'>Erreur</span>
          </div>
          <div className='flex items-center space-x-1'>
            <span className='text-xs bg-orange-100 text-orange-700 px-1 py-0.5 rounded'>
              Vercel
            </span>
            <span className='text-gray-600'>
              Depuis le portail de réservation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
