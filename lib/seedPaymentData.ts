import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

// Payment data from the spreadsheet
const patientPaymentData = [
  {
    lastName: "Aorfi",
    firstName: "Ouimaima",
    phone: "",
    total: 85000,
    paid: 42000,
  },
  {
    lastName: "Ali",
    firstName: "Zerraki",
    phone: "",
    total: 50000,
    paid: 24000,
  },
  {
    lastName: "Amou",
    firstName: "Ghofrane",
    phone: "",
    total: 50000,
    paid: 30000,
  },
  {
    lastName: "Abdelkrime",
    firstName: "Assena",
    phone: "",
    total: 45000,
    paid: 38000,
  },
  {
    lastName: "Achour",
    firstName: "Radja",
    phone: "",
    total: 80000,
    paid: 53000,
  },
  {
    lastName: "Abdelhaq",
    firstName: "Mehammed",
    phone: "",
    total: 80000,
    paid: 67000,
  },
  {
    lastName: "Aoufi",
    firstName: "Kaouther",
    phone: "",
    total: 60000,
    paid: 34000,
  },
  {
    lastName: "Amer",
    firstName: "Fatima Zahra",
    phone: "",
    total: 60000,
    paid: 39000,
  },
  {
    lastName: "Aboura",
    firstName: "Riadh",
    phone: "",
    total: 45000,
    paid: 25000,
  },
  {
    lastName: "Adjel",
    firstName: "Louay",
    phone: "",
    total: 40000,
    paid: 28000,
  },
  { lastName: "Atba", firstName: "Asma", phone: "", total: 90000, paid: 90000 },
  {
    lastName: "Amelsi",
    firstName: "Hadjer",
    phone: "",
    total: 40000,
    paid: 35000,
  },
  {
    lastName: "Aslaoni",
    firstName: "Majdeda",
    phone: "",
    total: 45000,
    paid: 42000,
  },
  {
    lastName: "Abad",
    firstName: "Hamane",
    phone: "",
    total: 30000,
    paid: 18000,
  },
  {
    lastName: "Alouani",
    firstName: "Ilyas",
    phone: "",
    total: 45000,
    paid: 25000,
  },
  {
    lastName: "Allam",
    firstName: "Hadil",
    phone: "",
    total: 75000,
    paid: 30000,
  },
  {
    lastName: "Meddah",
    firstName: "Player",
    phone: "",
    total: 75000,
    paid: 30000,
  },
  { lastName: "Abd", firstName: "Sarah", phone: "", total: 45000, paid: 29000 },
  {
    lastName: "Achour",
    firstName: "Raghed",
    phone: "",
    total: 45000,
    paid: 18000,
  },
  {
    lastName: "Abdoune",
    firstName: "Abdelwahed",
    phone: "",
    total: 50000,
    paid: 25500,
  },
  {
    lastName: "Adjili",
    firstName: "Djihad",
    phone: "",
    total: 90000,
    paid: 71000,
  },
  {
    lastName: "Abboub",
    firstName: "Serine",
    phone: "",
    total: 110000,
    paid: 36000,
  },
  {
    lastName: "Aissaoui",
    firstName: "Sara",
    phone: "",
    total: 40000,
    paid: 35000,
  },
  {
    lastName: "Achour",
    firstName: "Ishak",
    phone: "",
    total: 80000,
    paid: 44000,
  },
  {
    lastName: "Ababou",
    firstName: "Mohamed Islam",
    phone: "",
    total: 45000,
    paid: 25000,
  },
  {
    lastName: "Abdoune",
    firstName: "Charef Yousra",
    phone: "",
    total: 40000,
    paid: 35000,
  },
  {
    lastName: "Abdoun",
    firstName: "Soumia",
    phone: "",
    total: 55000,
    paid: 46000,
  },
  {
    lastName: "Amour",
    firstName: "Chahra Zed",
    phone: "",
    total: 70000,
    paid: 47000,
  },
  {
    lastName: "Abboub",
    firstName: "Ibrahim",
    phone: "",
    total: 90000,
    paid: 80000,
  },
  {
    lastName: "Abboura",
    firstName: "Ramzi",
    phone: "",
    total: 45000,
    paid: 45000,
  },
  {
    lastName: "Abrous",
    firstName: "Hadil",
    phone: "",
    total: 35000,
    paid: 30000,
  },
  {
    lastName: "Ameur",
    firstName: "Aida",
    phone: "",
    total: 80000,
    paid: 75000,
  },
  {
    lastName: "Ait Ziane",
    firstName: "Nasserine",
    phone: "",
    total: 90000,
    paid: 58000,
  },
  {
    lastName: "Allali",
    firstName: "Razika",
    phone: "",
    total: 40000,
    paid: 35000,
  },
  {
    lastName: "Amel",
    firstName: "Farah",
    phone: "",
    total: 70000,
    paid: 70000,
  },
  {
    lastName: "Assel",
    firstName: "Wiam",
    phone: "",
    total: 50000,
    paid: 50000,
  },
  {
    lastName: "Adjoudj",
    firstName: "El aid",
    phone: "",
    total: 40000,
    paid: 37000,
  },
  {
    lastName: "Aissaoui",
    firstName: "Ismail",
    phone: "",
    total: 80000,
    paid: 74000,
  },
  {
    lastName: "Abdelli",
    firstName: "Lilia",
    phone: "",
    total: 50000,
    paid: 41000,
  },
  {
    lastName: "Afradj",
    firstName: "Hind",
    phone: "",
    total: 45000,
    paid: 23000,
  },
  {
    lastName: "Abdoun",
    firstName: "Charef Yasmine",
    phone: "",
    total: 45000,
    paid: 33500,
  },
  {
    lastName: "Ali",
    firstName: "Haimouda Wafaa",
    phone: "",
    total: 45000,
    paid: 39500,
  },
  {
    lastName: "Ali",
    firstName: "Haimouda Chaima",
    phone: "",
    total: 45000,
    paid: 22000,
  },
  {
    lastName: "Abd",
    firstName: "Boumedine Hanaa",
    phone: "",
    total: 45000,
    paid: 36000,
  },
  {
    lastName: "Aboub",
    firstName: "Bouchra",
    phone: "",
    total: 80000,
    paid: 50000,
  },
  {
    lastName: "Abed",
    firstName: "Boumedine Amar",
    phone: "",
    total: 45000,
    paid: 40000,
  },
  {
    lastName: "Abbouch",
    firstName: "Yamina",
    phone: "",
    total: 40000,
    paid: 26000,
  },
  {
    lastName: "Ali",
    firstName: "Arous Hiba",
    phone: "",
    total: 45000,
    paid: 40500,
  },
  {
    lastName: "Amelsi",
    firstName: "Bouthaina",
    phone: "",
    total: 45000,
    paid: 36000,
  },
  {
    lastName: "Amrous",
    firstName: "Mayame",
    phone: "",
    total: 90000,
    paid: 55000,
  },
  {
    lastName: "Abdel",
    firstName: "Meriem Maissam",
    phone: "",
    total: 35000,
    paid: 29000,
  },
  {
    lastName: "Abboura",
    firstName: "Israa",
    phone: "",
    total: 40000,
    paid: 23000,
  },
  {
    lastName: "Abdesadouk",
    firstName: "Houssam",
    phone: "",
    total: 40000,
    paid: 4000,
  },
  {
    lastName: "Abdesadouk",
    firstName: "Soraya",
    phone: "",
    total: 45000,
    paid: 45000,
  },
  {
    lastName: "Aissa",
    firstName: "Beroudja Adem",
    phone: "",
    total: 50000,
    paid: 32000,
  },
  {
    lastName: "Adjadj",
    firstName: "Mohamed",
    phone: "",
    total: 80000,
    paid: 57500,
  },
  {
    lastName: "Abdelhaq",
    firstName: "Dalia",
    phone: "",
    total: 40000,
    paid: 18000,
  },
  {
    lastName: "Abdoune",
    firstName: "Charef Maissa",
    phone: "",
    total: 50000,
    paid: 16000,
  },
  {
    lastName: "Adjili",
    firstName: "Abdel Madjid",
    phone: "",
    total: 45000,
    paid: 45000,
  },
  {
    lastName: "Ayada",
    firstName: "Tasmine",
    phone: "",
    total: 45000,
    paid: 33000,
  },
  {
    lastName: "Alouache",
    firstName: "Samia",
    phone: "",
    total: 45000,
    paid: 15000,
  },
  { lastName: "Ameur", firstName: "Zakaria", phone: "", total: 7000, paid: 0 },
  {
    lastName: "Achab",
    firstName: "Abdellah",
    phone: "",
    total: 40000,
    paid: 29000,
  },
  {
    lastName: "Abbas",
    firstName: "Moussa Amina",
    phone: "",
    total: 50000,
    paid: 40000,
  },
  {
    lastName: "Amel",
    firstName: "Abderahmane",
    phone: "",
    total: 55000,
    paid: 20000,
  },
  { lastName: "Ameur", firstName: "Nadia", phone: "", total: 0, paid: 0 },
  { lastName: "Alagrari", firstName: "Alaa", phone: "", total: 2000, paid: 0 },
];

