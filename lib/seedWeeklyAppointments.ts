import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

// Get dates for this week
function getWeekDates() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  const dates: Record<string, Date> = {};
  const daysOfWeek = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];

  for (let i = 0; i < 6; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates[daysOfWeek[i]] = date;
  }

  return dates;
}

const weekDates = getWeekDates();

// Sample patient names and data
const patientNames = [
  { firstName: "Ahmed", lastName: "Benjelloun" },
  { firstName: "Fatima", lastName: "Saidi" },
  { firstName: "Mohamed", lastName: "Berrahi" },
  { firstName: "Leila", lastName: "Kassem" },
  { firstName: "Hassan", lastName: "Karim" },
  { firstName: "Noor", lastName: "Lazaar" },
  { firstName: "Amina", lastName: "Boujemaa" },
  { firstName: "Karim", lastName: "Soudi" },
  { firstName: "Zahra", lastName: "Elouardi" },
  { firstName: "Ibrahim", lastName: "Qassem" },
];

const specialties = ["Soin", "ODF", "Chirurgie", "Proteges"];
const treatments = [
  "Consultation",
  "Détartrage",
  "Extraction Simple",
  "Dévitalisation",
  "Obturation",
  "Pose Appareil",
  "Maintenance Appareil",
  "Nettoyage Prothèse",
];

async function seedWeeklyAppointments() {
  console.log("🗑️  Clearing existing data...");

  // Delete in correct order
  await prisma.payment.deleteMany({});
  await prisma.operationHistory.deleteMany({});
  await prisma.visitHistory.deleteMany({});
  await prisma.procedureStep.deleteMany({});
  await prisma.operation.deleteMany({});
  await prisma.visit.deleteMany({});
  await prisma.toothState.deleteMany({});
  await prisma.surfaceMarking.deleteMany({});
  await prisma.toothAttachment.deleteMany({});
  await prisma.treatmentPlan.deleteMany({});
  await prisma.toothTransform.deleteMany({});
  await prisma.patient.deleteMany({});

  console.log("👥 Creating patients and appointments for this week...\n");

  let appointmentCount = 0;
  let totalCharged = 0;

  // Create patients with appointments throughout the week
  for (let i = 0; i < patientNames.length; i++) {
    const patientData = patientNames[i];

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        phone: `0654${String(Math.floor(Math.random() * 1000000)).padStart(
          6,
          "0",
        )}`,
        email: `${patientData.firstName.toLowerCase()}.${patientData.lastName.toLowerCase()}@patients.local`,
      },
    });

    // Create 2-4 appointments for this patient throughout the week
    const appointmentsPerPatient = Math.floor(Math.random() * 3) + 2;

    for (let j = 0; j < appointmentsPerPatient; j++) {
      // Pick random day
      const daysArray = Object.values(weekDates);
      const randomDay = daysArray[Math.floor(Math.random() * daysArray.length)];

      // Set different times
      const hour = 8 + Math.floor(Math.random() * 9); // 8 AM to 5 PM
      const minute = Math.random() > 0.5 ? 30 : 0;
      const appointmentDate = new Date(randomDay);
      appointmentDate.setHours(hour, minute, 0, 0);

      // Random specialty and treatment
      const specialty =
        specialties[Math.floor(Math.random() * specialties.length)];
      const treatment =
        treatments[Math.floor(Math.random() * treatments.length)];
      const cost = Math.floor(Math.random() * 80000) + 20000; // 20k to 100k DA

      // Create visit/appointment
      await prisma.visit.create({
        data: {
          patientId: patient.id,
          date: appointmentDate,
          treatment: treatment,
          cost: new Decimal(cost),
          paid: new Decimal(0),
          status: ["SCHEDULED", "WAITING", "IN_PROGRESS"][
            Math.floor(Math.random() * 3)
          ] as string,
          specialty: specialty,
          sessionType:
            specialty === "ODF"
              ? "Consultation Orthodontie"
              : specialty === "Chirurgie"
                ? "Extraction"
                : "Consultation",
          description: `Rendez-vous pour ${treatment}`,
        },
      });

      appointmentCount++;
      totalCharged += cost;

      console.log(
        `✅ [${appointmentCount}] ${patientData.firstName} ${patientData.lastName} - ${treatment} (${specialty}) - ${appointmentDate.toLocaleDateString("fr-FR", { weekday: "long", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} - ${cost.toLocaleString()} DA`,
      );
    }
  }

  console.log("\n🎉 Weekly appointments seed complete!");
  console.log(`📊 Total appointments created: ${appointmentCount}`);
  console.log(`💰 Total charged: ${totalCharged.toLocaleString()} DA`);
  console.log(`👥 Total patients: ${patientNames.length}`);
}

seedWeeklyAppointments()
  .catch((error) => {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
