import { PrismaClient } from "@prisma/client";
import { addDays, format, startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function seedWeekData() {
  console.log("🌱 Seeding database with Feb 14-20 data...\n");

  // Delete existing data for this week (respecting foreign keys)
  await prisma.operation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.visitHistory.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.toothState.deleteMany();
  await prisma.toothTransform.deleteMany();
  await prisma.treatmentPlan.deleteMany();
  await prisma.surfaceMarking.deleteMany();
  await prisma.patient.deleteMany();

  const specialties = ["Soin", "ODF", "Chirurgie", "Proteges"];
  const treatments = [
    "Consultation",
    "Détartrage",
    "Extraction",
    "Obturation",
    "Détartrage",
    "Nettoyage Prothèse",
    "Pose Appareil",
  ];
  const patientNames = [
    { firstName: "Mohammed", lastName: "Ahmed" },
    { firstName: "Fatima", lastName: "Hassan" },
    { firstName: "Leila", lastName: "Kareem" },
    { firstName: "Ali", lastName: "Ibrahim" },
    { firstName: "Amira", lastName: "Zahra" },
    { firstName: "Omar", lastName: "Salim" },
    { firstName: "Noor", lastName: "Karim" },
    { firstName: "Samir", lastName: "Rashid" },
  ];

  let visitCount = 0;

  // Create patients and visits
  for (const patientName of patientNames) {
    const patient = await prisma.patient.create({
      data: {
        firstName: patientName.firstName,
        lastName: patientName.lastName,
        phone: `+213${Math.random().toString().slice(2, 11)}`,
        email: `${patientName.firstName.toLowerCase()}@example.com`,
      },
    });

    // Create 2-4 visits for each patient this week
    const visitCount_ = Math.floor(Math.random() * 3) + 2; // 2-4 visits

    for (let v = 0; v < visitCount_; v++) {
      const dayOffset = Math.floor(Math.random() * 7); // 0-6 days from today
      const hour = Math.floor(Math.random() * 10) + 8; // 8 AM - 6 PM
      const minute = [0, 30][Math.floor(Math.random() * 2)]; // On the hour or half hour

      const visitDate = new Date();
      visitDate.setDate(visitDate.getDate() + dayOffset);
      visitDate.setHours(hour, minute, 0, 0);

      const cost = Math.floor(Math.random() * 80000) + 20000; // 20k - 100k DA

      const visit = await prisma.visit.create({
        data: {
          patientId: patient.id,
          date: visitDate,
          specialty:
            specialties[Math.floor(Math.random() * specialties.length)],
          treatment: treatments[Math.floor(Math.random() * treatments.length)],
          description: `Online booking - ${treatments[Math.floor(Math.random() * treatments.length)]}`,
          status: ["SCHEDULED", "WAITING", "IN_PROGRESS", "COMPLETED"][
            Math.floor(Math.random() * 4)
          ],
          cost: cost,
          paid: Math.random() > 0.3 ? cost : 0,
        },
      });

      visitCount++;
      const dayName = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"][
        dayOffset
      ];
      const dateFormatted = format(visitDate, "MMM dd");
      console.log(
        `✓ ${patient.firstName} ${patient.lastName} - ${visit.treatment} (${dateFormatted} ${dayName}) - ${cost} DA`,
      );
    }
  }

  console.log(`\n✅ Seed complete!`);
  console.log(
    `📊 Created: ${patientNames.length} patients with ${visitCount} visits`,
  );
  console.log(`📅 Date range: Feb 14-20, 2026`);
}

seedWeekData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
