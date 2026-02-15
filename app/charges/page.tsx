"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import jsPDF from "jspdf";
import { getChargesData } from "@/app/actions";

interface PatientCharge {
  patientId: string;
  firstName: string;
  lastName: string;
  phone: string;
  totalToPayment: number;
  totalReceived: number;
  balance: number;
  visits: {
    visitId: string;
    date: string;
    treatment: string;
    specialty: string;
    amount: number;
    paid: number;
    payments: {
      id: string;
      amount: number;
      date: string;
      paymentMethod?: string;
      note?: string;
    }[];
  }[];
  status: "paid" | "partial" | "pending";
}

export default function ChargesPage() {
  const [charges, setCharges] = useState<PatientCharge[]>([]);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "paid" | "partial" | "pending"
  >("all");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    // Load charges data from database
    const loadCharges = async () => {
      const data = await getChargesData();
      setCharges(data);
    };
    loadCharges();
  }, []);

  const filteredCharges = charges.filter((charge) => {
    const matchSearch =
      charge.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      charge.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      charge.phone.includes(searchQuery);
    const matchStatus =
      filterStatus === "all" || charge.status === filterStatus;
    const matchSpecialty =
      filterSpecialty === "all" ||
      charge.visits.some((v) => v.specialty === filterSpecialty);
    return matchSearch && matchStatus && matchSpecialty;
  });

  // Calculate totals based on filtered charges
  const totals = {
    totalPayment: filteredCharges.reduce((sum, c) => sum + c.totalToPayment, 0),
    totalReceived: filteredCharges.reduce((sum, c) => sum + c.totalReceived, 0),
    totalBalance: filteredCharges.reduce((sum, c) => sum + c.balance, 0),
  };

  const getStatusColor = (
    status: "paid" | "partial" | "pending",
  ): { bg: string; text: string; icon: React.ReactNode } => {
    switch (status) {
      case "paid":
        return {
          bg: "bg-green-50",
          text: "text-green-700",
          icon: <CheckCircle size={18} />,
        };
      case "partial":
        return {
          bg: "bg-yellow-50",
          text: "text-yellow-700",
          icon: <AlertCircle size={18} />,
        };
      case "pending":
        return {
          bg: "bg-red-50",
          text: "text-red-700",
          icon: <TrendingDown size={18} />,
        };
    }
  };

  const getStatusLabel = (status: "paid" | "partial" | "pending") => {
    switch (status) {
      case "paid":
        return "Payé";
      case "partial":
        return "Partiel";
      case "pending":
        return "En attente";
    }
  };

  const loadLogoDataUrl = () => {
    return new Promise<string>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () => reject(new Error("Logo image load failed"));
      image.src = "/logo.png";
    });
  };

  const getAllPaymentRows = () => {
    return charges.flatMap((patient) =>
      patient.visits.flatMap((visit) =>
        (visit.payments || []).map((payment) => ({
          patientName: `${patient.firstName} ${patient.lastName}`,
          phone: patient.phone,
          visitDate: visit.date,
          paymentDate: payment.date,
          treatment: visit.treatment,
          specialty: visit.specialty,
          amount: Number(payment.amount || 0),
          method: payment.paymentMethod || "",
          note: payment.note || "",
          totalDue: Number(patient.totalToPayment || 0),
          totalReceived: Number(patient.totalReceived || 0),
          balance: Number(patient.balance || 0),
        })),
      ),
    );
  };

  const getAllUsersTotalsRows = () => {
    return charges.map((patient) => ({
      patientName: `${patient.firstName} ${patient.lastName}`,
      phone: patient.phone,
      totalDue: Number(patient.totalToPayment || 0),
      totalReceived: Number(patient.totalReceived || 0),
      balance: Number(patient.balance || 0),
      status: patient.status,
    }));
  };

  const isSameDay = (isoDate: string, day: string) => {
    const date = new Date(isoDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return key === day;
  };

  const downloadExcelFromRows = (
    rows: ReturnType<typeof getAllPaymentRows>,
    fileName: string,
  ) => {
    const headers = [
      "Patient",
      "Téléphone",
      "Date visite",
      "Date versement",
      "Acte",
      "Spécialité",
      "Versement (DA)",
      "Mode",
      "Note",
      "Total dû patient (DA)",
      "Total versé patient (DA)",
      "Reste patient (DA)",
    ];

    const lines = [
      headers.join(";"),
      ...rows.map((row) =>
        [
          row.patientName,
          row.phone,
          new Date(row.visitDate).toLocaleDateString("fr-FR"),
          new Date(row.paymentDate).toLocaleDateString("fr-FR"),
          row.treatment,
          row.specialty,
          row.amount,
          row.method,
          row.note,
          row.totalDue,
          row.totalReceived,
          row.balance,
        ]
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(";"),
      ),
    ];

    const csv = lines.join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPaymentsHistoryExcel = () => {
    const rows = getAllPaymentRows();
    downloadExcelFromRows(rows, "archive-paiements-historique.xls");
  };

  const exportPaymentsDailyExcel = () => {
    const rows = getAllPaymentRows().filter((row) =>
      isSameDay(row.paymentDate, reportDate),
    );
    downloadExcelFromRows(rows, `archive-paiements-${reportDate}.xls`);
  };

  const exportAllUsersTotalsExcel = () => {
    const rows = getAllUsersTotalsRows();
    const headers = [
      "Patient",
      "Téléphone",
      "Total dû (DA)",
      "Total versé (DA)",
      "Reste (DA)",
      "Statut",
    ];

    const lines = [
      headers.join(";"),
      ...rows.map((row) =>
        [
          row.patientName,
          row.phone,
          row.totalDue,
          row.totalReceived,
          row.balance,
          row.status,
        ]
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(";"),
      ),
    ];

    const csv = lines.join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "archive-totaux-utilisateurs.xls";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPaymentsHistoryPdf = async () => {
    const rows = getAllPaymentRows();
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();

    try {
      const logoDataUrl = await loadLogoDataUrl();
      pdf.addImage(logoDataUrl, "PNG", 12, 10, 22, 22);
    } catch {
      // Continue without logo
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text("Archive Paiements - Historique complet", pageWidth / 2, 18, {
      align: "center",
    });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(
      `Date impression: ${new Date().toLocaleDateString("fr-FR")}`,
      12,
      36,
    );

    let y = 44;
    const drawHeader = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("Date", 12, y);
      pdf.text("Patient", 30, y);
      pdf.text("Acte", 80, y);
      pdf.text("Spéc.", 126, y);
      pdf.text("Mode", 144, y);
      pdf.text("Montant", pageWidth - 12, y, { align: "right" });
      y += 5;
      pdf.setDrawColor(180, 180, 180);
      pdf.line(12, y, pageWidth - 12, y);
      y += 4;
      pdf.setFont("helvetica", "normal");
    };

    drawHeader();
    if (rows.length === 0) {
      pdf.text("Aucun versement enregistré.", 12, y);
    } else {
      for (const row of rows) {
        if (y > 275) {
          pdf.addPage();
          y = 16;
          drawHeader();
        }
        const date = new Date(row.paymentDate).toLocaleDateString("fr-FR");
        pdf.text(date, 12, y);
        pdf.text(row.patientName.slice(0, 24), 30, y);
        pdf.text(row.treatment.slice(0, 24), 80, y);
        pdf.text((row.specialty || "-").slice(0, 8), 126, y);
        pdf.text((row.method || "-").slice(0, 8), 144, y);
        pdf.text(`${row.amount.toLocaleString()} DA`, pageWidth - 12, y, {
          align: "right",
        });
        y += 5;
      }
    }

    const total = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    y += 3;
    if (y > 275) {
      pdf.addPage();
      y = 20;
    }
    pdf.setDrawColor(180, 180, 180);
    pdf.line(12, y, pageWidth - 12, y);
    y += 7;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Total versements: ${total.toLocaleString()} DA`, 12, y);
    pdf.save("archive-paiements-historique.pdf");
  };

  const exportPaymentsDailyPdf = async () => {
    const rows = getAllPaymentRows().filter((row) =>
      isSameDay(row.paymentDate, reportDate),
    );
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();

    try {
      const logoDataUrl = await loadLogoDataUrl();
      pdf.addImage(logoDataUrl, "PNG", 12, 10, 22, 22);
    } catch {
      // Continue without logo
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text(`Archive Paiements - Journée ${reportDate}`, pageWidth / 2, 18, {
      align: "center",
    });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(
      `Date impression: ${new Date().toLocaleDateString("fr-FR")}`,
      12,
      36,
    );

    let y = 44;
    const drawHeader = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("Date", 12, y);
      pdf.text("Patient", 30, y);
      pdf.text("Acte", 80, y);
      pdf.text("Spéc.", 126, y);
      pdf.text("Mode", 144, y);
      pdf.text("Montant", pageWidth - 12, y, { align: "right" });
      y += 5;
      pdf.setDrawColor(180, 180, 180);
      pdf.line(12, y, pageWidth - 12, y);
      y += 4;
      pdf.setFont("helvetica", "normal");
    };

    drawHeader();
    if (rows.length === 0) {
      pdf.text("Aucun versement pour cette date.", 12, y);
    } else {
      for (const row of rows) {
        if (y > 275) {
          pdf.addPage();
          y = 16;
          drawHeader();
        }
        const date = new Date(row.paymentDate).toLocaleDateString("fr-FR");
        pdf.text(date, 12, y);
        pdf.text(row.patientName.slice(0, 24), 30, y);
        pdf.text(row.treatment.slice(0, 24), 80, y);
        pdf.text((row.specialty || "-").slice(0, 8), 126, y);
        pdf.text((row.method || "-").slice(0, 8), 144, y);
        pdf.text(`${row.amount.toLocaleString()} DA`, pageWidth - 12, y, {
          align: "right",
        });
        y += 5;
      }
    }

    const total = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    y += 3;
    if (y > 275) {
      pdf.addPage();
      y = 20;
    }
    pdf.setDrawColor(180, 180, 180);
    pdf.line(12, y, pageWidth - 12, y);
    y += 7;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Total versements: ${total.toLocaleString()} DA`, 12, y);
    pdf.save(`archive-paiements-${reportDate}.pdf`);
  };

  const exportAllUsersTotalsPdf = async () => {
    const rows = getAllUsersTotalsRows();
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();

    try {
      const logoDataUrl = await loadLogoDataUrl();
      pdf.addImage(logoDataUrl, "PNG", 12, 10, 22, 22);
    } catch {
      // Continue without logo
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text("Archive Totaux Utilisateurs (Global)", pageWidth / 2, 18, {
      align: "center",
    });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(
      `Date impression: ${new Date().toLocaleDateString("fr-FR")}`,
      12,
      36,
    );

    let y = 44;
    const drawHeader = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("Patient", 12, y);
      pdf.text("Téléphone", 68, y);
      pdf.text("Dû", 118, y);
      pdf.text("Versé", 144, y);
      pdf.text("Reste", pageWidth - 12, y, { align: "right" });
      y += 5;
      pdf.setDrawColor(180, 180, 180);
      pdf.line(12, y, pageWidth - 12, y);
      y += 4;
      pdf.setFont("helvetica", "normal");
    };

    drawHeader();
    if (rows.length === 0) {
      pdf.text("Aucun utilisateur.", 12, y);
    } else {
      for (const row of rows) {
        if (y > 275) {
          pdf.addPage();
          y = 16;
          drawHeader();
        }
        pdf.text(row.patientName.slice(0, 30), 12, y);
        pdf.text((row.phone || "-").slice(0, 14), 68, y);
        pdf.text(`${row.totalDue.toLocaleString()} DA`, 118, y);
        pdf.text(`${row.totalReceived.toLocaleString()} DA`, 144, y);
        pdf.text(`${row.balance.toLocaleString()} DA`, pageWidth - 12, y, {
          align: "right",
        });
        y += 5;
      }
    }

    const grandDue = rows.reduce((sum, r) => sum + r.totalDue, 0);
    const grandReceived = rows.reduce((sum, r) => sum + r.totalReceived, 0);
    const grandBalance = rows.reduce((sum, r) => sum + r.balance, 0);

    y += 3;
    if (y > 270) {
      pdf.addPage();
      y = 18;
    }
    pdf.setDrawColor(180, 180, 180);
    pdf.line(12, y, pageWidth - 12, y);
    y += 7;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Total dû global: ${grandDue.toLocaleString()} DA`, 12, y);
    y += 6;
    pdf.text(`Total versé global: ${grandReceived.toLocaleString()} DA`, 12, y);
    y += 6;
    pdf.text(`Reste global: ${grandBalance.toLocaleString()} DA`, 12, y);

    pdf.save("archive-totaux-utilisateurs.pdf");
  };

  const generateFacturePdf = async (patient: PatientCharge) => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();

    try {
      const logoDataUrl = await loadLogoDataUrl();
      pdf.addImage(logoDataUrl, "PNG", 12, 10, 25, 25);
    } catch {
      // Continue without logo
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Facture Patient", pageWidth / 2, 18, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(`Patient: ${patient.firstName} ${patient.lastName}`, 12, 42);
    pdf.text(`Téléphone: ${patient.phone}`, 12, 49);
    pdf.text(
      `Date d'édition: ${new Date().toLocaleDateString("fr-FR")}`,
      12,
      56,
    );

    pdf.setDrawColor(180, 180, 180);
    pdf.line(12, 61, pageWidth - 12, 61);

    pdf.setFont("helvetica", "bold");
    pdf.text("Date", 12, 69);
    pdf.text("Acte", 45, 69);
    pdf.text("Spécialité", 110, 69);
    pdf.text("Versment", pageWidth - 12, 69, { align: "right" });

    pdf.setFont("helvetica", "normal");
    let y = 76;
    const versments = patient.visits.flatMap((visit) =>
      (visit.payments || []).map((payment) => ({
        visit,
        payment,
      })),
    );

    if (versments.length === 0) {
      pdf.text("Aucun versment enregistré.", 12, y);
      y += 8;
    } else {
      versments.forEach(({ visit, payment }) => {
        const dateLabel = new Date(payment.date).toLocaleDateString("fr-FR");
        const amount = Number(payment.amount || 0);
        const treatment = String(visit.treatment || "-").slice(0, 28);
        const specialty = String(visit.specialty || "-").slice(0, 18);

        pdf.text(dateLabel, 12, y);
        pdf.text(treatment, 45, y);
        pdf.text(specialty, 110, y);
        pdf.text(`${amount.toLocaleString()} DA`, pageWidth - 12, y, {
          align: "right",
        });
        y += 7;

        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
      });
    }

    const totalVersments = versments.reduce(
      (sum, entry) => sum + Number(entry.payment.amount || 0),
      0,
    );
    const totalDue = Number(patient.totalToPayment || 0);
    const totalBalance = Number(patient.balance || 0);

    y += 4;
    pdf.setDrawColor(180, 180, 180);
    pdf.line(12, y, pageWidth - 12, y);
    y += 8;

    pdf.setFont("helvetica", "bold");
    pdf.text(`Total à percevoir: ${totalDue.toLocaleString()} DA`, 12, y);
    y += 7;
    pdf.text(`Total versé: ${totalVersments.toLocaleString()} DA`, 12, y);
    y += 7;
    pdf.text(`Reste: ${totalBalance.toLocaleString()} DA`, 12, y);

    const safeName = `${patient.firstName}-${patient.lastName}`.replace(
      /\s+/g,
      "-",
    );
    pdf.save(`facture-${safeName}.pdf`);
  };

  return (
    <div className='space-y-8 max-w-7xl mx-auto px-4 py-8'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-6xl font-black text-gray-900 mb-3'>
          💳 Gestion des Charges
        </h1>
        <p className='text-xl text-gray-600 font-semibold'>
          Suivi complet des paiements et soldes des patients
        </p>
        <div className='mt-4 flex flex-wrap items-end gap-3'>
          <button
            onClick={exportAllUsersTotalsPdf}
            title="Export global PDF: une ligne par patient (total dû, total versé, reste), sur tout l'historique, sans détail par versement ni filtre de date."
            className='px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 transition flex items-center gap-2'
          >
            <FileText size={16} />
            Totaux PDF (Tous les utilisateurs)
          </button>
          <button
            onClick={exportAllUsersTotalsExcel}
            title="Export global Excel: une ligne par patient (total dû, total versé, reste), sur tout l'historique, sans détail par versement ni filtre de date."
            className='px-4 py-2 rounded-xl bg-slate-600 text-white font-bold hover:bg-slate-700 transition flex items-center gap-2'
          >
            <FileSpreadsheet size={16} />
            Totaux Excel (Tous les utilisateurs)
          </button>
          <button
            onClick={exportPaymentsHistoryPdf}
            title='Archive PDF (historique complet): détail de tous les versements enregistrés (date, patient, acte, spécialité, mode, montant), toutes dates confondues.'
            className='px-4 py-2 rounded-xl bg-[#9B2C3E] text-white font-bold hover:bg-[#7A1F2E] transition flex items-center gap-2'
          >
            <FileText size={16} />
            Archive PDF (Historique)
          </button>
          <button
            onClick={exportPaymentsHistoryExcel}
            title='Archive Excel (historique complet): détail de tous les versements enregistrés (date, patient, acte, spécialité, mode, montant), toutes dates confondues.'
            className='px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition flex items-center gap-2'
          >
            <FileSpreadsheet size={16} />
            Archive Excel (Historique)
          </button>
          <div className='flex items-center gap-2'>
            <label className='text-sm font-bold text-gray-700'>Date:</label>
            <input
              type='date'
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              title='Date utilisée uniquement pour les exports journaliers (PDF Journalier / Excel Journalier).'
              className='px-3 py-2 border-2 border-gray-200 rounded-xl font-semibold'
            />
          </div>
          <button
            onClick={exportPaymentsDailyPdf}
            title='Export PDF journalier: détail des versements de la date sélectionnée uniquement.'
            className='px-4 py-2 rounded-xl bg-indigo-700 text-white font-bold hover:bg-indigo-800 transition flex items-center gap-2'
          >
            <FileText size={16} />
            PDF Journalier
          </button>
          <button
            onClick={exportPaymentsDailyExcel}
            title='Export Excel journalier: détail des versements de la date sélectionnée uniquement.'
            className='px-4 py-2 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800 transition flex items-center gap-2'
          >
            <FileSpreadsheet size={16} />
            Excel Journalier
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Total Payment */}
        <div className='bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 border-2 border-blue-200 shadow-lg'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-4 bg-white rounded-2xl'>
              <DollarSign size={32} className='text-blue-600' />
            </div>
            <span className='text-sm font-black text-blue-600 badge bg-white px-4 py-2 rounded-full'>
              À PERCEVOIR
            </span>
          </div>
          <p className='text-5xl font-black text-gray-900 mb-2'>
            {Number(totals.totalPayment).toLocaleString()}
          </p>
          <p className='text-gray-600 font-semibold'>DA</p>
        </div>

        {/* Total Received */}
        <div className='bg-gradient-to-br from-green-50 to-emerald-100 rounded-3xl p-8 border-2 border-green-200 shadow-lg'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-4 bg-white rounded-2xl'>
              <TrendingUp size={32} className='text-green-600' />
            </div>
            <span className='text-sm font-black text-green-600 badge bg-white px-4 py-2 rounded-full'>
              REÇU
            </span>
          </div>
          <p className='text-5xl font-black text-gray-900 mb-2'>
            {Number(totals.totalReceived).toLocaleString()}
          </p>
          <p className='text-gray-600 font-semibold'>
            {totals.totalPayment > 0
              ? ((totals.totalReceived / totals.totalPayment) * 100).toFixed(0)
              : 0}
            % collectés
          </p>
        </div>

        {/* Balance */}
        <div className='bg-gradient-to-br from-orange-50 to-red-100 rounded-3xl p-8 border-2 border-orange-200 shadow-lg'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-4 bg-white rounded-2xl'>
              <AlertCircle size={32} className='text-orange-600' />
            </div>
            <span className='text-sm font-black text-orange-600 badge bg-white px-4 py-2 rounded-full'>
              À RECOUVRER
            </span>
          </div>
          <p className='text-5xl font-black text-gray-900 mb-2'>
            {Number(totals.totalBalance).toLocaleString()}
          </p>
          <p className='text-gray-600 font-semibold'>DA</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4'>
        <div className='flex flex-col gap-4'>
          {/* Search */}
          <div>
            <input
              type='text'
              placeholder='Rechercher par nom ou téléphone...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all'
            />
          </div>

          {/* Specialty Filter */}
          <div>
            <label className='block text-sm font-bold text-gray-700 mb-2'>
              Filtrer par Spécialité
            </label>
            <div className='flex flex-wrap gap-2'>
              {["all", "Soin", "ODF", "Chirurgie", "Proteges"].map(
                (specialty) => (
                  <button
                    key={specialty}
                    onClick={() => setFilterSpecialty(specialty)}
                    className={`px-4 py-3 rounded-xl font-bold transition-all ${
                      filterSpecialty === specialty
                        ? "bg-purple-600 text-white shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {specialty === "all" ? "Tous les Services" : specialty}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className='block text-sm font-bold text-gray-700 mb-2'>
              Filtrer par Statut du Paiement
            </label>
            <div className='flex flex-wrap gap-2'>
              {["all", "paid", "partial", "pending"].map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    setFilterStatus(
                      status as "all" | "paid" | "partial" | "pending",
                    )
                  }
                  className={`px-4 py-3 rounded-xl font-bold transition-all ${
                    filterStatus === status
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status === "all" && "Tous"}
                  {status === "paid" && "Payés"}
                  {status === "partial" && "Partiels"}
                  {status === "pending" && "En attente"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div className='space-y-4'>
        {filteredCharges.length === 0 ? (
          <div className='text-center py-16 bg-gray-50 rounded-3xl'>
            <Users size={64} className='mx-auto text-gray-300 mb-4' />
            <p className='text-gray-600 font-bold text-lg'>
              Aucun patient trouvé
            </p>
          </div>
        ) : (
          filteredCharges.map((patient) => {
            const statusColor = getStatusColor(patient.status);
            const isExpanded = expandedPatient === patient.patientId;

            return (
              <div
                key={patient.patientId}
                className='bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden hover:shadow-md transition-all'
              >
                {/* Header */}
                <button
                  onClick={() =>
                    setExpandedPatient(isExpanded ? null : patient.patientId)
                  }
                  className='w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors'
                >
                  <div className='flex-1 text-left space-y-2'>
                    <div className='flex items-center gap-4'>
                      <h3 className='text-xl font-black text-gray-900'>
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <span
                        className={`${statusColor.bg} ${statusColor.text} px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-2`}
                      >
                        {statusColor.icon}
                        {getStatusLabel(patient.status)}
                      </span>
                    </div>
                    <p className='text-gray-600 font-semibold'>
                      📱 {patient.phone}
                    </p>
                  </div>

                  {/* Summary Right Side */}
                  <div className='flex items-center gap-12 ml-4'>
                    <div className='text-right'>
                      <p className='text-xs font-bold text-gray-500 uppercase'>
                        À Percevoir
                      </p>
                      <p className='text-2xl font-black text-gray-900'>
                        {Number(patient.totalToPayment).toLocaleString()} DA
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-xs font-bold text-gray-500 uppercase'>
                        Reçu
                      </p>
                      <p className='text-2xl font-black text-green-600'>
                        {Number(patient.totalReceived).toLocaleString()} DA
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-xs font-bold text-gray-500 uppercase'>
                        Solde / Reste
                      </p>
                      <div className='flex items-center justify-end gap-2 mt-2'>
                        <p
                          className={`text-2xl font-black ${
                            patient.balance === 0
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          {Number(patient.balance).toLocaleString()} DA
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='p-2 hover:bg-gray-200 rounded-lg transition-colors pointer-events-none'>
                    {isExpanded ? (
                      <ChevronUp size={24} className='text-gray-600' />
                    ) : (
                      <ChevronDown size={24} className='text-gray-600' />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className='border-t-2 border-gray-200 bg-gray-50 p-6'>
                    <div className='flex items-center justify-between gap-4 mb-4'>
                      <h4 className='text-lg font-black text-gray-900'>
                        Détails des Visites par Spécialité
                      </h4>
                      <button
                        onClick={() => generateFacturePdf(patient)}
                        className='px-4 py-2 rounded-xl bg-[#9B2C3E] text-white font-bold hover:bg-[#7A1F2E] transition flex items-center gap-2'
                      >
                        <FileText size={16} />
                        Facture PDF
                      </button>
                    </div>
                    {(() => {
                      const visitsBySpecialty: {
                        [key: string]: typeof patient.visits;
                      } = {};
                      patient.visits.forEach((visit) => {
                        const specialty = visit.specialty || "Général";
                        // Only include visits matching the selected specialty filter
                        if (
                          filterSpecialty === "all" ||
                          specialty === filterSpecialty
                        ) {
                          if (!visitsBySpecialty[specialty]) {
                            visitsBySpecialty[specialty] = [];
                          }
                          visitsBySpecialty[specialty].push(visit);
                        }
                      });

                      return (
                        <div className='space-y-6'>
                          {Object.entries(visitsBySpecialty).length === 0 ? (
                            <div className='text-center py-8 text-gray-500'>
                              <p className='font-semibold'>
                                Aucune visite pour cette spécialité
                              </p>
                            </div>
                          ) : (
                            Object.entries(visitsBySpecialty).map(
                              ([specialty, visits]) => (
                                <div
                                  key={specialty}
                                  className='bg-white p-4 rounded-xl border-2 border-gray-200'
                                >
                                  <h5 className='font-black text-gray-900 mb-3 flex items-center gap-2'>
                                    <span className='px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm'>
                                      {specialty}
                                    </span>
                                    <span className='text-gray-500 text-sm font-bold'>
                                      ({visits.length} visite
                                      {visits.length > 1 ? "s" : ""})
                                    </span>
                                  </h5>
                                  <div className='space-y-2'>
                                    {visits.map((visit, vidx) => {
                                      const visitBalance =
                                        visit.amount - visit.paid;
                                      return (
                                        <div
                                          key={vidx}
                                          className='bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between'
                                        >
                                          <div className='flex-1'>
                                            <p className='font-bold text-gray-900'>
                                              {visit.treatment}
                                            </p>
                                            <p className='text-xs text-gray-600'>
                                              📅{" "}
                                              {new Date(
                                                visit.date,
                                              ).toLocaleDateString("fr-FR")}
                                            </p>
                                          </div>
                                          <div className='flex items-center gap-6 ml-4'>
                                            <div className='text-right'>
                                              <p className='text-xs font-bold text-gray-500 uppercase'>
                                                Montant
                                              </p>
                                              <p className='font-black text-gray-900'>
                                                {Number(
                                                  visit.amount,
                                                ).toLocaleString()}{" "}
                                                DA
                                              </p>
                                            </div>
                                            <div className='text-right'>
                                              <p className='text-xs font-bold text-gray-500 uppercase'>
                                                Payé
                                              </p>
                                              <p
                                                className={`font-black ${visit.paid > 0 ? "text-green-600" : "text-red-600"}`}
                                              >
                                                {Number(
                                                  visit.paid,
                                                ).toLocaleString()}{" "}
                                                DA
                                              </p>
                                            </div>
                                            <div className='text-right'>
                                              <p className='text-xs font-bold text-gray-500 uppercase'>
                                                Reste
                                              </p>
                                              <p
                                                className={`font-black ${visitBalance === 0 ? "text-green-600" : "text-orange-600"}`}
                                              >
                                                {Number(
                                                  visitBalance,
                                                ).toLocaleString()}{" "}
                                                DA
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {(() => {
                                    const subtotal = visits.reduce(
                                      (sum, v) => sum + v.amount,
                                      0,
                                    );
                                    const subtotalPaid = visits.reduce(
                                      (sum, v) => sum + v.paid,
                                      0,
                                    );
                                    const subtotalBalance =
                                      subtotal - subtotalPaid;
                                    return (
                                      <div className='mt-3 pt-3 border-t-2 border-gray-200 flex justify-end gap-6 font-black text-sm'>
                                        <div className='text-right'>
                                          <p className='text-gray-500'>
                                            Sous-total:
                                          </p>
                                          <p className='text-gray-900'>
                                            {Number(subtotal).toLocaleString()}{" "}
                                            DA
                                          </p>
                                        </div>
                                        <div className='text-right'>
                                          <p className='text-gray-500'>
                                            Versé:
                                          </p>
                                          <p className='text-green-600'>
                                            {Number(
                                              subtotalPaid,
                                            ).toLocaleString()}{" "}
                                            DA
                                          </p>
                                        </div>
                                        <div className='text-right'>
                                          <p className='text-gray-500'>
                                            Solde:
                                          </p>
                                          <p
                                            className={
                                              subtotalBalance === 0
                                                ? "text-green-600"
                                                : "text-orange-600"
                                            }
                                          >
                                            {Number(
                                              subtotalBalance,
                                            ).toLocaleString()}{" "}
                                            DA
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              ),
                            )
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
