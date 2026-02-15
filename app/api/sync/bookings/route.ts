import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

function isPastDate(date: string) {
  const [y, m, d] = String(date || "")
    .split("-")
    .map(Number);
  if (!y || !m || !d) return true;
  const selected = new Date(y, m - 1, d, 0, 0, 0, 0);
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  return selected < today;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { firstName, lastName, phone, email, date, time, specialty, reason } =
      body;
    const normalizedSpecialty = normalizeSpecialty(specialty);
    const normalizedPhone = normalizeDzPhone(phone);

    if (
      !firstName ||
      !lastName ||
      !normalizedPhone ||
      !date ||
      !time ||
      !normalizedSpecialty
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (isPastDate(date)) {
      return NextResponse.json(
        { error: "Cannot sync booking for a past date" },
        { status: 400 },
      );
    }

    // Find or create patient
    let patient = await prisma.patient.findFirst({
      where: { phone: normalizedPhone },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          firstName,
          lastName,
          phone: normalizedPhone,
          email,
          notes: `Online booking from portal - ${reason || ""}`,
        },
      });
    }

    const visitDate = new Date(`${date}T${time}:00`);
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

    const duplicateVisit = await prisma.visit.findFirst({
      where: {
        patientId: patient.id,
        specialty: normalizedSpecialty,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: {
          in: ["PENDING", "APPROVED", "SCHEDULED", "WAITING"],
        },
      },
    });

    if (duplicateVisit) {
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          patientId: patient.id,
          visitId: duplicateVisit.id,
        },
        { status: 200 },
      );
    }

    // Create visit record
    const visit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        date: visitDate,
        specialty: normalizedSpecialty,
        treatment: `Rendez-vous en ligne - ${normalizedSpecialty}`,
        description: reason || "Online booking from portal",
        status: "SCHEDULED",
        cost: 0, // Default cost, can be updated later
      },
    });

    return NextResponse.json(
      {
        success: true,
        patientId: patient.id,
        visitId: visit.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Booking sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync booking" },
      { status: 500 },
    );
  }
}