async function seedPaymentData() {
  console.log("🗑️  Clearing existing charges and patients...");

  // Delete in correct order (respecting foreign keys)
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

  console.log("👥 Seeding 67 patients with payment data...");

  let totalImported = 0;
  let totalCharges = 0;
  let totalPaid = 0;

  for (const patientData of patientPaymentData) {
    // Create patient
    const patient = await prisma.patient.create({
      data: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        phone: patientData.phone,
        email: `${patientData.firstName.toLowerCase().replace(/\s+/g, ".")}.${patientData.lastName.toLowerCase().replace(/\s+/g, ".")}@patients.local`,
      },
    });

    // Only create visit if there's a total charge
    if (patientData.total > 0) {
      await prisma.visit.create({
        data: {
          patientId: patient.id,
          date: new Date(),
          treatment: "Consultation et suivi",
          cost: new Decimal(patientData.total),
          paid: new Decimal(patientData.paid),
          status: "COMPLETED",
          specialty: "ODF",
          sessionType: "Consultation",
          description: `Reste à payer: ${patientData.total - patientData.paid} DA`,
        },
      });
    }

    totalImported++;
    totalCharges += patientData.total;
    totalPaid += patientData.paid;

    console.log(
      `✅ [${totalImported}/67] ${patientData.firstName} ${patientData.lastName} - Total: ${patientData.total} DA, Payé: ${patientData.paid} DA, Reste: ${patientData.total - patientData.paid} DA`,
    );
  }

  const totalRemaining = totalCharges - totalPaid;
  console.log("\n🎉 Payment data seed complete!");
  console.log(`📊 Total patients imported: ${totalImported}`);
  console.log(`💰 Total charged: ${totalCharges.toLocaleString()} DA`);
  console.log(`✅ Total paid: ${totalPaid.toLocaleString()} DA`);
  console.log(`⏳ Total remaining: ${totalRemaining.toLocaleString()} DA`);
}

seedPaymentData()
  .catch((error) => {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
