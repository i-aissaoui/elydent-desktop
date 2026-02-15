// Booking API configuration - point to local port or production
const BOOKING_API_URL =
  process.env.NEXT_PUBLIC_BOOKING_API_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3001/api"
    : "https://dentit-booking.vercel.app/api");

export interface OnlineReservation {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:mm format
  specialty: string;
  visitType: string;
  notes?: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
  updatedAt?: Date;
}

export interface TodaySchedule {
  date: string;
  totalReservations: number;
  bySpecialty: {
    Soin: number;
    ODF: number;
    Chirurgie: number;
    Proteges: number;
  };
  reservations: OnlineReservation[];
}

export interface SyncResult {
  success: boolean;
  newReservations: number;
  todaySchedule: TodaySchedule;
  errors: string[];
  lastSyncTime: Date;
}

class BookingSync {
  private isOnline: boolean =
    typeof window !== "undefined" ? navigator.onLine : true;
  private lastSyncTime: Date | null = null;

  constructor() {
    // Listen for online/offline events
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline.bind(this));
      window.addEventListener("offline", this.handleOffline.bind(this));
    }
  }

  private handleOnline() {
    console.log("🟢 Booking sync: Online mode activated");
    this.isOnline = true;
  }

  private handleOffline() {
    console.log("🔴 Booking sync: Offline mode activated");
    this.isOnline = false;
  }

  /**
   * Manual sync with Vercel booking app - fetches online reservations
   */
  async syncWithVercel(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      newReservations: 0,
      todaySchedule: {
        date: new Date().toISOString().split("T")[0],
        totalReservations: 0,
        bySpecialty: { Soin: 0, ODF: 0, Chirurgie: 0, Proteges: 0 },
        reservations: [],
      },
      errors: [],
      lastSyncTime: new Date(),
    };

    if (!this.isOnline) {
      result.errors.push("No internet connection available");
      return result;
    }

    try {
      console.log("🔄 Syncing with Vercel booking app...");

      // Fetch new reservations from Vercel
      const newReservations = await this.fetchNewReservations();

      // Get today's schedule from Vercel
      const todaySchedule = await this.fetchTodaySchedule();

      // Save new reservations locally
      for (const reservation of newReservations) {
        await this.saveReservationLocally(reservation);
      }

      result.success = true;
      result.newReservations = newReservations.length;
      result.todaySchedule = todaySchedule;
      this.lastSyncTime = new Date();

      console.log("✅ Sync completed successfully");
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Sync failed: ${errorMsg}`);
      console.error("❌ Sync error:", error);
      return result;
    }
  }

  /**
   * Fetch new reservations from the booking portal
   */
  private async fetchNewReservations(): Promise<OnlineReservation[]> {
    const response = await fetch(`${BOOKING_API_URL}/reservations/new`);
    if (!response.ok) {
      throw new Error(`Failed to fetch reservations: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Fetch today's schedule from the booking portal
   */
  private async fetchTodaySchedule(): Promise<TodaySchedule> {
    const response = await fetch(`${BOOKING_API_URL}/schedule/today`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch today's schedule: ${response.statusText}`,
      );
    }
    return response.json();
  }

  /**
   * Save reservation to local database
   */
  private async saveReservationLocally(
    reservation: OnlineReservation,
  ): Promise<void> {
    // This would sync with the local database via API
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reservation),
    });

    if (!response.ok) {
      throw new Error("Failed to save reservation locally");
    }
  }

  /**
   * Get sync status
   */
  isOnlineMode(): boolean {
    return this.isOnline;
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }
}

// Create singleton instance
let bookingSync: BookingSync | null = null;

/**
 * Hook to use booking sync functionality
 */
export function useBookingSync() {
  if (!bookingSync) {
    bookingSync = new BookingSync();
  }

  return {
    syncWithVercel: bookingSync.syncWithVercel.bind(bookingSync),
    isOnline: bookingSync.isOnlineMode(),
    lastSyncTime: bookingSync.getLastSyncTime(),
  };
}
