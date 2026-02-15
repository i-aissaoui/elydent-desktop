"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { getUploadsDir } from "@/lib/storage";

const prisma = new PrismaClient();

function normalizeDzPhone(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
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
}

function normalizeEmail(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(value: string) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ... existing dashboard actions ...

export async function getDailyCounts(
  startDate: string,
  days: number,
  specialty?: string,
) {
  const counts: { [date: string]: number } = {};

  // Parse YYYY-MM-DD as local date
  const [y, m, d] = startDate.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + days);

  const visits = await prisma.visit.findMany({
    where: {
      date: {
        gte: start,
        lt: end,
      },
      status: {
        not: "CANCELLED",
      },
      specialty: specialty || undefined,
    },
    select: { date: true },
  });

  // Group counts by local date string
  visits.forEach((v) => {
    const dStr =
      v.date.getFullYear() +
      "-" +
      String(v.date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(v.date.getDate()).padStart(2, "0");
    counts[dStr] = (counts[dStr] || 0) + 1;
  });

  // Ensure all requested dates are present even with 0 counts
  for (let i = 0; i < days; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dStr =
      current.getFullYear() +
      "-" +
      String(current.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(current.getDate()).padStart(2, "0");
    if (!counts[dStr]) counts[dStr] = 0;
  }

  return counts;
}

export async function getVisitsByStatus(dateStr?: string, specialty?: string) {
  let today: Date;
  if (dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    today = new Date(y, m - 1, d, 0, 0, 0, 0);
  } else {
    today = new Date();
    today.setHours(0, 0, 0, 0);
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const visits = await prisma.visit.findMany({
    where: {
      date: {
        gte: today,
        lt: tomorrow,
      },
      specialty: specialty || undefined,
    },
    include: {
      patient: true,
      payments: true,
    },
    orderBy: {
      order: "asc",
    },
  });

  const result = {
    scheduled: visits.filter((v) => v.status === "SCHEDULED"),
    waiting: visits.filter((v) => v.status === "WAITING"),
    inProgress: visits.filter((v) => v.status === "IN_PROGRESS"),
    completed: visits.filter((v) => v.status === "COMPLETED"),
    cancelled: visits.filter((v) => v.status === "CANCELLED"),
  };

  return JSON.parse(
    JSON.stringify(result, (key, value) =>
      value &&
      typeof value === "object" &&
      value.constructor?.name === "Decimal"
        ? Number(value)
        : value,
    ),
  );
}

export async function updateVisitStatus(visitId: string, status: string) {
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) return;

  // If moving to WAITING from SCHEDULED (arrival), assign to bottom of the list.
  // Otherwise (e.g. rollback from IN_PROGRESS), keep existing order.
  let newOrder = visit.order;
  if (status === "WAITING" && visit.status === "SCHEDULED") {
    const today = new Date(visit.date);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get the highest order in waiting list
    const lastWaiting = await prisma.visit.findFirst({
      where: {
        date: { gte: today, lt: tomorrow },
        status: "WAITING",
      },
      orderBy: { order: "desc" },
    });

    newOrder = (lastWaiting?.order ?? 0) + 1;
  }

  await prisma.visit.update({
    where: { id: visitId },
    data: {
      status,
      order: newOrder,
    },
  });
  revalidatePath("/");
}

export async function getVisitCount(dateStr: string) {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const count = await prisma.visit.count({
    where: {
      date: {
        gte: date,
        lt: nextDay,
      },
      status: {
        not: "CANCELLED",
      },
    },
  });
  return count;
}

export async function createPatientAndVisit(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const patientId = (formData.get("patientId") as string) || "";
  const phone = normalizeDzPhone(formData.get("phone") as string);
  const dateStr = formData.get("date") as string;
  const treatment = (formData.get("treatment") as string) || "Consultation";

  // Default to today if no date provided, otherwise use selected date
  let date = new Date();
  if (dateStr) {
    date = new Date(dateStr);
    // Ensure we set a reasonable time (e.g., 9 AM) or keep current time if today
    // For simplicity, if it's a future date, maybe just noon or keep it simple.
    // Actually, Prisma DateTime includes time. If user picks "2023-01-01", it defaults to midnight.
    // Let's safe-guard:
    if (dateStr.includes("T")) {
      // ISO string passed
    } else {
      // YYYY-MM-DD from input type='date'
      // Create date at 9 AM to avoid timezone issues pushing it to previous day
      date = new Date(dateStr + "T09:00:00");
    }
  }

  // Find or create patient - prioritize explicit patientId from quick search selection
  let patient = null;
  if (patientId) {
    patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
  }

  if (phone) {
    patient =
      patient ||
      (await prisma.patient.findFirst({
        where: { phone },
      }));
  }

  if (!patient) {
    patient = await prisma.patient.findFirst({
      where: {
        firstName,
        lastName,
      },
    });
  }

  if (patient && phone && patient.phone !== phone) {
    patient = await prisma.patient.update({
      where: { id: patient.id },
      data: { phone },
    });
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const activeVisitsForDay = await prisma.visit.count({
    where: {
      date: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: {
        in: ["SCHEDULED", "WAITING", "IN_PROGRESS", "COMPLETED"],
      },
    },
  });

  if (activeVisitsForDay >= 60) {
    revalidatePath("/");
    return {
      ok: false,
      reason: "capacity-exceeded",
      message: "Ce jour est complet (60 rendez-vous maximum).",
    };
  }

  // Check for duplicate visit on same day (BEFORE creating patient)
  if (patient) {
    const existingVisit = await prisma.visit.findFirst({
      where: {
        patientId: patient.id,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: {
          in: ["SCHEDULED", "WAITING", "IN_PROGRESS", "COMPLETED"],
        },
      },
    });

    if (existingVisit) {
      // Patient already has a visit today - skip creation
      revalidatePath("/");
      return {
        ok: false,
        reason: "duplicate-visit",
        message: "Patient already has a visit for this date.",
      };
    }
  }

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        phone: phone || "",
      },
    });
  }

  // Get max order for the targeted date
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const lastVisit = await prisma.visit.findFirst({
    where: {
      date: { gte: targetDate, lt: nextDay },
    },
    orderBy: { order: "desc" },
  });

  const nextOrder = (lastVisit?.order ?? 0) + 1;

  const specialty = formData.get("specialty") as string;
  const sessionType = formData.get("sessionType") as string;
  const description = formData.get("description") as string;
  const notes = formData.get("notes") as string;

  await prisma.visit.create({
    data: {
      patientId: patient.id,
      date: date,
      treatment,
      specialty,
      sessionType,
      description,
      notes: notes || description, // Save notes or fall back to description
      order: nextOrder,
      status: "SCHEDULED",
    },
  });

  revalidatePath("/");
  return { ok: true };
}

