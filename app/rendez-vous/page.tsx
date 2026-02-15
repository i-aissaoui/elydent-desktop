"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Edit2,
  Phone,
  Calendar,
  AlertCircle,
  Loader,
  Search,
  RefreshCw,
  Link as LinkIcon,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DatePicker from "@/app/components/DatePicker";

interface Reservation {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  specialty: string;
  date: string;
  status: string;
  createdAt: string;
  existingClient?: boolean;
  duplicatePhone?: boolean;
}

const SPECIALTY_COLORS: Record<string, string> = {
  Soin: "#FF6B6B",
  ODF: "#4ECDC4",
  Chirurgie: "#95E1D3",
  Proteges: "#FFE66D",
};

const specialtyLabels: Record<string, { fr: string; ar: string }> = {
  Soin: { fr: "Soins Généraux", ar: "صحة الأسنان العامة" },
  ODF: { fr: "Orthodontie", ar: "تقويم الأسنان" },
  Chirurgie: { fr: "Chirurgie Dentaire", ar: "جراحة الأسنان" },
  Proteges: { fr: "Prothèses", ar: "الأطراف الصناعية" },
};

export default function RendezVousPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Reservation>>({});
  const [originalEditDate, setOriginalEditDate] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState("http://localhost:3001");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING">("ALL");
  const [specialtyFilter, setSpecialtyFilter] = useState<
    "ALL" | "Soin" | "ODF" | "Chirurgie" | "Proteges"
  >("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncSeconds, setAutoSyncSeconds] = useState<number>(60);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    const configured =
      localStorage.getItem("booking-portal-url") || "http://localhost:3001";
    setPortalUrl(configured);
  }, []);

  useEffect(() => {
    const savedEnabled = localStorage.getItem("rdv-auto-sync-enabled");
    const savedSeconds = localStorage.getItem("rdv-auto-sync-seconds");
    if (savedEnabled) setAutoSyncEnabled(savedEnabled === "true");
    if (savedSeconds) {
      const parsed = Number(savedSeconds);
      if ([30, 60, 120, 300].includes(parsed)) setAutoSyncSeconds(parsed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("rdv-auto-sync-enabled", String(autoSyncEnabled));
  }, [autoSyncEnabled]);

  useEffect(() => {
    localStorage.setItem("rdv-auto-sync-seconds", String(autoSyncSeconds));
  }, [autoSyncSeconds]);

  const toDateInputValue = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value).split("T")[0] || "";
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const runSync = async (silent = false) => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);
      if (!silent) setError(null);

      const health = await fetch(
        `/api/sync?portal_url=${encodeURIComponent(portalUrl)}`,
        { cache: "no-store" },
      );
      const healthPayload = await health.json().catch(() => ({}));

      if (!health.ok || healthPayload?.status !== "connected") {
        if (!silent) {
          setError("Portail non accessible pour synchronisation");
        }
        return;
      }

      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-booking-portal-url": portalUrl,
        },
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result?.success) {
        setLastSyncAt(new Date().toLocaleTimeString("fr-FR"));
        if (!silent) {
          setSuccessMessage(
            `Synchronisation terminée (${result?.total || 0} réservation(s))`,
          );
          setTimeout(() => setSuccessMessage(null), 3000);
        }
        await fetchReservations();
      } else if (!silent) {
        setError(result?.error || "Échec de synchronisation");
      }
    } catch {
      if (!silent) setError("Erreur réseau pendant la synchronisation");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!autoSyncEnabled) return;
    const interval = setInterval(() => {
      runSync(true);
    }, autoSyncSeconds * 1000);
    return () => clearInterval(interval);
  }, [autoSyncEnabled, autoSyncSeconds, portalUrl]);

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/reservations", {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      } else {
        setError("Impossible de charger les réservations");
      }
    } catch (err) {
      setError("Erreur de connexion");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/reservations/${id}/approve`, {
        method: "POST",
        headers: {
          "x-booking-portal-url": portalUrl,
        },
      });
      if (response.ok) {
        setSuccessMessage("Rendez-vous approuvé avec succès!");
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchReservations();
      }
    } catch (err) {
      setError("Erreur lors de l'approbation");
      console.error(err);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir rejeter cette réservation?")) return;
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
        headers: {
          "x-booking-portal-url": portalUrl,
        },
      });
      if (response.ok) {
        setSuccessMessage("Réservation rejetée");
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchReservations();
      }
    } catch (err) {
      setError("Erreur lors du rejet");
      console.error(err);
    }
  };

  const startEdit = (res: Reservation) => {
    const currentDate = toDateInputValue(res.date);
    setEditingId(res.id);
    setOriginalEditDate(currentDate);
    setEditForm({
      firstName: res.firstName,
      lastName: res.lastName,
      phone: res.phone,
      specialty: res.specialty,
      date: currentDate,
      email: res.email,
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-booking-portal-url": portalUrl,
        },
        body: JSON.stringify(editForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setEditingId(null);
        setSuccessMessage("Réservation modifiée avec succès!");
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchReservations();
      } else {
        setError(payload?.error || "Erreur lors de la modification");
      }
    } catch (err) {
      setError("Erreur lors de la modification");
      console.error(err);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();

  const filteredReservations = reservations
    .filter((res) => {
      if (statusFilter !== "ALL" && res.status !== statusFilter) return false;
      if (specialtyFilter !== "ALL" && res.specialty !== specialtyFilter)
        return false;
      if (!normalizedQuery) return true;

      const fullName = `${res.firstName} ${res.lastName}`.toLowerCase();
      const phone = String(res.phone || "").toLowerCase();
      return (
        fullName.includes(normalizedQuery) || phone.includes(normalizedQuery)
      );
    })
    .sort((a, b) => {
      const at = new Date(a.date).getTime();
      const bt = new Date(b.date).getTime();
      return sortOrder === "asc" ? at - bt : bt - at;
    });

  const groupedBySpecialty = filteredReservations.reduce(
    (acc, res) => {
      if (!acc[res.specialty]) {
        acc[res.specialty] = [];
      }
      acc[res.specialty].push(res);
      return acc;
    },
    {} as Record<string, Reservation[]>,
  );

  const pendingCount = reservations.filter(
    (r) => r.status === "PENDING",
  ).length;
  const visiblePendingCount = filteredReservations.filter(
    (r) => r.status === "PENDING",
  ).length;
  const existingPhoneCount = filteredReservations.filter(
    (r) => r.existingClient || r.duplicatePhone,
  ).length;

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100'>
        <div className='text-center'>
          <Loader
            className='animate-spin text-[#9B2C3E] mx-auto mb-4'
            size={48}
          />
          <p className='text-gray-700 font-bold text-lg'>
            Chargement des réservations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8 sm:mb-12'>
          <h1 className='text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-3 sm:mb-4'>
            📅 Rendez-vous en Attente
          </h1>
          <p className='text-base sm:text-lg lg:text-xl text-gray-600 font-semibold'>
            Confirmez ou rejetez les demandes groupées par spécialité
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className='mb-8 bg-green-100 border border-green-400 rounded-lg p-4 flex items-center gap-3'>
            <CheckCircle className='text-green-600' size={24} />
            <p className='text-green-800 font-semibold'>{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className='mb-8 bg-red-100 border border-red-400 rounded-lg p-4 flex items-center gap-3'>
            <AlertCircle className='text-red-600' size={24} />
            <p className='text-red-800 font-semibold'>{error}</p>
          </div>
        )}

        {existingPhoneCount > 0 && (
          <div className='mb-8 bg-amber-100 border border-amber-400 rounded-lg p-4 flex items-center gap-3'>
            <AlertCircle className='text-amber-700' size={22} />
            <p className='text-amber-900 font-semibold'>
              {existingPhoneCount} réservation(s) utilisent un numéro déjà
              présent dans votre base patient.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          <div className='bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500'>
            <p className='text-sm text-gray-600 font-bold'>EN ATTENTE</p>
            <p className='text-4xl font-black text-yellow-600'>
              {pendingCount}
            </p>
          </div>
          <div className='bg-white rounded-lg shadow p-6 border-l-4 border-green-500'>
            <p className='text-sm text-gray-600 font-bold'>EN FILE</p>
            <p className='text-4xl font-black text-green-600'>{pendingCount}</p>
          </div>
          <div className='bg-white rounded-lg shadow p-6 border-l-4 border-blue-500'>
            <p className='text-sm text-gray-600 font-bold'>TOTAL</p>
            <p className='text-4xl font-black text-blue-600'>
              {reservations.length}
            </p>
          </div>
          <div className='bg-white rounded-lg shadow p-6 border-l-4 border-purple-500'>
            <p className='text-sm text-gray-600 font-bold'>AFFICHÉS</p>
            <p className='text-4xl font-black text-purple-600'>
              {filteredReservations.length}
            </p>
          </div>
        </div>

        <div className='bg-white rounded-2xl shadow p-4 sm:p-6 mb-8'>
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-3'>
            <div className='lg:col-span-4'>
              <label className='text-xs font-bold text-gray-600 mb-1 block'>
                Recherche
              </label>
              <div className='relative'>
                <Search
                  className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'
                  size={18}
                />
                <input
                  type='text'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='Nom ou téléphone'
                  className='w-full pl-10 pr-3 py-2.5 border rounded-lg font-semibold'
                />
              </div>
            </div>

            <div className='lg:col-span-2'>
              <label className='text-xs font-bold text-gray-600 mb-1 block'>
                Statut
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "ALL" | "PENDING")
                }
                className='w-full py-2.5 px-3 border rounded-lg font-semibold'
              >
                <option value='ALL'>Tous</option>
                <option value='PENDING'>En attente</option>
              </select>
            </div>

            <div className='lg:col-span-2'>
              <label className='text-xs font-bold text-gray-600 mb-1 block'>
                Spécialité
              </label>
              <select
                value={specialtyFilter}
                onChange={(e) =>
                  setSpecialtyFilter(
                    e.target.value as
                      | "ALL"
                      | "Soin"
                      | "ODF"
                      | "Chirurgie"
                      | "Proteges",
                  )
                }
                className='w-full py-2.5 px-3 border rounded-lg font-semibold'
              >
                <option value='ALL'>Toutes</option>
                <option value='Soin'>Soins Généraux</option>
                <option value='ODF'>Orthodontie</option>
                <option value='Chirurgie'>Chirurgie Dentaire</option>
                <option value='Proteges'>Prothèses</option>
              </select>
            </div>

            <div className='lg:col-span-2'>
              <label className='text-xs font-bold text-gray-600 mb-1 block'>
                Tri date
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className='w-full py-2.5 px-3 border rounded-lg font-semibold'
              >
                <option value='asc'>Plus proche</option>
                <option value='desc'>Plus lointaine</option>
              </select>
            </div>

            <div className='lg:col-span-2 flex items-end'>
              <button
                onClick={fetchReservations}
                className='w-full py-2.5 px-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 transition flex items-center justify-center gap-2'
              >
                <RefreshCw size={16} />
                Actualiser
              </button>
            </div>
          </div>

          <div className='mt-4 p-3 border rounded-lg bg-gray-50 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between'>
            <div className='flex items-center gap-2 text-sm font-semibold text-gray-700'>
              <LinkIcon size={16} className='text-[#9B2C3E]' />
              <span>Synchronisation portail</span>
              {lastSyncAt && (
                <span className='text-xs text-gray-500'>
                  (Dernier sync: {lastSyncAt})
                </span>
              )}
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <label className='inline-flex items-center gap-2 text-sm font-semibold text-gray-700'>
                <input
                  type='checkbox'
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                />
                Auto-sync
              </label>

              <select
                value={autoSyncSeconds}
                onChange={(e) => setAutoSyncSeconds(Number(e.target.value))}
                className='px-2 py-1 border rounded text-sm font-semibold'
                disabled={!autoSyncEnabled}
              >
                <option value={30}>30s</option>
                <option value={60}>60s</option>
                <option value={120}>2min</option>
                <option value={300}>5min</option>
              </select>

              <button
                onClick={() => runSync(false)}
                disabled={isSyncing}
                className='px-3 py-1.5 bg-[#9B2C3E] text-white rounded font-bold text-sm disabled:opacity-50'
              >
                {isSyncing ? "Sync..." : "Synchroniser"}
              </button>
            </div>
          </div>

          <div className='mt-3 text-xs sm:text-sm font-semibold text-gray-600'>
            Affichage: {visiblePendingCount} en attente
          </div>
        </div>

        {/* Specialty Sections */}
        {Object.keys(groupedBySpecialty).length === 0 ? (
          <div className='bg-white rounded-lg shadow p-8 sm:p-12 text-center'>
            <CheckCircle className='mx-auto text-green-500 mb-4' size={48} />
            <p className='text-gray-600 text-lg font-bold'>
              Aucune réservation en attente
            </p>
          </div>
        ) : (
          <div className='space-y-12'>
            {["Soin", "ODF", "Chirurgie", "Proteges"].map((specialty) => {
              const resList = groupedBySpecialty[specialty] || [];
              if (resList.length === 0) return null;

              return (
                <div key={specialty}>
                  {/* Specialty Header */}
                  <div
                    className='p-6 rounded-lg mb-6 text-white'
                    style={{ backgroundColor: SPECIALTY_COLORS[specialty] }}
                  >
                    <h2 className='text-3xl font-black mb-2'>
                      {specialtyLabels[specialty]?.fr || specialty}
                    </h2>
                    <p className='text-sm opacity-90'>
                      {specialtyLabels[specialty]?.ar}
                    </p>
                    <p className='text-sm opacity-75 mt-2'>
                      {resList.length} réservation(s) en attente
                    </p>
                  </div>

                  {/* Reservations List */}
                  <div className='grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8'>
                    {resList.map((res) => (
                      <div
                        key={res.id}
                        className='bg-white rounded-lg shadow-md border-l-4 p-6 hover:shadow-lg transition-all'
                        style={{ borderLeftColor: SPECIALTY_COLORS[specialty] }}
                      >
                        {editingId === res.id ? (
                          // Edit Mode
                          <div className='space-y-4'>
                            <h3 className='text-xl font-bold text-gray-900'>
                              Modifier réservation
                            </h3>
                            <div className='bg-blue-50 border border-blue-200 rounded-lg px-4 py-3'>
                              <p className='text-sm font-bold text-blue-900'>
                                Date actuelle du rendez-vous:{" "}
                                {originalEditDate
                                  ? format(
                                      new Date(`${originalEditDate}T09:00:00`),
                                      "EEEE d MMMM yyyy",
                                      {
                                        locale: fr,
                                      },
                                    )
                                  : "-"}
                              </p>
                              <p className='text-xs text-blue-700 mt-1'>
                                La date ci-dessus est conservée automatiquement
                                dans le sélecteur. Modifiez-la seulement si
                                nécessaire.
                              </p>
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                              <input
                                type='text'
                                value={editForm.firstName || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    firstName: e.target.value,
                                  })
                                }
                                placeholder='Prénom'
                                className='px-4 py-2 border rounded-lg font-semibold'
                              />
                              <input
                                type='text'
                                value={editForm.lastName || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    lastName: e.target.value,
                                  })
                                }
                                placeholder='Nom'
                                className='px-4 py-2 border rounded-lg font-semibold'
                              />
                              <input
                                type='tel'
                                value={editForm.phone || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    phone: (() => {
                                      const digits = e.target.value.replace(
                                        /\D/g,
                                        "",
                                      );
                                      if (digits.startsWith("213")) {
                                        return `0${digits.slice(3)}`.slice(
                                          0,
                                          10,
                                        );
                                      }
                                      if (digits.startsWith("0")) {
                                        return digits.slice(0, 10);
                                      }
                                      return digits.length
                                        ? `0${digits}`.slice(0, 10)
                                        : "";
                                    })(),
                                  })
                                }
                                placeholder='0660707796'
                                className='px-4 py-2 border rounded-lg font-semibold'
                              />
                              <input
                                type='email'
                                value={editForm.email || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    email: e.target.value.trim(),
                                  })
                                }
                                placeholder='email@exemple.com'
                                className='px-4 py-2 border rounded-lg font-semibold'
                              />
                              <div className='md:col-span-2 space-y-2'>
                                <p className='text-sm font-bold text-gray-700'>
                                  Nouvelle date du rendez-vous
                                </p>
                                <DatePicker
                                  selectedDate={
                                    toDateInputValue(editForm.date) ||
                                    originalEditDate ||
                                    new Date().toISOString().split("T")[0]
                                  }
                                  onChange={(date) =>
                                    setEditForm({
                                      ...editForm,
                                      date,
                                    })
                                  }
                                />
                                <button
                                  type='button'
                                  onClick={() =>
                                    setEditForm({
                                      ...editForm,
                                      date: originalEditDate,
                                    })
                                  }
                                  className='px-4 py-2 border border-blue-300 text-blue-700 rounded-lg font-bold hover:bg-blue-50 transition'
                                >
                                  Garder la date actuelle
                                </button>
                              </div>
                              <select
                                value={editForm.specialty || "Soin"}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    specialty: e.target.value,
                                  })
                                }
                                className='px-4 py-2 border rounded-lg font-semibold'
                              >
                                <option value='Soin'>Soins Généraux</option>
                                <option value='ODF'>Orthodontie</option>
                                <option value='Chirurgie'>
                                  Chirurgie Dentaire
                                </option>
                                <option value='Proteges'>Prothèses</option>
                              </select>
                            </div>
                            <div className='flex gap-2'>
                              <button
                                onClick={() => handleSaveEdit(res.id)}
                                className='flex-1 py-2 px-4 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition'
                              >
                                ✓ Enregistrer
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className='flex-1 py-2 px-4 bg-gray-400 text-white font-bold rounded-lg hover:bg-gray-500 transition'
                              >
                                ✕ Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <>
                            <div className='flex justify-between items-start mb-4'>
                              <div>
                                <h3 className='text-2xl font-black text-gray-900'>
                                  {res.firstName} {res.lastName}
                                </h3>
                                <div className='mt-2'>
                                  <span
                                    className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                                      res.existingClient
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {res.existingClient
                                      ? "Client existant"
                                      : "Nouveau client"}
                                  </span>
                                </div>
                                {res.duplicatePhone && (
                                  <p className='mt-2 text-xs font-bold text-red-700 bg-red-100 inline-flex px-2 py-1 rounded'>
                                    ⚠ Numéro déjà utilisé dans d'autres
                                    réservations
                                  </p>
                                )}
                                <div className='flex items-center gap-2 mt-2 text-gray-600'>
                                  <Phone size={18} />
                                  <span className='font-bold text-lg'>
                                    {res.phone}
                                  </span>
                                </div>
                                {res.email && (
                                  <p className='text-sm text-gray-500 font-semibold mt-1'>
                                    {res.email}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`px-4 py-2 rounded-full font-bold text-sm ${
                                  res.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : res.status === "APPROVED"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {res.status === "PENDING"
                                  ? "⏳ En attente"
                                  : res.status === "APPROVED"
                                    ? "✓ Approuvé"
                                    : res.status}
                              </span>
                            </div>

                            <div className='bg-gray-50 rounded-lg p-4 mb-4'>
                              <div className='flex items-center gap-2 text-gray-700 font-bold text-sm sm:text-base'>
                                <Calendar size={20} />
                                {format(
                                  new Date(res.date),
                                  "EEEE d MMMM yyyy",
                                  {
                                    locale: fr,
                                  },
                                )}
                              </div>
                              <p className='text-xs text-gray-500 mt-2 font-semibold'>
                                Demandé le:{" "}
                                {format(
                                  new Date(res.createdAt),
                                  "d MMMM yyyy à HH:mm",
                                  {
                                    locale: fr,
                                  },
                                )}
                              </p>
                            </div>

                            {res.status === "PENDING" && (
                              <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
                                <button
                                  onClick={() => handleApprove(res.id)}
                                  className='py-2 px-4 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2'
                                >
                                  <CheckCircle size={18} />
                                  Approuver
                                </button>
                                <button
                                  onClick={() => startEdit(res)}
                                  className='py-2 px-4 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2'
                                >
                                  <Edit2 size={18} />
                                  Modifier
                                </button>
                                <button
                                  onClick={() => handleReject(res.id)}
                                  className='py-2 px-4 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2'
                                >
                                  <XCircle size={18} />
                                  Rejeter
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
