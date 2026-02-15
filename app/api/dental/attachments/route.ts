import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET attachments for a tooth
export async function GET(request: NextRequest) {
  try {
    const transformId = request.nextUrl.searchParams.get("transformId");

    if (!transformId) {
      return NextResponse.json(
        { error: "Transform ID required" },
        { status: 400 },
      );
    }

    const attachments = await prisma.toothAttachment.findMany({
      where: { transformId },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

// POST add attachment to tooth
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      transformId,
      type,
      attachmentCode,
      material,
      color,
      archwireSlot,
      positionX,
      positionY,
      positionZ,
    } = body;

    if (!transformId || !type || !attachmentCode) {
      return NextResponse.json(
        { error: "Transform ID, type, and code required" },
        { status: 400 },
      );
    }

    const attachment = await prisma.toothAttachment.create({
      data: {
        transformId,
        type,
        attachmentCode,
        material: material || null,
        color: color || null,
        archwireSlot: archwireSlot || null,
        positionX: positionX || 0,
        positionY: positionY || 0,
        positionZ: positionZ || 0,
        isActive: true,
      },
    });

    return NextResponse.json(attachment);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
