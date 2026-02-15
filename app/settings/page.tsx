"use client";

import { useEffect, useState } from "react";
import { Globe, RefreshCw, Check, AlertCircle, QrCode } from "lucide-react";
import jsPDF from "jspdf";
import QRCode from "qrcode";

export default function SettingsPage() {
  const STORAGE_KEY = "booking-portal-url";
  const DEFAULT_URL = "http://localhost:3001";

  const [portalUrl, setPortalUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
    setPortalUrl(saved);
  }, []);

  const handleTestAndSave = async () => {
    const normalized = portalUrl.trim();

    if (!normalized) {
      setMessage("Veuillez entrer une URL valide");
      setConnected(false);
      return;
    }

    try {
      new URL(normalized);
    } catch {
      setMessage("Format d'URL invalide (ex: http://localhost:3001)");
      setConnected(false);
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/sync?portal_url=${encodeURIComponent(normalized)}`,
        { cache: "no-store" },
      );
      const data = await response.json();

      if (response.ok && data.status === "connected") {
        localStorage.setItem(STORAGE_KEY, normalized);
        setConnected(true);
        setMessage("✓ Connexion réussie et URL sauvegardée");
      } else {
        setConnected(false);
        setMessage(data.error || "Portail inaccessible");
      }
    } catch {
      setConnected(false);
      setMessage("Impossible de tester la connexion");
    } finally {
      setIsLoading(false);
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

  const generateQrPosterPdf = async () => {
    const normalized = portalUrl.trim();
    if (!normalized) {
      setConnected(false);
      setMessage("Veuillez d'abord saisir une URL du portail");
      return;
    }

    try {
      new URL(normalized);
    } catch {
      setConnected(false);
      setMessage("URL invalide pour générer le QR code");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const qrDataUrl = await QRCode.toDataURL(normalized, {
        width: 900,
        margin: 1,
        color: { dark: "#111111", light: "#ffffff" },
      });

      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFillColor(242, 247, 250);
      pdf.rect(0, 0, pageWidth, 297, "F");

      pdf.setFillColor(155, 44, 62);
      pdf.rect(0, 0, pageWidth, 36, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text("ELYDENT", pageWidth / 2, 16, { align: "center" });
      pdf.setFontSize(12);
      pdf.text("Scannez pour prendre un rendez-vous", pageWidth / 2, 25, {
        align: "center",
      });

      const qrSize = 120;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 62;
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 6, 6, "F");
      pdf.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

      try {
        const logoDataUrl = await loadLogoDataUrl();
        const logoSize = 28;
        const logoX = pageWidth / 2 - logoSize / 2;
        const logoY = qrY + qrSize / 2 - logoSize / 2;
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(
          logoX - 3,
          logoY - 3,
          logoSize + 6,
          logoSize + 6,
          4,
          4,
          "F",
        );
        pdf.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
      } catch {
        // Continue without logo overlay
      }

      pdf.setTextColor(31, 41, 55);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text("Contacts", pageWidth / 2, 205, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text("Téléphone 1: 0560070080", pageWidth / 2, 216, {
        align: "center",
      });
      pdf.text("Téléphone 2: 0652355856", pageWidth / 2, 224, {
        align: "center",
      });
      pdf.text("Instagram: @elydent02", pageWidth / 2, 232, {
        align: "center",
      });

      pdf.setTextColor(75, 85, 99);
      pdf.setFontSize(10);
      pdf.text(normalized, pageWidth / 2, 255, { align: "center" });

      pdf.save("elydent-qr-poster.pdf");
      setConnected(true);
      setMessage("✓ Poster PDF généré avec QR code");
    } catch {
      setConnected(false);
      setMessage("Erreur lors de la génération du poster PDF");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='max-w-2xl mx-auto px-4 py-8'>
      <div className='bg-white rounded-2xl shadow border border-gray-200 p-6 space-y-4'>
        <h1 className='text-2xl font-black text-gray-900 flex items-center gap-2'>
          <Globe size={22} className='text-[#4ECDC4]' />
          Portail hébergé
        </h1>

        <div className='space-y-2'>
          <label className='text-sm font-bold text-gray-700'>
            URL du site hébergé
          </label>
          <input
            type='text'
            value={portalUrl}
            onChange={(e) => setPortalUrl(e.target.value)}
            placeholder='http://localhost:3001'
            className='w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-mono focus:border-[#4ECDC4] focus:outline-none'
          />
        </div>

        <button
          onClick={handleTestAndSave}
          disabled={isLoading}
          className='w-full py-3 bg-[#4ECDC4] text-white rounded-xl font-black hover:bg-[#38b2ac] transition disabled:opacity-60 flex items-center justify-center gap-2'
        >
          {isLoading ? (
            <>
              <RefreshCw size={18} className='animate-spin' />
              Test en cours...
            </>
          ) : (
            <>
              <Check size={18} />
              Tester & Sauvegarder
            </>
          )}
        </button>

        <button
          onClick={generateQrPosterPdf}
          disabled={isLoading}
          className='w-full py-3 bg-[#9B2C3E] text-white rounded-xl font-black hover:bg-[#7A1F2E] transition disabled:opacity-60 flex items-center justify-center gap-2'
        >
          <QrCode size={18} />
          Générer poster QR (PDF)
        </button>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
              connected
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            <AlertCircle size={16} />
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
