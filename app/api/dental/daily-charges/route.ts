import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const dateStr = request.nextUrl.searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json(
        { error: "Date parameter required" },
        { status: 400 },
      );
    }

    const date = new Date(dateStr);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const visits = await prisma.visit.findMany({
      where: {
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Group visits by specialty and calculate charges
    const chargesBySpecialty: Record<
      string,
      {
        specialty: string;
        count: number;
        totalCost: number;
        totalPaid: number;
        totalRemaining: number;
      }
    > = {};

    visits.forEach((visit) => {
      const specialty = visit.specialty || "Non spécifié";
      if (!chargesBySpecialty[specialty]) {
        chargesBySpecialty[specialty] = {
          specialty,
          count: 0,
          totalCost: 0,
          totalPaid: 0,
          totalRemaining: 0,
        };
      }

      chargesBySpecialty[specialty].count += 1;
      chargesBySpecialty[specialty].totalCost += Number(visit.cost) || 0;
      chargesBySpecialty[specialty].totalPaid += Number(visit.paid) || 0;
      chargesBySpecialty[specialty].totalRemaining +=
        (Number(visit.cost) || 0) - (Number(visit.paid) || 0);
    });

    // Calculate totals
    const totalCost = visits.reduce((sum, v) => sum + Number(v.cost), 0);
    const totalPaid = visits.reduce((sum, v) => sum + Number(v.paid), 0);
    const totalRemaining = totalCost - totalPaid;

    return NextResponse.json({
      date: dateStr,
      visitCount: visits.length,
      totalCost,
      totalPaid,
      totalRemaining,
      chargesBySpecialty: Object.values(chargesBySpecialty),
      visits: visits.map((v) => ({
        id: v.id,
        time: v.date.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        patient: `${v.patient.firstName} ${v.patient.lastName}`,
        specialty: v.specialty,
        treatment: v.treatment,
        cost: v.cost,
        paid: v.paid,
        status: v.status,
      })),
    });
  } catch (error) {
    console.error("Error fetching charges:", error);
    return NextResponse.json(
      { error: "Failed to fetch charges" },
      { status: 500 },
    );
  }
}
