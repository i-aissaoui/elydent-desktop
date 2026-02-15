import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
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
    const reservations = await prisma.visit.findMany({
      where: {
        status: "PENDING",
        date: {
          gte: todayStart,
        },
      },
      include: {
        patient: true,
      },
      orderBy: [{ status: "asc" }, { date: "asc" }],
    });

    const phoneCounts = reservations.reduce(
      (acc, visit) => {
        const phone = String(visit.patient?.phone || "").trim();
        if (!phone) return acc;
        acc[phone] = (acc[phone] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const formatted = await Promise.all(
      reservations.map(async (visit) => {
        const otherVisitsCount = await prisma.visit.count({
          where: {
            patientId: visit.patientId,
            id: { not: visit.id },
          },
        });

        const phone = visit.patient?.phone || "";
        return {
          id: visit.id,
          firstName: visit.patient?.firstName || "",
          lastName: visit.patient?.lastName || "",
          phone,
          email: visit.patient?.email || "",
          specialty: visit.specialty || "",
          date: visit.date,
          status: visit.status,
          createdAt: visit.createdAt,
          existingClient: otherVisitsCount > 0,
          duplicatePhone: Boolean(phone && phoneCounts[phone] > 1),
        };
      }),
    );

    return NextResponse.json(formatted);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 },
    );
  }
}
