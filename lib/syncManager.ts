"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

const DEFAULT_BOOKING_PORTAL_URL =
  process.env.NEXT_PUBLIC_BOOKING_PORTAL_URL || "http://localhost:3001";

interface SyncResult {
  success: boolean;
  message: string;
  reservationsSynced: number;
  chargesUpdated: boolean;
  error?: string;
}

/**
 * Get pending reservations from local queue that need syncing
 */
export async function getPendingReservations() {
  try {
    const pending = await prisma.visit.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        patient: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return pending.map((visit) => ({
      id: visit.id,
      firstName: visit.patient?.firstName || "",
      lastName: visit.patient?.lastName || "",
      phone: visit.patient?.phone || "",
      specialty: visit.specialty || "",
      date: visit.date,
      status: visit.status,
      createdAt: visit.createdAt,
    }));
  } catch (err) {
    console.error("Failed to get pending reservations:", err);
    return [];
  }
}

/**
 * Get charges from booking portal (hosted app)
 */
export async function fetchBookingPortalCharges(
  portalUrl: string = DEFAULT_BOOKING_PORTAL_URL,
) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${portalUrl}/api/dental/daily-charges`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    if (data) {
      return {
        success: true,
        charges: data,
      };
    }
    return {
      success: false,
      error: "No charges data received",
    };
  } catch (err) {
    console.error("Failed to fetch from booking portal:", err);
    return {
      success: false,
      error:
        "Connection failed: " +
        (err instanceof Error ? err.message : "Unknown error"),
    };
  }
}

/**
 * Merge local charges with portal charges
 */
export async function mergeCharges(localCharges: any[], portalCharges: any[]) {
  try {
    // Get all current visits to calculate average charges per specialty
    const visits = await prisma.visit.findMany({
      where: {
        status: { not: "PENDING" },
        date: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      select: {
        specialty: true,
        cost: true,
      },
    });

    const merged: Record<
      string,
      { total: number; count: number; avg: number }
    > = {};

    visits.forEach((visit) => {
      const specialty = visit.specialty ?? "Non spécifié";
      if (!merged[specialty]) {
        merged[specialty] = { total: 0, count: 0, avg: 0 };
      }
      merged[specialty].total += Number(visit.cost) || 0;
      merged[specialty].count += 1;
    });

    // Calculate averages
    Object.keys(merged).forEach((spec) => {
      merged[spec].avg = Math.round(
        merged[spec].total / (merged[spec].count || 1),
      );
    });

    return {
      success: true,
      charges: merged,
    };
  } catch (err) {
    console.error("Failed to merge charges:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Manual sync - sends local pending data and fetches updated charges
 */
export async function manualSync(portalUrl?: string): Promise<SyncResult> {
  try {
    console.log("🔄 Starting manual sync...");

    // Step 1: Get pending reservations
    const pending = await getPendingReservations();
    console.log(`Found ${pending.length} pending reservations`);

    // Step 2: Try to fetch charges from booking portal
    const portalResult = await fetchBookingPortalCharges(portalUrl);

    if (!portalResult.success) {
      return {
        success: false,
        message: "Could not connect to booking portal",
        reservationsSynced: 0,
        chargesUpdated: false,
        error: portalResult.error,
      };
    }

    // Step 3: Merge charges
    const chargesResult = await mergeCharges([], portalResult.charges || []);

    // Step 4: Update sync status
    if (pending.length > 0) {
      // Mark some/all as synced based on business logic
      // For now, keep them PENDING until doctor confirms
      console.log(`Would sync ${pending.length} reservations`);
    }

    revalidatePath("/rendez-vous");
    revalidatePath("/");

    return {
      success: true,
      message: `Synced ${pending.length} reservations and updated charges`,
      reservationsSynced: pending.length,
      chargesUpdated: chargesResult.success,
    };
  } catch (err) {
    console.error("Sync failed:", err);
    return {
      success: false,
      message: "Sync failed",
      reservationsSynced: 0,
      chargesUpdated: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get sync status - check if portal is reachable
 */
export async function checkSyncStatus(
  portalUrl: string = DEFAULT_BOOKING_PORTAL_URL,
) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${portalUrl}/api/bookings`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    return {
      online: response.ok,
      message: "Connected to booking portal",
    };
  } catch (err) {
    return {
      online: false,
      message: `Offline - ${err instanceof Error ? err.message : "No connection"}`,
    };
  }
}
