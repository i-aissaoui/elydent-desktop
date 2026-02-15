import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BOOKING_PORTAL_URL = "http://localhost:3001";

function extractHostedBookingId(description?: string | null) {
  const text = String(description || "");
  const match = text.match(/HostedBooking:([^):\s]+)/);
  return match?.[1] || null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const customUrl =
      request.headers.get("x-booking-portal-url") || DEFAULT_BOOKING_PORTAL_URL;

    const current = await prisma.visit.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!current) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    const hostedId = extractHostedBookingId(current.description);

    const updated = await prisma.visit.update({
      where: { id },
      data: {
        status: "SCHEDULED",
      },
      include: { patient: true },
    });

    if (hostedId) {
      await fetch(`${customUrl}/api/bookings/${hostedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CONFIRMED",
          firstName: updated.patient?.firstName,
          lastName: updated.patient?.lastName,
          phone: updated.patient?.phone,
          email: updated.patient?.email,
          specialty: updated.specialty,
          date: `${updated.date.getFullYear()}-${String(updated.date.getMonth() + 1).padStart(2, "0")}-${String(updated.date.getDate()).padStart(2, "0")}`,
        }),
      }).catch(() => null);
    }

    return NextResponse.json({
      id: updated.id,
      message: "Reservation approved successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to approve reservation" },
      { status: 500 },
    );
  }
}
