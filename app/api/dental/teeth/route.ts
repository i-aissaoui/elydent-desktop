import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all tooth transforms for a patient
export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID required" },
        { status: 400 },
      );
    }

    const transforms = await prisma.toothTransform.findMany({
      where: { patientId },
      include: { attachments: true },
      orderBy: { toothNumber: "asc" },
    });

    return NextResponse.json(transforms);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

// POST create or update tooth transforms
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patientId,
      toothNumber,
      positionX,
      positionY,
      positionZ,
      rotationX,
      rotationY,
      rotationZ,
      scale,
    } = body;

    if (!patientId || toothNumber === undefined) {
      return NextResponse.json(
        { error: "Patient ID and tooth number required" },
        { status: 400 },
      );
    }

    const transform = await prisma.toothTransform.upsert({
      where: {
        patientId_toothNumber: { patientId, toothNumber },
      },
      update: {
        positionX: positionX || 0,
        positionY: positionY || 0,
        positionZ: positionZ || 0,
        rotationX: rotationX || 0,
        rotationY: rotationY || 0,
        rotationZ: rotationZ || 0,
        scale: scale || 1.0,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        patientId,
        toothNumber,
        positionX: positionX || 0,
        positionY: positionY || 0,
        positionZ: positionZ || 0,
        rotationX: rotationX || 0,
        rotationY: rotationY || 0,
        rotationZ: rotationZ || 0,
        scale: scale || 1.0,
      },
      include: { attachments: true },
    });

    return NextResponse.json(transform);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