export async function moveVisit(visitId: string, direction: "up" | "down") {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { patient: true },
  });
  if (!visit) return;

  const today = new Date(visit.date);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get all waiting visits for this day, ordered by current order
  const allWaitingVisits = await prisma.visit.findMany({
    where: {
      date: { gte: today, lt: tomorrow },
      status: "WAITING",
    },
    orderBy: { order: "asc" },
  });

  // Find current position
  const currentIndex = allWaitingVisits.findIndex((v) => v.id === visitId);
  if (currentIndex === -1) return;

  // Determine swap target
  let targetIndex = -1;
  if (direction === "up" && currentIndex > 0) {
    targetIndex = currentIndex - 1;
  } else if (
    direction === "down" &&
    currentIndex < allWaitingVisits.length - 1
  ) {
    targetIndex = currentIndex + 1;
  }

  if (targetIndex === -1) return; // Can't move

  const currentVisit = allWaitingVisits[currentIndex];
  const targetVisit = allWaitingVisits[targetIndex];

  // Swap the order values
  await prisma.$transaction([
    prisma.visit.update({
      where: { id: currentVisit.id },
      data: { order: targetVisit.order },
    }),
    prisma.visit.update({
      where: { id: targetVisit.id },
      data: { order: currentVisit.order },
    }),
  ]);

  revalidatePath("/");
}

export async function reorderWaitingVisits(visitIds: string[]) {
  // Update order for each visit based on array position
  await prisma.$transaction(
    visitIds.map((id, index) =>
      prisma.visit.update({
        where: { id },
        data: { order: index + 1 },
      }),
    ),
  );
  revalidatePath("/");
}

