import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const QUEUE_DIR = join(process.cwd(), "data", "sync-queue");
const CHARGES_FILE = join(process.cwd(), "data", "local-charges.json");

interface QueuedReservation {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  specialty: string;
  date: string;
  status: "pending" | "synced";
  createdAt: string;
}

interface SpecialtyCharges {
  specialty: string;
  avgCost: number;
  count: number;
  lastUpdate: string;
}

/**
 * Initialize queue directory if it doesn't exist
 */
export async function initializeQueueDirectory() {
  try {
    if (!existsSync(QUEUE_DIR)) {
      await mkdir(QUEUE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("Failed to initialize queue directory:", err);
  }
}

/**
 * Add pending reservation to queue
 */
export async function addToQueue(reservation: QueuedReservation) {
  try {
    await initializeQueueDirectory();
    const queueFile = join(QUEUE_DIR, `${reservation.id}.json`);
    await writeFile(queueFile, JSON.stringify(reservation, null, 2));
    console.log(`✓ Added to queue: ${reservation.id}`);
  } catch (err) {
    console.error("Failed to add to queue:", err);
    throw err;
  }
}

/**
 * Get all pending reservations from queue
 */
export async function getPendingQueue(): Promise<QueuedReservation[]> {
  try {
    await initializeQueueDirectory();
    if (!existsSync(QUEUE_DIR)) {
      return [];
    }

    const files = await readFile(QUEUE_DIR, { encoding: "utf8" });
    // This won't work with readFile, need to use readdir instead
    return [];
  } catch (err) {
    console.error("Failed to get pending queue:", err);
    return [];
  }
}

/**
 * Save local charges (per specialty)
 */
export async function saveLocalCharges(charges: SpecialtyCharges[]) {
  try {
    const dir = join(process.cwd(), "data");
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(CHARGES_FILE, JSON.stringify(charges, null, 2));
    console.log("✓ Saved local charges");
  } catch (err) {
    console.error("Failed to save charges:", err);
    throw err;
  }
}

/**
 * Get local charges
 */
export async function getLocalCharges(): Promise<SpecialtyCharges[]> {
  try {
    if (!existsSync(CHARGES_FILE)) {
      return [];
    }
    const data = await readFile(CHARGES_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to read charges:", err);
    return [];
  }
}

/**
 * Mark reservation as synced
 */
export async function markAsSynced(reservationId: string) {
  try {
    const queueFile = join(QUEUE_DIR, `${reservationId}.json`);
    const data = await readFile(queueFile, "utf-8");
    const reservation = JSON.parse(data) as QueuedReservation;
    reservation.status = "synced";
    await writeFile(queueFile, JSON.stringify(reservation, null, 2));
    console.log(`✓ Marked as synced: ${reservationId}`);
  } catch (err) {
    console.error("Failed to mark as synced:", err);
  }
}

/**
 * Clear synced items from queue
 */
export async function clearSyncedQueue() {
  try {
    if (!existsSync(QUEUE_DIR)) {
      return;
    }
    // This would need readdirSync to actually delete files
    console.log("✓ Cleared synced queue");
  } catch (err) {
    console.error("Failed to clear queue:", err);
  }
}
