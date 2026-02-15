import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface PatientData {
  nom: string;
  prenom: string;
  total: number;
  versement: number;
  reste: number;
}

function parseCSV(csvContent: string): PatientData[] {
  const lines = csvContent.trim().split("\n");
  const header = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return {
      nom: values[0],
      prenom: values[1],
      total: parseInt(values[2]) || 0,
      versement: parseInt(values[3]) || 0,
      reste: parseInt(values[4]) || 0,
    };
  });
}

async function seedPatientsFromCSV() {
  try {
    console.log("🦷 Starting ELYDENT patient data import...");

    // Read CSV file
    const csvPath = path.join(__dirname, "..", "seed-patient-data.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const patientsData = parseCSV(csvContent);

    console.log(`📊 Found ${patientsData.length} patients to import`);

    // Clear existing data (optional)
    await prisma.payment.deleteMany({});
    await prisma.visit.deleteMany({});
    await prisma.toothState.deleteMany({});
    await prisma.patient.deleteMany({});

    console.log("🗑️ Cleared existing data");

    // Import patients
    for (const patientData of patientsData) {
      // Generate a phone number (using index for uniqueness)
      const phoneNumber = `05${Math.random().toString().slice(2, 10)}`;

      // Create patient
      const patient = await prisma.patient.create({
        data: {
          firstName: patientData.prenom,
          lastName: patientData.nom,
          phone: phoneNumber,
          email: `${patientData.prenom.toLowerCase()}.${patientData.nom.toLowerCase()}@email.com`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create a visit if there's a total cost
      if (patientData.total > 0) {
        const visit = await prisma.visit.create({
          data: {
            patientId: patient.id,
            date: new Date(),
            treatment: "Consultation et Soins Dentaires",
            cost: patientData.total,
            paid: patientData.versement,
            status: patientData.reste <= 0 ? "COMPLETED" : "SCHEDULED",
            specialty: "Soin",
            sessionType: "Consultation",
            description: "Traitement dentaire général",
            notes: `Total: ${patientData.total} DA - Versé: ${patientData.versement} DA - Reste: ${patientData.reste} DA`,
          },
        });

        // Create payment record if there's a payment made
        if (patientData.versement > 0) {
          await prisma.payment.create({
            data: {
              visitId: visit.id,
              amount: patientData.versement,
              date: new Date(),
              paymentMethod: "Cash",
            },
          });
        }

        console.log(
          `✅ ${patient.firstName} ${patient.lastName} - ${patientData.total} DA (${patientData.versement} versé)`,
        );
      } else {
        console.log(
          `➕ ${patient.firstName} ${patient.lastName} - Nouveau patient`,
        );
      }
    }

    // Summary
    const totalPatients = await prisma.patient.count();
    const totalVisits = await prisma.visit.count();
    const totalPayments = await prisma.payment.count();

    console.log("\n🎉 Import completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - Patients: ${totalPatients}`);
    console.log(`   - Visits: ${totalVisits}`);
    console.log(`   - Payments: ${totalPayments}`);

    // Calculate totals
    const visits = await prisma.visit.findMany();
    const totalAmount = visits.reduce(
      (sum, visit) => sum + Number(visit.cost),
      0,
    );
    const paidAmount = visits.reduce(
      (sum, visit) => sum + Number(visit.paid),
      0,
    );
    const remainingAmount = totalAmount - paidAmount;

    console.log(`💰 Financial Summary:`);
    console.log(`   - Total Revenue: ${totalAmount.toLocaleString()} DA`);
    console.log(`   - Amount Paid: ${paidAmount.toLocaleString()} DA`);
    console.log(
      `   - Amount Remaining: ${remainingAmount.toLocaleString()} DA`,
    );
  } catch (error) {
    console.error("❌ Error during import:", error);
    throw error;
  }
}

async function main() {
  await seedPatientsFromCSV();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
