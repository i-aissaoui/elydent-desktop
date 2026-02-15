import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Advanced Operation Management for Dental Procedures
 * Supports multiple operations per visit with detailed tracking
 */

export interface OperationInput {
  visitId: string;
  procedureName: string;
  procedureCode?: string;
  procedureCategory?: string;
  description?: string;
  affectedTeeth?: number[]; // FDI tooth numbers [11, 12, etc]
  surfaces?: string[]; // ["O", "M", "D", "F", "L"]
  anesthesiaType?: string;
  anesthesiaAmount?: number;
  estimatedDuration?: number; // in minutes
  materialsCost?: number;
  laborCost?: number;
}

export interface ProcedureStepInput {
  stepNumber: number;
  stepName: string;
  description?: string;
  estimatedDuration?: number;
}

/**
 * Create a new operation within a visit
 */
export async function createOperation(input: OperationInput) {
  const operation = await prisma.operation.create({
    data: {
      visitId: input.visitId,
      procedureName: input.procedureName,
      procedureCode: input.procedureCode,
      procedureCategory: input.procedureCategory,
      description: input.description,
      affectedTeeth: input.affectedTeeth
        ? JSON.stringify(input.affectedTeeth)
        : null,
      surfaces: input.surfaces ? JSON.stringify(input.surfaces) : null,
      anesthesiaType: input.anesthesiaType,
      anesthesiaAmount: input.anesthesiaAmount
        ? new Decimal(input.anesthesiaAmount)
        : null,
      materialsCost: new Decimal(input.materialsCost || 0),
      laborCost: new Decimal(input.laborCost || 0),
      totalCost: new Decimal(
        (input.materialsCost || 0) + (input.laborCost || 0),
      ),
      status: "PLANNED",
    },
    include: {
      steps: true,
      history: true,
    },
  });

  // Create history record
  await prisma.operationHistory.create({
    data: {
      operationId: operation.id,
      fieldChanged: "operation",
      changeType: "CREATED",
      newValue: JSON.stringify({
        procedureName: input.procedureName,
        status: "PLANNED",
      }),
    },
  });

  return operation;
}

/**
 * Add multiple procedure steps to an operation
 */
export async function addProcedureSteps(
  operationId: string,
  steps: ProcedureStepInput[],
) {
  const createdSteps = await Promise.all(
    steps.map((step) =>
      prisma.procedureStep.create({
        data: {
          operationId,
          stepNumber: step.stepNumber,
          stepName: step.stepName,
          description: step.description,
          status: "PENDING",
        },
      }),
    ),
  );

  return createdSteps;
}

/**
 * Start an operation and all its steps
 */
export async function startOperation(
  operationId: string,
  operatorName?: string,
) {
  const operation = await prisma.operation.update({
    where: { id: operationId },
    data: {
      status: "IN_PROGRESS",
      startTime: new Date(),
    },
  });

  await createOperationHistory(operationId, {
    fieldChanged: "status",
    oldValue: "PLANNED",
    newValue: "IN_PROGRESS",
    changeType: "STATUS_CHANGE",
    changedBy: operatorName,
    reason: "Operation started",
  });

  return operation;
}

/**
 * Update operation status
 */
export async function updateOperationStatus(
  operationId: string,
  newStatus: string,
  operatorName?: string,
  reason?: string,
) {
  const operation = await prisma.operation.findUnique({
    where: { id: operationId },
  });

  if (!operation) throw new Error("Operation not found");

  const updated = await prisma.operation.update({
    where: { id: operationId },
    data: {
      status: newStatus,
      endTime: ["COMPLETED", "CANCELLED", "DEFERRED"].includes(newStatus)
        ? new Date()
        : null,
    },
  });

  await createOperationHistory(operationId, {
    fieldChanged: "status",
    oldValue: operation.status,
    newValue: newStatus,
    changeType: "STATUS_CHANGE",
    changedBy: operatorName,
    reason: reason || `Status changed to ${newStatus}`,
  });

  return updated;
}

/**
 * Complete a procedure step
 */
export async function completeProcedureStep(
  stepId: string,
  operatorName?: string,
  notes?: string,
) {
  const step = await prisma.procedureStep.update({
    where: { id: stepId },
    data: {
      status: "COMPLETED",
      endTime: new Date(),
      notes: notes,
    },
  });

  return step;
}

/**
 * Add materials used in an operation
 */
