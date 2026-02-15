"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface SyncPanelProps {
  pendingCount?: number;
  onSyncComplete?: () => void;
}

export default function SyncPanel({
  pendingCount = 0,
  onSyncComplete,
}: SyncPanelProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [portalUrl, setPortalUrl] = useState("http://localhost:3001");

  useEffect(() => {
    const configuredUrl =
      localStorage.getItem("booking-portal-url") || "http://localhost:3001";
    setPortalUrl(configuredUrl);
  }, []);

  useEffect(() => {
    // Check connection status
    const checkConnection = async () => {
      try {
        const response = await fetch(
          `/api/sync?portal_url=${encodeURIComponent(portalUrl)}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        setIsOnline(response.ok && data.status === "connected");
      } catch {
        setIsOnline(false);
      }
    };

    if (!portalUrl) return;

    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [portalUrl]);

  const handleManualSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncStatus("Synchronisation en cours...");

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-booking-portal-url": portalUrl,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSyncStatus(`✓ Sync complété: ${result.total || 0} réservations`);
        setLastSyncTime(new Date().toLocaleTimeString("fr-FR"));
        setIsOnline(true);
        onSyncComplete?.();
      } else {
        setSyncStatus(
          `✗ Erreur: ${result.error || "Échec de synchronisation"}`,
        );
      }

      // Clear status after 5 seconds
      setTimeout(() => setSyncStatus(""), 5000);
    } catch {
      setSyncStatus("Erreur de synchronisation");
      setTimeout(() => setSyncStatus(""), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className='bg-white rounded-2xl shadow-lg p-6 border border-gray-100'>
      <div className='flex items-start justify-between'>
        {/* Status Info */}
        <div className='flex-1'>
          <h3 className='text-lg font-black text-gray-900 mb-4'>
            🔄 État de Synchronisation
          </h3>

          {/* Connection Status */}
          <div
            className={`flex items-center gap-3 p-3 rounded-lg mb-4 ${
              isOnline
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {isOnline ? (
              <Wifi className='text-green-600 shrink-0' size={20} />
            ) : (
              <WifiOff className='text-red-600 shrink-0' size={20} />
            )}
            <div>
              <p className='font-bold text-sm'>
                {isOnline ? "Connecté" : "Hors ligne"}
              </p>
              <p className='text-xs text-gray-600'>
                {isOnline
                  ? "Application de réservation en ligne accessible"
                  : "Impossible de contacter l'application de réservation"}
              </p>
            </div>
          </div>

          {/* Pending Count */}
          {pendingCount > 0 && (
            <div className='flex items-center gap-3 p-3 rounded-lg mb-4 bg-yellow-50 border border-yellow-200'>
              <AlertCircle className='text-yellow-600 shrink-0' size={20} />
              <div>
                <p className='font-bold text-sm'>
                  {pendingCount} réservation(s) en attente
                </p>
                <p className='text-xs text-gray-600'>
                  Cliquez sur &quot;Synchroniser&quot; pour les envoyer
                </p>
              </div>
            </div>
          )}

          {/* Last Sync Time */}
          {lastSyncTime && (
            <div className='flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200'>
              <CheckCircle className='text-green-600 shrink-0' size={20} />
              <div>
                <p className='font-bold text-sm'>Dernier sync</p>
                <p className='text-xs text-gray-600'>à {lastSyncTime}</p>
              </div>
            </div>
          )}

          {/* Sync Status Message */}
          {syncStatus && (
            <div className='mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
              <p className='text-sm font-semibold text-blue-900'>
                {syncStatus}
              </p>
            </div>
          )}
        </div>

        {/* Sync Button */}
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className={`ml-4 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            !isSyncing
              ? "bg-[#9B2C3E] text-white hover:bg-[#7A1F2E] shadow-lg"
              : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
        >
          <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Sync..." : "Synchroniser"}
        </button>
      </div>

      {/* Help Text */}
      <div className='mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200'>
        <p className='text-xs text-gray-700 font-semibold'>
          💡 <strong>Conseil:</strong> Synchronisez régulièrement pour envoyer
          les réservations en attente et recevoir les dernières mises à jour des
          tarifs. La synchronisation manuelle évite les erreurs réseau.
        </p>
        <p className='text-xs text-gray-600 mt-2 font-medium'>
          URL portail active: <span className='font-mono'>{portalUrl}</span>
        </p>
      </div>
    </div>
  );
}
