import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_BOOKING_PORTAL_URL = "http://localhost:3001";

const CANONICAL_SPECIALTIES = ["Soin", "ODF", "Chirurgie", "Proteges"] as const;

function normalizeSpecialty(value: string) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "Soin";

  if (raw === "soin" || raw.includes("soin")) return "Soin";
  if (raw === "odf" || raw.includes("orthodont")) return "ODF";
  if (raw.includes("chirurg")) return "Chirurgie";
  if (raw === "proteges" || raw.includes("proth") || raw.includes("implant")) {
    return "Proteges";
  }

  const exact = CANONICAL_SPECIALTIES.find(
    (item) => item.toLowerCase() === raw,
  );
  return exact || "Soin";
}

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

function parseDateOnlyLocal(dateStr: string) {
  const [y, m, d] = String(dateStr || "")
    .split("-")
    .map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function parseVisitDate(dateStr: string, time?: string | null) {
  const [y, m, d] = String(dateStr || "")
    .split("-")
    .map(Number);
  if (!y || !m || !d) return null;
  const [hour = 9, minute = 0] = String(time || "09:00")
    .split(":")
    .map((v) => Number(v));
  return new Date(
    y,
    m - 1,
    d,
    Number.isFinite(hour) ? hour : 9,
    Number.isFinite(minute) ? minute : 0,
    0,
    0,
  );
}

function isPastDate(dateStr: string) {
  const d = parseDateOnlyLocal(dateStr);
  if (!d) return true;
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    0,
    0,
    0,
    0,
  );
  return d < todayStart;
}

async function buildAllChargesPayload() {
  const visits = await prisma.visit.findMany({
    where: {
      status: {
        not: "CANCELLED",
      },
    },
    select: {
      date: true,
      specialty: true,
      cost: true,
    },
  });

  const byDate: Record<
    string,
    Record<string, { count: number; totalCost: number }>
  > = {};

  for (const visit of visits) {
    const key = `${visit.date.getFullYear()}-${String(visit.date.getMonth() + 1).padStart(2, "0")}-${String(visit.date.getDate()).padStart(2, "0")}`;
    const specialty = normalizeSpecialty(visit.specialty || "Soin");
    if (!byDate[key]) byDate[key] = {};
    if (!byDate[key][specialty]) {
      byDate[key][specialty] = { count: 0, totalCost: 0 };
    }
    byDate[key][specialty].count += 1;
    byDate[key][specialty].totalCost += Number(visit.cost || 0);
  }

  return { byDate };
}