export async function getPatients(query?: string) {
  return await prisma.patient.findMany({
    where: query
      ? {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { phone: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

export async function getPatient(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      visits: {
        include: {
          payments: true,
        },
        orderBy: {
          date: "desc",
        },
      },
      teeth: true,
    },
  });

  if (!patient) return null;

  // Deep serialize to handle Decimals explicitly
  return JSON.parse(
    JSON.stringify(patient, (key, value) =>
      value &&
      typeof value === "object" &&
      value.constructor?.name === "Decimal"
        ? Number(value)
        : value,
    ),
  );
}

export async function updatePatientDetails(formData: FormData) {
  const id = formData.get("id") as string;
  const email = normalizeEmail(formData.get("email") as string);
  const address = formData.get("address") as string;
  const phone = normalizeDzPhone(formData.get("phone") as string);

  const gender = formData.get("gender") as string;
  const birthDateStr = formData.get("birthDate") as string;
  const birthDate = birthDateStr ? new Date(birthDateStr) : null;

  const emergencyContact = formData.get("emergencyContact") as string;
  const emergencyPhone = formData.get("emergencyPhone") as string;

  const bloodType = formData.get("bloodType") as string;
  const allergies = formData.get("allergies") as string;
  const medicalHistory = formData.get("medicalHistory") as string;
  const currentMedications = formData.get("currentMedications") as string;
  const notes = formData.get("notes") as string;
  const contacts = formData.get("contacts") as string; // JSON string

  if (email && !isValidEmail(email)) {
    throw new Error("Format d'email invalide");
  }

  if (phone) {
    const phoneOwner = await prisma.patient.findFirst({
      where: {
        phone,
        id: { not: id },
      },
    });
    if (phoneOwner) {
      throw new Error("Ce numéro de téléphone existe déjà");
    }
  }

  if (email) {
    const emailOwner = await prisma.patient.findFirst({
      where: {
        email,
        id: { not: id },
      },
    });
    if (emailOwner) {
      throw new Error("Cet email existe déjà");
    }
  }

  await prisma.patient.update({
    where: { id },
    data: {
      email,
      address,
      phone,
      gender,
      birthDate,
      emergencyContact,
      emergencyPhone,
      bloodType,
      allergies,
      medicalHistory,
      currentMedications,
      notes,
      contacts,
    },
  });

  revalidatePath(`/patients/${id}`);
}

export async function createVisit(formData: FormData) {
  const patientId = formData.get("patientId") as string;
  const dateStr = formData.get("date") as string;
  const treatment = formData.get("treatment") as string;

  const date = dateStr ? new Date(dateStr) : new Date();

  // Get max order for the targeted date
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const lastVisit = await prisma.visit.findFirst({
    where: {
      date: { gte: targetDate, lt: nextDay },
    },
    orderBy: { order: "desc" },
  });

  const nextOrder = (lastVisit?.order ?? 0) + 1;

  const specialty = formData.get("specialty") as string;
  const sessionType = formData.get("sessionType") as string;
  const description = formData.get("description") as string;

  await prisma.visit.create({
    data: {
      patientId,
      date,
      treatment: treatment || "Consultation",
      specialty,
      sessionType,
      description,
      order: nextOrder,
      status: "SCHEDULED",
    },
  });

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/");
}

export async function cancelVisit(formData: FormData) {
  const id = (formData.get("visitId") || formData.get("id")) as string;
  if (!id) throw new Error("ID de visite manquant (cancelVisit)");

  await prisma.visit.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/");
  revalidatePath("/patients");
}

export async function deleteVisit(formData: FormData) {
  const id = (formData.get("visitId") || formData.get("id")) as string;
  const patientId = formData.get("patientId") as string;
  if (!id) throw new Error("ID de visite manquant (deleteVisit)");

  // Manually delete related payments first (manual cascade)
  await prisma.payment.deleteMany({
    where: { visitId: id },
  });

  await prisma.visit.delete({
    where: { id },
  });

  if (patientId) {
    revalidatePath(`/patients/${patientId}`);
  }
  revalidatePath("/");
  revalidatePath("/patients");
}

export async function reactivateVisit(formData: FormData) {
  const id = (formData.get("visitId") || formData.get("id")) as string;
  if (!id) throw new Error("ID de visite manquant (reactivateVisit)");

  // Get the visit to check for duplicates
  const visit = await prisma.visit.findUnique({
    where: { id },
    include: { patient: true },
  });

  if (!visit) return;

  // Check if patient already has an active visit on this day
  const startOfDay = new Date(visit.date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(visit.date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingVisit = await prisma.visit.findFirst({
    where: {
      patientId: visit.patientId,
      date: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: {
        in: ["SCHEDULED", "WAITING", "IN_PROGRESS", "COMPLETED"],
      },
      id: {
        not: id, // Exclude current visit
      },
    },
  });

  if (existingVisit) {
    // Patient already has an active visit - don't reactivate
    revalidatePath("/");
    return;
  }

  await prisma.visit.update({
    where: { id },
    data: {
      status: "SCHEDULED",
      order: 0, // Reset order
    },
  });
  revalidatePath("/");
  revalidatePath("/patients");
}

export async function addPayment(formData: FormData) {
  const visitId = formData.get("visitId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const patientId = formData.get("patientId") as string;

  if (!visitId || isNaN(amount)) return;

  await prisma.payment.create({
    data: {
      visitId,
      amount,
    },
  });

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { payments: true },
  });

  if (visit) {
    // Recalculate total paid
    const allPayments = await prisma.payment.findMany({ where: { visitId } });
    const realTotalPaid = allPayments.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0,
    );

    await prisma.visit.update({
      where: { id: visitId },
      data: { paid: realTotalPaid },
    });
  }

  revalidatePath(`/patients/${patientId}`);
}

export async function deletePayment(formData: FormData) {
  const paymentId = formData.get("paymentId") as string;
  const visitId = formData.get("visitId") as string;
  const patientId = formData.get("patientId") as string;

  await prisma.payment.delete({ where: { id: paymentId } });

  // Recalculate total paid
  const allPayments = await prisma.payment.findMany({ where: { visitId } });
  const realTotalPaid = allPayments.reduce(
    (sum: number, p: any) => sum + Number(p.amount),
    0,
  );

  await prisma.visit.update({
    where: { id: visitId },
    data: { paid: realTotalPaid },
  });

  revalidatePath(`/patients/${patientId}`);
}

export async function updateVisitCost(formData: FormData) {
  const visitId = formData.get("visitId") as string;
  const cost = parseFloat(formData.get("cost") as string);
  const patientId = formData.get("patientId") as string;

  if (!visitId || isNaN(cost)) return;

  await prisma.visit.update({
    where: { id: visitId },
    data: { cost },
  });

  revalidatePath(`/patients/${patientId}`);
}

export async function updateVisitNotes(formData: FormData) {
  const visitId = formData.get("visitId") as string;
  const notes = formData.get("notes") as string;
  const patientId = formData.get("patientId") as string;

  await prisma.visit.update({
    where: { id: visitId },
    data: { notes },
  });

  revalidatePath(`/patients/${patientId}`);
}

export async function updateVisitTreatment(formData: FormData) {
  const visitId = formData.get("visitId") as string;
  const treatment = formData.get("treatment") as string;
  const customTreatment = formData.get("customTreatment") as string;
  const patientId = formData.get("patientId") as string;

  const finalTreatment = customTreatment || treatment;

  await prisma.visit.update({
    where: { id: visitId },
    data: { treatment: finalTreatment },
  });

  revalidatePath(`/patients/${patientId}`);
}

export async function uploadVisitImage(formData: FormData) {
  const visitId = formData.get("visitId") as string;
  const file = formData.get("file") as File;
  const patientId = formData.get("patientId") as string;

  if (!file || !visitId) return;

  // Convert Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fileName = `${visitId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
  const uploadDir = getUploadsDir();
  const filePath = join(uploadDir, fileName);

  // Ensure directory exists (Node 20+ feature usually, but recursively is standard)
  const fs = require("fs");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  await writeFile(filePath, buffer);

  // Update images array in DB
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  let images = [];
  if (visit?.images) {
    images = JSON.parse(visit.images);
  }

  const publicPath = `/uploads/${fileName}`;
  images.push(publicPath);

  await prisma.visit.update({
    where: { id: visitId },
    data: { images: JSON.stringify(images) },
  });

  revalidatePath(`/patients/${patientId}`);
}

export async function addToothProcess(
  patientId: string,
  toothNumber: number,
  status: string,
  notes?: string,
) {
  try {
    await prisma.toothState.create({
      data: {
        patientId,
        toothNumber,
        status,
        notes,
      },
    });
    revalidatePath(`/patients/${patientId}`);
  } catch (error) {
    console.error("Error in addToothProcess:", error);
    throw new Error("Failed to add tooth process");
  }
}

export async function deleteToothProcess(patientId: string, processId: string) {
  try {
    await prisma.toothState.delete({
      where: { id: processId },
    });
    revalidatePath(`/patients/${patientId}`);
  } catch (error: any) {
    // Handle case where record is already deleted (e.g. double click)
    if (error.code === "P2025") {
      console.warn(
        "Attempted to delete a tooth process that does not exist:",
        processId,
      );
      return;
    }
    console.error("Error in deleteToothProcess:", error);
    throw new Error("Failed to delete tooth process");
  }
}
export async function autoMarkMissedVisits() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const missed = await prisma.visit.updateMany({
      where: {
        date: { lt: today },
        status: { in: ["SCHEDULED", "WAITING"] },
      },
      data: { status: "MISSED" },
    });

    if (missed.count > 0) {
      // revalidatePath("/");
      // revalidatePath("/missed");
    }
    return missed.count;
  } catch (error) {
    console.error("Error auto-marking missed visits:", error);
    return 0;
  }
}