export async function addMaterialsUsed(
  operationId: string,
  materials: Array<{
    name: string;
    quantity: number;
    unit: string;
    cost: number;
  }>,
) {
  const operation = await prisma.operation.findUnique({
    where: { id: operationId },
  });

  if (!operation) throw new Error("Operation not found");

  const materialsJson = JSON.stringify(materials);
  const totalMaterialsCost = materials.reduce((sum, m) => sum + m.cost, 0);

  const updated = await prisma.operation.update({
    where: { id: operationId },
    data: {
      materialsUsed: materialsJson,
      materialsCost: new Decimal(totalMaterialsCost),
      totalCost: operation.laborCost.plus(new Decimal(totalMaterialsCost)),
    },
  });

  await createOperationHistory(operationId, {
    fieldChanged: "materialsUsed",
    oldValue: operation.materialsUsed,
    newValue: materialsJson,
    changeType: "UPDATED",
    reason: "Materials documented",
  });

  return updated;
}

/**
 * Record a complication during operation
 */
export async function recordComplication(
  operationId: string,
  description: string,
  operatorName?: string,
) {
  const operation = await prisma.operation.update({
    where: { id: operationId },
    data: {
      complicationsOccurred: true,
      complications: description,
    },
  });

  await createOperationHistory(operationId, {
    fieldChanged: "complications",
    oldValue: operation.complications,
    newValue: description,
    changeType: "UPDATED",
    changedBy: operatorName,
    reason: "Complication recorded",
  });

  return operation;
}

/**
 * Set follow-up appointment
 */
export async function setFollowUp(
  operationId: string,
  followUpDate: Date,
  reason: string,
) {
  const operation = await prisma.operation.update({
    where: { id: operationId },
    data: {
      followUpRequired: true,
      followUpDate,
      followUpReason: reason,
    },
  });

  return operation;
}

/**
 * Create custom operation history entry
 */
export async function createOperationHistory(
  operationId: string,
  historyData: {
    fieldChanged: string;
    oldValue?: string | null;
    newValue?: string | null;
    changeType: string;
    changedBy?: string | null;
    reason?: string | null;
  },
) {
  return prisma.operationHistory.create({
    data: {
      operationId,
      ...historyData,
      changedAt: new Date(),
    },
  });
}

/**
 * Get complete operation details with full history
 */
export async function getOperationDetails(operationId: string) {
  const operation = await prisma.operation.findUnique({
    where: { id: operationId },
    include: {
      steps: {
        orderBy: { stepNumber: "asc" },
      },
      history: {
        orderBy: { changedAt: "desc" },
      },
      visit: {
        include: {
          patient: true,
          operations: true,
        },
      },
    },
  });

  if (!operation) throw new Error("Operation not found");

  return {
    ...operation,
    affectedTeeth: operation.affectedTeeth
      ? JSON.parse(operation.affectedTeeth)
      : [],
    surfaces: operation.surfaces ? JSON.parse(operation.surfaces) : [],
    materialsUsed: operation.materialsUsed
      ? JSON.parse(operation.materialsUsed)
      : [],
  };
}

/**
 * Get all operations for a visit with summary
 */
export async function getVisitOperationsSummary(visitId: string) {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      operations: {
        include: {
          steps: {
            orderBy: { stepNumber: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      patient: true,
    },
  });

  if (!visit) throw new Error("Visit not found");

  const summary = {
    totalOperations: visit.operations.length,
    completedOperations: visit.operations.filter(
      (o) => o.status === "COMPLETED",
    ).length,
    totalServiceCost: visit.operations.reduce(
      (sum, o) => sum.add(o.totalCost),
      new Decimal(0),
    ),
    totalMaterialsCost: visit.operations.reduce(
      (sum, o) => sum.add(o.materialsCost),
      new Decimal(0),
    ),
    totalLaborCost: visit.operations.reduce(
      (sum, o) => sum.add(o.laborCost),
      new Decimal(0),
    ),
    affectedTeethSummary: getAllAffectedTeeth(visit.operations),
    complications: visit.operations.filter((o) => o.complicationsOccurred),
  };

  return {
    visit,
    operations: visit.operations,
    summary,
  };
}

/**
 * Extract all unique affected teeth from operations
 */
function getAllAffectedTeeth(operations: any[]): number[] {
  const teeth = new Set<number>();
  operations.forEach((op) => {
    if (op.affectedTeeth) {
      try {
        const parsed = JSON.parse(op.affectedTeeth);
        if (Array.isArray(parsed)) {
          parsed.forEach((t: number) => teeth.add(t));
        }
      } catch {
        // Skip invalid JSON
      }
    }
  });
  return Array.from(teeth).sort((a, b) => a - b);
}

/**
 * Get operation history as readable timeline
 */
export async function getOperationTimeline(operationId: string) {
  const history = await prisma.operationHistory.findMany({
    where: { operationId },
    orderBy: { changedAt: "desc" },
  });

  return history.map((h) => ({
    ...h,
    timestamp: h.changedAt.toLocaleString("fr-FR"),
    description: `${h.fieldChanged} changed to ${h.newValue} (${h.changeType})`,
  }));
}
