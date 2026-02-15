import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Clearing existing database...");
  await prisma.payment.deleteMany({});
  await prisma.operationHistory.deleteMany({});
  await prisma.visitHistory.deleteMany({});
  await prisma.procedureStep.deleteMany({});
  await prisma.operation.deleteMany({});
  await prisma.visit.deleteMany({});
  await prisma.toothState.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.procedureTemplate.deleteMany({});

  console.log("📚 Creating 5 Procedure Templates...");
  const templates = [
    await prisma.procedureTemplate.create({
      data: {
        name: "Composite Restoration - Class I",
        category: "Restoration",
        description: "Single surface occlusal restoration",
        estimatedDuration: 30,
        estimatedCost: new Decimal(3500),
        standardSteps: JSON.stringify([
          "Isolation",
          "Remove decay",
          "Prepare cavity",
          "Apply bonding",
          "Restore",
          "Cure and finish",
        ]),
        requiredMaterials: JSON.stringify([
          "Composite Resin",
          "Bonding Agent",
          "Rubber Dam",
        ]),
      },
    }),
    await prisma.procedureTemplate.create({
      data: {
        name: "Composite Restoration - Class II",
        category: "Restoration",
        description: "Two surface restoration",
        estimatedDuration: 45,
        estimatedCost: new Decimal(4500),
        standardSteps: JSON.stringify([
          "Isolation",
          "Remove decay",
          "Prepare cavity",
          "Place matrix",
          "Bonding",
          "Restore",
          "Polish",
        ]),
        requiredMaterials: JSON.stringify([
          "Composite Resin",
          "Bonding Agent",
          "Matrix band",
          "Rubber Dam",
        ]),
      },
    }),
    await prisma.procedureTemplate.create({
      data: {
        name: "Root Canal Treatment",
        category: "Endodontics",
        description: "Complete endodontic treatment",
        estimatedDuration: 90,
        estimatedCost: new Decimal(8000),
        standardSteps: JSON.stringify([
          "Access",
          "Instrumentation",
          "Irrigation",
          "Obturation",
          "Final restoration",
        ]),
        requiredMaterials: JSON.stringify(["Gutta-percha", "Sealer", "Files"]),
      },
    }),
    await prisma.procedureTemplate.create({
      data: {
        name: "Tooth Extraction",
        category: "Extraction",
        description: "Simple tooth extraction",
        estimatedDuration: 20,
        estimatedCost: new Decimal(4000),
        standardSteps: JSON.stringify([
          "Anesthesia",
          "Elevation",
          "Removal",
          "Hemostasis",
        ]),
        requiredMaterials: JSON.stringify(["Anesthetic", "Gauze", "Sutures"]),
      },
    }),
    await prisma.procedureTemplate.create({
      data: {
        name: "Scaling and Polishing",
        category: "Periodontics",
        description: "Professional cleaning",
        estimatedDuration: 40,
        estimatedCost: new Decimal(3500),
        standardSteps: JSON.stringify([
          "Inspection",
          "Scaling",
          "Polishing",
          "Fluoride",
        ]),
        requiredMaterials: JSON.stringify([
          "Scaler",
          "Polishing paste",
          "Fluoride",
        ]),
      },
    }),
  ];

  // Algerian names
  const maleFirstNames = [
    "Ahmed",
    "Mohamed",
    "Youcef",
    "Karim",
    "Amine",
    "Rachid",
    "Omar",
    "Yassine",
    "Mourad",
    "Hakim",
  ];

  const femaleFirstNames = [
    "Fatima",
    "Nadia",
    "Samira",
    "Lina",
    "Amina",
    "Sarah",
    "Ines",
    "Zohra",
    "Meriem",
    "Hanane",
  ];

  const lastNames = [
    "Benali",
    "Said",
    "Kaci",
    "Brahimi",
    "Mansouri",
    "Haddad",
    "Belkacem",
    "Bouaziz",
    "Taleb",
    "Slimani",
  ];

  const algerianCities = ["Alger", "Annaba", "Oran", "Constantine", "Blida"];

  const streetNames = [
    "Rue de la Liberté",
    "Avenue Frantz Fanon",
    "Boulevard Mohamed Ali",
    "Rue Didouche Mourad",
    "Avenue de l'Indépendance",
  ];

  const dentists = ["Dr. Ahmed Mohamed", "Dr. Fatima Zahra", "Dr. Youssef Ali"];

  const toothStates = [
    { status: "HEALTHY", teeth: [11, 12, 21, 22] },
    { status: "CARIES", teeth: [14, 15, 24, 25, 34, 35, 44, 45] },
    { status: "MISSING", teeth: [16, 17, 26, 27] },
    { status: "CROWN", teeth: [18, 28] },
  ];

  console.log("👥 Creating 120 Patients...");
  const patients = [];
  for (let i = 0; i < 120; i++) {
    const isFemale = Math.random() > 0.5;
    const firstName = isFemale
      ? femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)]
      : maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const city =
      algerianCities[Math.floor(Math.random() * algerianCities.length)];
    const street = streetNames[Math.floor(Math.random() * streetNames.length)];

    const patient = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        phone: `05${Math.floor(Math.random() * 100000000)}`.padEnd(11, "0"),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.dz`,
        address: `${Math.floor(Math.random() * 500) + 1} ${street}, ${city}`,
        gender: isFemale ? "Femme" : "Homme",
        birthDate: new Date(
          Math.random() * (2000 - 1950) + 1950,
          Math.random() * 12,
          Math.random() * 28,
        ),
        bloodType: ["A+", "O+", "B+", "AB+"][Math.floor(Math.random() * 4)],
        allergies: Math.random() > 0.8 ? "Pénicilline" : null,
        medicalHistory: Math.random() > 0.7 ? "Diabète" : null,
        currentMedications: Math.random() > 0.75 ? "Métformol" : null,
      },
    });
    patients.push(patient);

    // Add tooth states
    for (const group of toothStates) {
      for (const tooth of group.teeth) {
        await prisma.toothState.create({
          data: {
            patientId: patient.id,
            toothNumber: tooth,
            status: group.status,
          },
        });
      }
    }
  }

  console.log("📅 Creating visits with detailed operations...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let visitCount = 0;
  let operationCount = 0;
  let stepCount = 0;

  // Create 450+ visits across 21 days
  for (let dayOffset = -14; dayOffset <= 7; dayOffset++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + dayOffset);

    if (currentDate.getDay() === 5) continue; // Skip Fridays

    const dailyCount = 10 + Math.floor(Math.random() * 12);

    for (let v = 0; v < dailyCount; v++) {
      const patient = patients[Math.floor(Math.random() * patients.length)];
      const dentist = dentists[Math.floor(Math.random() * dentists.length)];

      let status = "SCHEDULED";
      const rand = Math.random();
      if (dayOffset < -1) {
        status = rand > 0.15 ? "COMPLETED" : "CANCELLED";
      } else if (dayOffset === 0) {
        if (rand > 0.6) status = "COMPLETED";
        else if (rand > 0.3) status = "WAITING";
        else status = "IN_PROGRESS";
      }

      const visit = await prisma.visit.create({
        data: {
          patientId: patient.id,
          date: currentDate,
          treatment: ["Soin", "ODF", "Chirurgie", "Proteges"][
            Math.floor(Math.random() * 4)
          ],
          specialty: ["Soin", "ODF", "Chirurgie", "Proteges"][
            Math.floor(Math.random() * 4)
          ],
          status: status as any,
          sessionType: ["Consultation", "Suivi", "Traitement"][
            Math.floor(Math.random() * 3)
          ],
          operatorName: dentist,
          order: v + 1,
        },
      });
      visitCount++;

      // Add operations for completed visits
      if (status === "COMPLETED") {
        const opCount = 1 + Math.floor(Math.random() * 3);

        for (let opIdx = 0; opIdx < opCount; opIdx++) {
          const template =
            templates[Math.floor(Math.random() * templates.length)];
          const affectedTeeth = [Math.floor(Math.random() * 48) + 11];

          const operation = await prisma.operation.create({
            data: {
              visitId: visit.id,
              procedureName: template.name,
              procedureCode: `${affectedTeeth[0]}${Math.floor(
                Math.random() * 10000,
              )
                .toString()
                .padStart(5, "0")}`,
              procedureCategory: template.category,
              affectedTeeth: JSON.stringify(affectedTeeth),
              surfaces: JSON.stringify(["O", "M"]),
              anesthesiaType: Math.random() > 0.4 ? "Local" : "None",
              anesthesiaAmount:
                Math.random() > 0.5 ? new Decimal(100) : new Decimal(50),
              status: "COMPLETED",
              startTime: new Date(
                currentDate.getTime() +
                  8 * 60 * 60 * 1000 +
                  Math.random() * 6 * 60 * 60 * 1000,
              ),
              endTime: new Date(
                currentDate.getTime() +
                  9 * 60 * 60 * 1000 +
                  Math.random() * 6 * 60 * 60 * 1000,
              ),
              materialsCost: new Decimal(
                Math.floor(Math.random() * 2000) + 500,
              ),
              laborCost: new Decimal(Math.floor(Math.random() * 4000) + 2000),
              totalCost: new Decimal(Math.floor(Math.random() * 6000) + 3000),
              postOpInstructions: "Avoid eating for 2 hours.",
              postOpMedication: Math.random() > 0.7 ? "Ibuprofen 400mg" : null,
            },
          });
          operationCount++;

          // Add procedure steps
          const stepNames = JSON.parse(
            template.standardSteps || "[]",
          ) as string[];
          for (let s = 0; s < stepNames.length; s++) {
            await prisma.procedureStep.create({
              data: {
                operationId: operation.id,
                stepNumber: s + 1,
                stepName: stepNames[s],
                status: "COMPLETED",
                startTime: new Date(
                  operation.startTime!.getTime() + s * 10 * 60 * 1000,
                ),
                endTime: new Date(
                  operation.startTime!.getTime() + (s + 1) * 10 * 60 * 1000,
                ),
                notes: "Completed",
              },
            });
            stepCount++;
          }

          // Add operation history
          await prisma.operationHistory.create({
            data: {
              operationId: operation.id,
              fieldChanged: "operation",
              changeType: "CREATED",
              newValue: JSON.stringify({
                procedureName: template.name,
                status: "COMPLETED",
              }),
              changedBy: dentist,
              reason: "Operation created",
            },
          });

          // Add complication (15% chance)
          if (Math.random() > 0.85) {
            await prisma.operation.update({
              where: { id: operation.id },
              data: {
                complicationsOccurred: true,
                complications: [
                  "Minor bleeding - controlled",
                  "Patient discomfort - additional anesthetic",
                  "Small fracture - refined",
                ][Math.floor(Math.random() * 3)],
              },
            });
          }

          // Set follow-up (20% chance)
          if (Math.random() > 0.8) {
            const followUpDate = new Date(currentDate);
            followUpDate.setDate(followUpDate.getDate() + 30);

            await prisma.operation.update({
              where: { id: operation.id },
              data: {
                followUpRequired: true,
                followUpDate,
                followUpReason: [
                  "Monitor sensitivity",
                  "Check healing",
                  "Verify occlusion",
                ][Math.floor(Math.random() * 3)],
              },
            });
          }
        }

        // Visit history
        await prisma.visitHistory.create({
          data: {
            visitId: visit.id,
            fieldChanged: "status",
            oldValue: "SCHEDULED",
            newValue: "COMPLETED",
            changeType: "STATUS_CHANGE",
            changedBy: dentist,
            reason: "Visit completed",
          },
        });

        // Add payment
        const amountDA = Math.floor(Math.random() * 15000) + 3000;
        const paid = amountDA * (0.5 + Math.random() * 0.5);

        await prisma.visit.update({
          where: { id: visit.id },
          data: {
            cost: new Decimal(amountDA),
            paid: new Decimal(Math.round(paid)),
            isFinalized: true,
            finalizedAt: new Date(),
            finalizedBy: dentist,
          },
        });

        if (paid > 0) {
          await prisma.payment.create({
            data: {
              visitId: visit.id,
              amount: new Decimal(Math.round(paid * 100) / 100),
              date: new Date(
                currentDate.getTime() + Math.random() * 24 * 60 * 60 * 1000,
              ),
              paymentMethod: ["Cash", "Card", "Transfer"][
                Math.floor(Math.random() * 3)
              ],
              note: "Payment recorded",
              recordedBy: dentist,
            },
          });
        }
      }
    }
  }

  console.log("\n✅ Database Seeding Complete!\n");
  console.log("📊 Summary:");
  console.log(`✓ 120 Patients created`);
  console.log(`✓ 480+ Tooth states`);
  console.log(`✓ ${visitCount} Visits`);
  console.log(`✓ ${operationCount} Operations`);
  console.log(`✓ ${stepCount} Procedure steps`);
  console.log(`✓ 5 Procedure templates`);
  console.log(`✓ Complete history & audit trails`);
  console.log(`✓ Payments & follow-ups`);
  console.log("\n🏥 System Ready!\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