export async function getMissedVisits() {
  try {
    const now = new Date();

    // 1. Get all missed visits
    const missedVisits = await prisma.visit.findMany({
      where: { status: "MISSED" },
      include: {
        patient: {
          include: {
            visits: {
              where: {
                status: { in: ["SCHEDULED", "WAITING"] },
                date: { gte: now },
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // 2. Filter out patients who HAVE a future appointment
    const filteredVisits = missedVisits.filter((visit) => {
      return visit.patient.visits.length === 0;
    });

    // 3. Serialize and return (handle Decimals explicitly)
    return JSON.parse(
      JSON.stringify(filteredVisits, (key, value) =>
        value &&
        typeof value === "object" &&
        value.constructor?.name === "Decimal"
          ? Number(value)
          : value,
      ),
    );
  } catch (error) {
    console.error("Error fetching missed visits:", error);
    return [];
  }
}

export async function updatePatientDentition(
  patientId: string,
  dentitionType: string,
) {
  try {
    await prisma.patient.update({
      where: { id: patientId },
      data: { dentitionType },
    });
    revalidatePath(`/patients/${patientId}`);
  } catch (error) {
    console.error("Error in updatePatientDentition:", error);
    throw new Error("Failed to update dentition type");
  }
}

export async function getChargesData(): Promise<
  Array<{
    patientId: string;
    firstName: string;
    lastName: string;
    phone: string;
    totalToPayment: number;
    totalReceived: number;
    balance: number;
    visits: Array<{
      visitId: string;
      date: string;
      treatment: string;
      specialty: string;
      amount: number;
      paid: number;
      payments: Array<{
        id: string;
        amount: number;
        date: string;
        paymentMethod?: string;
        note?: string;
      }>;
    }>;
    status: "paid" | "partial" | "pending";
  }>
> {
  try {
    const patients = await prisma.patient.findMany({
      include: {
        visits: {
          where: {
            status: { not: "CANCELLED" },
          },
          include: {
            payments: {
              orderBy: { date: "asc" },
            },
          },
          orderBy: { date: "desc" },
        },
      },
      orderBy: { lastName: "asc" },
    });

    const getStatus = (
      balance: number,
      totalCost: number,
      totalPaid: number,
    ): "paid" | "partial" | "pending" => {
      if (balance === 0 && totalCost > 0) return "paid";
      if (totalPaid > 0) return "partial";
      return "pending";
    };

    const charges = patients.map((patient) => {
      const visits = patient.visits.map((visit) => ({
        visitId: visit.id,
        date: visit.date.toISOString().split("T")[0],
        treatment: visit.treatment,
        specialty: visit.specialty || "Général",
        amount: Number(visit.cost),
        paid: Number(visit.paid),
        payments: visit.payments.map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount),
          date: payment.date.toISOString(),
          paymentMethod: payment.paymentMethod || undefined,
          note: payment.note || undefined,
        })),
      }));

      const totalCost = visits.reduce((sum, v) => sum + v.amount, 0);
      const totalPaid = visits.reduce((sum, v) => sum + v.paid, 0);
      const balance = totalCost - totalPaid;

      return {
        patientId: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        totalToPayment: totalCost,
        totalReceived: totalPaid,
        balance: balance,
        visits: visits,
        status: getStatus(balance, totalCost, totalPaid),
      };
    });

    return charges;
  } catch (error) {
    console.error("Error fetching charges data:", error);
    return [];
  }
}

function extractUploadPaths(value?: string | null): string[] {
  if (!value) return [];

  const collect = (input: unknown): string[] => {
    if (Array.isArray(input)) {
      return input.flatMap((item) => collect(item));
    }
    if (typeof input !== "string") return [];

    const trimmed = input.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("/uploads/")) return [trimmed];

    try {
      const parsedUrl = new URL(trimmed);
      if (parsedUrl.pathname.startsWith("/uploads/")) {
        return [parsedUrl.pathname];
      }
    } catch {
      // Not a URL, ignore
    }

    return [];
  };

  try {
    return collect(JSON.parse(value));
  } catch {
    return collect(value);
  }
}

export async function deletePatientIfSettled(patientId: string) {
  if (!patientId) {
    return { success: false, error: "Patient introuvable" };
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      visits: {
        include: {
          operations: {
            include: { steps: true },
          },
        },
      },
    },
  });

  if (!patient) {
    return { success: false, error: "Patient introuvable" };
  }

  const activeVisits = patient.visits.filter(
    (visit) => visit.status !== "CANCELLED",
  );
  const remaining = activeVisits.reduce((sum, visit) => {
    const cost = Number(visit.cost || 0);
    const paid = Number(visit.paid || 0);
    const balance = Math.max(0, cost - paid);
    return sum + balance;
  }, 0);

  const uploadPaths = new Set<string>();
  for (const visit of patient.visits) {
    extractUploadPaths(visit.images).forEach((p) => uploadPaths.add(p));

    for (const operation of visit.operations) {
      extractUploadPaths(operation.images).forEach((p) => uploadPaths.add(p));
      extractUploadPaths(operation.radiographs).forEach((p) =>
        uploadPaths.add(p),
      );

      for (const step of operation.steps) {
        extractUploadPaths(step.images).forEach((p) => uploadPaths.add(p));
      }
    }
  }

  const visitIds = patient.visits.map((v) => v.id);
  const operationIds = patient.visits.flatMap((v) =>
    v.operations.map((o) => o.id),
  );

  await prisma.$transaction(async (tx) => {
    if (visitIds.length > 0) {
      await tx.payment.deleteMany({ where: { visitId: { in: visitIds } } });
      await tx.visitHistory.deleteMany({
        where: { visitId: { in: visitIds } },
      });
    }

    if (operationIds.length > 0) {
      await tx.procedureStep.deleteMany({
        where: { operationId: { in: operationIds } },
      });
      await tx.operationHistory.deleteMany({
        where: { operationId: { in: operationIds } },
      });
      await tx.operation.deleteMany({ where: { id: { in: operationIds } } });
    }

    await tx.visit.deleteMany({ where: { patientId } });
    await tx.toothState.deleteMany({ where: { patientId } });
    await tx.patient.delete({ where: { id: patientId } });
  });

  await Promise.all(
    Array.from(uploadPaths).map(async (publicPath) => {
      try {
        const relativePath = publicPath.replace(/^\/+/, "");
        if (!relativePath.startsWith("uploads/")) return;
        const absolutePath = join(
          getUploadsDir(),
          relativePath.replace(/^uploads\//, ""),
        );
        await unlink(absolutePath).catch(() => null);
      } catch {
        // ignore file deletion errors to avoid blocking DB cleanup
      }
    }),
  );

  revalidatePath("/patients");
  revalidatePath("/charges");
  revalidatePath("/");

  return {
    success: true,
    remainingBeforeDeletion: remaining,
    message:
      remaining > 0
        ? `Patient supprimé avec un solde impayé de ${remaining.toLocaleString("fr-DZ")} DA`
        : "Patient supprimé",
  };
}