async function buildUpcomingBookingsPayload() {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );

  const visits = await prisma.visit.findMany({
    where: {
      date: {
        gte: todayStart,
      },
      status: {
        not: "CANCELLED",
      },
    },
    select: {
      id: true,
      date: true,
      specialty: true,
      status: true,
      description: true,
      treatment: true,
      createdAt: true,
      patient: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  const bookings = visits
    .map((visit) => {
      const patient = visit.patient;
      const phone = normalizeDzPhone(patient?.phone || "");
      const specialty = normalizeSpecialty(visit.specialty || "Soin");
      const dateLabel = `${visit.date.getFullYear()}-${String(visit.date.getMonth() + 1).padStart(2, "0")}-${String(visit.date.getDate()).padStart(2, "0")}`;

      if (!patient || !patient.firstName || !patient.lastName || !phone) {
        return null;
      }

      const status = visit.status === "PENDING" ? "PENDING" : "CONFIRMED";

      return {
        localVisitId: visit.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone,
        email: patient.email || "",
        date: dateLabel,
        specialty,
        reason: visit.description || visit.treatment || "Rendez-vous cabinet",
        status,
        createdAt: visit.createdAt.toISOString(),
      };
    })
    .filter(
      (
        item,
      ): item is {
        localVisitId: string;
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
        date: string;
        specialty: (typeof CANONICAL_SPECIALTIES)[number];
        reason: string;
        status: string;
        createdAt: string;
      } => Boolean(item),
    );

  return { bookings };
}

export async function POST(request: NextRequest) {
  try {
    // Get booking portal URL from request header (set by client from localStorage)
    const customUrl =
      request.headers.get("x-booking-portal-url") || DEFAULT_BOOKING_PORTAL_URL;

    // Validate URL format
    try {
      new URL(customUrl);
    } catch {
      return NextResponse.json(
        {
          error: "URL du portail invalide. Vérifiez les paramètres système.",
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );

    await prisma.visit.deleteMany({
      where: {
        date: { lt: todayStart },
        description: {
          contains: "HostedBooking:",
        },
      },
    });

    // 1) Pull bookings from hosted portal
    const response = await fetch(`${customUrl}/api/bookings`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Impossible de récupérer les réservations. Code: ${response.status}`,
          details:
            "Vérifiez que le portail de réservation est en ligne et accessible.",
        },
        { status: 500 },
      );
    }

    const bookings = (await response.json()) as Array<{
      id?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      specialty?: string;
      date?: string;
      time?: string;
      status?: string;
      source?: string;
    }>;

    const filteredBookings = bookings.filter((b) => {
      if (String(b.source || "").toUpperCase() === "LOCAL_SYNC") return false;
      const allowedStatus =
        b.status === "PENDING" ||
        b.status === "CONFIRMED" ||
        b.status === "APPROVED";
      if (!allowedStatus || !b.date) return false;
      return !isPastDate(b.date);
    });

    let importedCount = 0;
    const hostedMarkers = new Set<string>();

    for (const booking of filteredBookings) {
      const firstName = String(booking.firstName || "").trim();
      const lastName = String(booking.lastName || "").trim();
      const email = String(booking.email || "")
        .trim()
        .toLowerCase();
      const specialty = normalizeSpecialty(String(booking.specialty || "Soin"));
      const phone = normalizeDzPhone(String(booking.phone || ""));
      const bookingDate = String(booking.date || "");
      const marker = booking.id
        ? `HostedBooking:${booking.id}`
        : `HostedBooking:${phone}:${bookingDate}:${specialty}`;
      hostedMarkers.add(marker);

      if (!firstName || !lastName || !phone || !bookingDate) {
        continue;
      }

      const visitDate = parseVisitDate(bookingDate, booking.time);
      if (!visitDate) continue;

      let patient = await prisma.patient.findFirst({
        where: { phone },
      });

      if (!patient) {
        patient = await prisma.patient.create({
          data: {
            firstName,
            lastName,
            phone,
            ...(email ? { email } : {}),
            notes: "Créé depuis synchronisation portail",
          },
        });
      } else {
        await prisma.patient.update({
          where: { id: patient.id },
          data: {
            firstName,
            lastName,
            phone,
            ...(email ? { email } : {}),
          },
        });
      }

      const existing = await prisma.visit.findFirst({
        where: {
          description: {
            contains: marker,
          },
        },
      });

      if (existing) {
        await prisma.visit.update({
          where: { id: existing.id },
          data: {
            patientId: patient.id,
            date: visitDate,
            specialty,
            status: booking.status === "PENDING" ? "PENDING" : "SCHEDULED",
          },
        });
      } else {
        const startOfDay = new Date(
          visitDate.getFullYear(),
          visitDate.getMonth(),
          visitDate.getDate(),
          0,
          0,
          0,
          0,
        );
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const sameDayExisting = await prisma.visit.findFirst({
          where: {
            patientId: patient.id,
            specialty,
            date: {
              gte: startOfDay,
              lt: endOfDay,
            },
            status: {
              in: ["PENDING", "SCHEDULED"],
            },
          },
        });

        if (sameDayExisting) {
          await prisma.visit.update({
            where: { id: sameDayExisting.id },
            data: {
              date: visitDate,
              specialty,
              status: booking.status === "PENDING" ? "PENDING" : "SCHEDULED",
              description: sameDayExisting.description?.includes(
                "HostedBooking:",
              )
                ? sameDayExisting.description
                : `Synchronisé depuis portail (${marker})`,
            },
          });
          importedCount += 1;
          continue;
        }

        await prisma.visit.create({
          data: {
            patientId: patient.id,
            date: visitDate,
            specialty,
            status: booking.status === "PENDING" ? "PENDING" : "SCHEDULED",
            treatment: "Réservation en ligne",
            description: `Synchronisé depuis portail (${marker})`,
            cost: 0,
            paid: 0,
          },
        });
      }

      importedCount += 1;
    }

    const markerConditions = Array.from(hostedMarkers).map((marker) => ({
      description: { contains: marker },
    }));

    await prisma.visit.deleteMany({
      where: {
        date: { gte: todayStart },
        status: "PENDING",
        description: { contains: "HostedBooking:" },
        ...(markerConditions.length > 0
          ? {
              NOT: {
                OR: markerConditions,
              },
            }
          : {}),
      },
    });

    // 2) Push all local charges to hosted portal (full refresh)
    const chargesPayload = await buildAllChargesPayload();
    const pushResponse = await fetch(`${customUrl}/api/sync/charges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chargesPayload),
    });

    let pushedDates = 0;
    if (pushResponse.ok) {
      const pushed = await pushResponse.json();
      pushedDates = Number(pushed?.datesSynced || 0);
    }

    // 3) Push all upcoming local appointments to hosted portal visibility
    const bookingsPayload = await buildUpcomingBookingsPayload();
    const bookingsPushResponse = await fetch(`${customUrl}/api/sync/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingsPayload),
    });

    let bookingsSynced = 0;
    if (bookingsPushResponse.ok) {
      const pushed = await bookingsPushResponse.json();
      bookingsSynced = Number(pushed?.synced || 0);
    }

    return NextResponse.json({
      success: true,
      total: importedCount,
      bookings: filteredBookings,
      chargesPushed: pushResponse.ok,
      datesSynced: pushedDates,
      appointmentsPushed: bookingsPushResponse.ok,
      upcomingAppointmentsSynced: bookingsSynced,
      synced_at: new Date().toISOString(),
      portal_url: customUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la synchronisation",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const customUrl =
      request.nextUrl.searchParams.get("portal_url") ||
      DEFAULT_BOOKING_PORTAL_URL;

    // Validate URL format
    try {
      new URL(customUrl);
    } catch {
      return NextResponse.json(
        {
          status: "error",
          error: "Format d'URL invalide",
        },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(`${customUrl}/api/bookings`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const bookings = await response.json();
        return NextResponse.json({
          status: "connected",
          available_bookings: bookings.length,
          portal_url: customUrl,
        });
      } else {
        return NextResponse.json(
          {
            status: "disconnected",
            error: "Le portail de réservation n'a pas répondu correctement",
            portal_url: customUrl,
          },
          { status: 500 },
        );
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            status: "timeout",
            error: "Délai d'attente dépassé lors de la connexion",
            portal_url: customUrl,
          },
          { status: 504 },
        );
      }

      return NextResponse.json(
        {
          status: "error",
          error: `Impossible de se connecter: ${fetchError instanceof Error ? fetchError.message : "Erreur réseau"}`,
          portal_url: customUrl,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la vérification",
      },
      { status: 500 },
    );
  }
}
