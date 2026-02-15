import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  AlertCircle,
  CreditCard,
  Activity,
} from "lucide-react";
import { SidebarClient } from "./SidebarClient";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ELYDENT - Gestion Clinique Dentaire",
  description: "Plateforme complète de gestion de cabinet dentaire ELYDENT",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='fr'>
      <body
        className={`${inter.className} min-h-screen flex bg-gradient-to-br from-[#f5f7fa] via-[#ffffff] to-[#e8f0f7] text-foreground`}
      >
        {/* Sidebar */}
        <aside className='w-72 bg-gradient-to-b from-white via-[#fafbfc] to-[#f5f7fa] border-r-2 border-[#9B2C3E]/20 flex flex-col fixed h-full shadow-lg z-10'>
          {/* Logo Section */}
          <div className='p-6 bg-gradient-to-r from-[#9B2C3E] via-[#7A1F2E] to-[#5A5A5A] border-b-4 border-[#D4AF37]'>
            <div className='flex items-center gap-4'>
              <img
                src='/logo.png'
                alt='ELYDENT Logo'
                className='w-20 h-20 object-contain drop-shadow-lg flex-shrink-0 bg-white/10 rounded-xl p-1'
              />
              <div>
                <div className='text-xl font-black text-[#D4AF37] drop-shadow tracking-tight'>
                  ELYDENT
                </div>
                <p className='text-xs text-white/80 font-bold uppercase tracking-widest mt-0.5'>
                  Cabinet Dentaire
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className='flex-1 p-6 space-y-2 overflow-y-auto'>
            <SidebarClient />
          </nav>

          {/* Footer */}
          <div className='p-6 border-t-2 border-[#9B2C3E]/20 bg-gradient-to-t from-[#9B2C3E]/5 to-transparent'>
            <div className='flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-[#9B2C3E]/10 to-[#D4AF37]/10 shadow-sm border border-[#9B2C3E]/20'>
              <div className='w-12 h-12 rounded-full bg-gradient-to-br from-[#9B2C3E] to-[#D4AF37] flex items-center justify-center text-white font-black text-lg drop-shadow-lg'>
                E
              </div>
              <div className='text-sm'>
                <p className='font-black text-[#9B2C3E]'>ELYDENT</p>
                <p className='text-gray-500 text-xs font-bold uppercase tracking-widest'>
                  Dentaire Algérie
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className='flex-1 ml-72 p-10 overflow-auto'>{children}</main>
      </body>
    </html>
  );
}
