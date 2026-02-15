import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      specialty,
      date,
      status = "PENDING",
    } = body;

    const normalizedPhone = normalizeDzPhone(phone);
    const normalizedSpecialty = normalizeSpecialty(specialty);

    if (
      !firstName ||
      !lastName ||
      !normalizedPhone ||
      !normalizedSpecialty ||
      !date
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
        },
      });
    }

    const selectedDate = new Date(date);
    const startOfDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const duplicate = await prisma.visit.findFirst({
      where: {
        patientId: patient.id,
        specialty: normalizedSpecialty,
        date: { gte: startOfDay, lt: endOfDay },
        status: { in: ["PENDING", "APPROVED", "SCHEDULED", "WAITING"] },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Rendez-vous déjà existant pour ce patient à cette date" },
        { status: 409 },
      );
    }

    // Create pending visit/reservation
    const visit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        date: new Date(date),
        specialty: normalizedSpecialty,
        status: status,
        treatment: "Rendez-vous",
        cost: 0,
        paid: 0,
      },
    });

    return NextResponse.json(
      { id: visit.id, message: "Booking created successfully" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 },
    );
  }
}
