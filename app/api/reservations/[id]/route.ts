import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BOOKING_PORTAL_URL = "http://localhost:3001";

function extractHostedBookingId(description?: string | null) {
  const text = String(description || "");
  const match = text.match(/HostedBooking:([^):\s]+)/);
  return match?.[1] || null;
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

function normalizeEmail(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(value: string) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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
  return "Soin";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const customUrl =
      request.headers.get("x-booking-portal-url") || DEFAULT_BOOKING_PORTAL_URL;

    const { firstName, lastName, phone, email, specialty, date } = body;
    const normalizedPhone = phone ? normalizeDzPhone(String(phone)) : undefined;
    const normalizedEmail = email ? normalizeEmail(String(email)) : undefined;
    const normalizedSpecialty = specialty
      ? normalizeSpecialty(String(specialty))
      : undefined;

    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 },
      );
    }

    const visit = await prisma.visit.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!visit) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    const hostedId = extractHostedBookingId(visit.description);

    if (normalizedPhone) {
      const phoneOwner = await prisma.patient.findFirst({
        where: {
          phone: normalizedPhone,
          id: { not: visit.patientId },
        },
      });
      if (phoneOwner) {
        return NextResponse.json(
          {
            error: "Ce numéro de téléphone existe déjà pour un autre patient.",
          },
          { status: 409 },
        );
      }
    }

    // Update patient if needed
    if (firstName || lastName || normalizedPhone || normalizedEmail) {
      await prisma.patient.update({
        where: { id: visit.patientId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(normalizedPhone && { phone: normalizedPhone }),
          ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
        },
      });
    }

    // Update visit
    const updated = await prisma.visit.update({
      where: { id },
      data: {
        ...(normalizedSpecialty && { specialty: normalizedSpecialty }),
        ...(date && { date: new Date(date) }),
      },
      include: { patient: true },
    });

    if (hostedId) {
      await fetch(`${customUrl}/api/bookings/${hostedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          ...(normalizedPhone ? { phone: normalizedPhone } : {}),
          ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
          ...(normalizedSpecialty ? { specialty: normalizedSpecialty } : {}),
          ...(date ? { date } : {}),
        }),
      }).catch(() => null);
    }

    return NextResponse.json({
      id: updated.id,
      message: "Reservation updated successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update reservation" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const customUrl =
      request.headers.get("x-booking-portal-url") || DEFAULT_BOOKING_PORTAL_URL;

    const visit = await prisma.visit.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!visit) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    const hostedId = extractHostedBookingId(visit.description);

    if (hostedId) {
      await fetch(`${customUrl}/api/bookings/${hostedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      }).catch(() => null);
    }

    await prisma.visit.delete({
      where: { id },
    });

    const remainingVisits = await prisma.visit.count({
      where: { patientId: visit.patientId },
    });

    if (remainingVisits === 0) {
      await prisma.patient.delete({ where: { id: visit.patientId } });
    }

    return NextResponse.json({
      message: "Reservation rejected successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete reservation" },
      { status: 500 },
    );
  }
}
