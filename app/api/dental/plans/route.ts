import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET treatment plans for a patient
export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID required" },
        { status: 400 },
      );
    }

    const plans = await prisma.treatmentPlan.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(plans);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

// POST create treatment plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patientId,
      planName,
      planType,
      description,
      duration,
      toothSequence,
      totalPhases,
    } = body;

    if (!patientId || !planName || !planType) {
      return NextResponse.json(
        { error: "Patient ID, plan name, and type required" },
        { status: 400 },
      );
    }

    const plan = await prisma.treatmentPlan.create({
      data: {
        patientId,
        planName,
        planType,
        description: description || null,
        duration: duration || null,
        toothSequence: toothSequence ? JSON.stringify(toothSequence) : null,
        totalPhases: totalPhases || 1,
        status: "DRAFT",
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
