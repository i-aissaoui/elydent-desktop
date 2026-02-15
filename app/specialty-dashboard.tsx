"use client";

import { useState } from "react";
import { Calendar, Activity, TrendingUp } from "lucide-react";
import SyncPanel from "./components/SyncPanel";

const specialties = [
  {
    name: "Soin",
    color: "#FF6B6B",
    icon: "💊",
    description: "Soins généraux et restaurations",
    bgGradient: "from-red-50 to-red-100",
  },
  {
    name: "ODF",
    color: "#4ECDC4",
    icon: "🦷",
    description: "Orthodontologie et correction",
    bgGradient: "from-cyan-50 to-cyan-100",
  },
  {
    name: "Chirurgie",
    color: "#95E1D3",
    icon: "🔪",
    description: "Interventions chirurgicales",
    bgGradient: "from-emerald-50 to-emerald-100",
  },
  {
    name: "Proteges",
    color: "#FFE66D",
    icon: "🏆",
    description: "Prothèses dentaires",
    bgGradient: "from-yellow-50 to-yellow-100",
  },
];

interface DashboardStats {
  specialty: string;
  appointmentsToday: number;
  appointmentsUpcoming: number;
  totalRevenue: number;
  completedToday: number;
  averageCharge: number;
}

export default function SpecialtyDashboard({
  initialStats,
}: {
  initialStats?: DashboardStats[];
}) {
  const [stats] = useState<DashboardStats[]>(
    initialStats || [
      {
        specialty: "Soin",
        appointmentsToday: 8,
        appointmentsUpcoming: 12,
        totalRevenue: 47500,
        completedToday: 5,
        averageCharge: 914,
      },
      {
        specialty: "ODF",
        appointmentsToday: 6,
        appointmentsUpcoming: 9,
        totalRevenue: 52300,
        completedToday: 3,
        averageCharge: 1376,
      },
      {
        specialty: "Chirurgie",
        appointmentsToday: 4,
        appointmentsUpcoming: 7,
        totalRevenue: 38900,
        completedToday: 2,
        averageCharge: 1341,
      },
      {
        specialty: "Proteges",
        appointmentsToday: 5,
        appointmentsUpcoming: 8,
        totalRevenue: 22100,
        completedToday: 4,
        averageCharge: 713,
      },
    ],
  );

  const totalAppointments = stats.reduce(
    (acc, s) => acc + s.appointmentsToday,
    0,
  );
  const totalRevenue = stats.reduce((acc, s) => acc + s.totalRevenue, 0);

  return (
    <div className='space-y-10 max-w-7xl mx-auto px-4 py-10 min-h-screen'>
      {/* Hero Header */}
      <div className='mb-12'>
        <h1 className='text-6xl font-black text-gray-900 mb-3 tracking-tighter'>
          Tableauau de Bord Spécialisé
        </h1>
        <p className='text-xl text-gray-500 font-semibold'>
          Vue complète par spécialité dentaire avec rendez-vous et charges
        </p>
      </div>

      {/* Top Stats */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <div className='bg-linear-to-br from-[#9B2C3E] via-[#7A1F2E] to-[#5A5A5A] rounded-3xl p-8 text-white shadow-xl overflow-hidden relative'>
          <div className='absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20'></div>
          <div className='relative z-10'>
            <div className='flex items-center gap-4 mb-4'>
              <div className='p-3 bg-white/20 rounded-2xl'>
                <Calendar size={32} />
              </div>
              <span className='text-sm font-bold bg-white/20 px-4 py-2 rounded-full'>
                AUJOURD&apos;HUI
              </span>
            </div>
            <p className='text-5xl font-black mb-2 tracking-tighter'>
              {totalAppointments}
            </p>
            <p className='text-white/80 font-semibold'>
              Rendez-vous prévus aujourd&apos;hui
            </p>
          </div>
        </div>

        <div className='bg-linear-to-br from-[#D4AF37] via-[#E5C158] to-[#F5D86F] rounded-3xl p-8 text-white shadow-xl overflow-hidden relative'>
          <div className='absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20'></div>
          <div className='relative z-10'>
            <div className='flex items-center gap-4 mb-4'>
              <div className='p-3 bg-white/20 rounded-2xl'>
                <TrendingUp size={32} />
              </div>
              <span className='text-sm font-bold bg-white/20 px-4 py-2 rounded-full'>
                REVENUS
              </span>
            </div>
            <p className='text-5xl font-black mb-2 tracking-tighter'>
              {(totalRevenue / 1000).toFixed(1)}K
            </p>
            <p className='text-white/80 font-semibold'>Dinars Algériens (DA)</p>
          </div>
        </div>
      </div>

      {/* Specialty Cards - Beautiful Grid */}
      <div className='space-y-8'>
        <div className='flex items-center gap-3 mb-6'>
          <h2 className='text-3xl font-black text-gray-900'>💼 Spécialités</h2>
          <div className='flex-1 h-1.5 bg-linear-to-r from-[#9B2C3E] via-[#FF6B6B] to-[#FFE66D] rounded-full'></div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
          {stats.map((stat, idx) => {
            const specialty = specialties[idx];
            return (
              <div key={stat.specialty} className='relative group'>
                {/* Background gradient */}
                <div
                  className={`absolute -inset-0.5 bg-linear-to-r rounded-3xl blur opacity-30 group-hover:opacity-100 transition duration-1000`}
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${specialty.color}80, ${specialty.color}20)`,
                  }}
                ></div>

                {/* Card */}
                <div
                  className={`relative bg-linear-to-br ${specialty.bgGradient} rounded-3xl p-8 border-2`}
                  style={{ borderColor: specialty.color }}
                >
                  {/* Header */}
                  <div className='flex items-start justify-between mb-8'>
                    <div>
                      <div className='text-5xl mb-3'>{specialty.icon}</div>
                      <h3 className='text-3xl font-black text-gray-900 mb-1'>
                        {stat.specialty}
                      </h3>
                      <p className='text-sm text-gray-600 font-medium'>
                        {specialty.description}
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-2xl text-white text-2xl font-black`}
                      style={{ backgroundColor: specialty.color }}
                    >
                      {stat.appointmentsToday}+
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className='grid grid-cols-2 gap-4 mb-6'>
                    {/* Today's Appointments */}
                    <div className='bg-white/60 backdrop-blur rounded-2xl p-4 border border-white/40'>
                      <p className='text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2'>
                        Aujourd'hui
                      </p>
                      <p className='text-3xl font-black text-gray-900'>
                        {stat.appointmentsToday}
                      </p>
                      <p className='text-xs text-gray-600 font-semibold mt-2'>
                        Rendez-vous planifiés
                      </p>
                    </div>

                    {/* Upcoming */}
                    <div className='bg-white/60 backdrop-blur rounded-2xl p-4 border border-white/40'>
                      <p className='text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2'>
                        Cette semaine
                      </p>
                      <p className='text-3xl font-black text-gray-900'>
                        {stat.appointmentsUpcoming}
                      </p>
                      <p className='text-xs text-gray-600 font-semibold mt-2'>
                        Rendez-vous à venir
                      </p>
                    </div>

                    {/* Completed Today */}
                    <div className='bg-white/60 backdrop-blur rounded-2xl p-4 border border-white/40'>
                      <p className='text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2'>
                        Complétés
                      </p>
                      <p className='text-3xl font-black text-gray-900'>
                        {stat.completedToday}
                      </p>
                      <p className='text-xs text-gray-600 font-semibold mt-2'>
                        Aujourd&apos;hui
                      </p>
                    </div>

                    {/* Average Charge */}
                    <div className='bg-white/60 backdrop-blur rounded-2xl p-4 border border-white/40'>
                      <p className='text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2'>
                        Moyenne
                      </p>
                      <p className='text-2xl font-black text-gray-900'>
                        {stat.averageCharge}
                      </p>
                      <p className='text-xs text-gray-600 font-semibold mt-2'>
                        DA/Visite
                      </p>
                    </div>
                  </div>

                  {/* Revenue Bar */}
                  <div className='mb-6'>
                    <div className='flex justify-between items-center mb-3'>
                      <p className='text-sm font-black text-gray-700'>
                        Revenus générés
                      </p>
                      <p className='text-sm font-black text-gray-900'>
                        {(stat.totalRevenue / 1000).toFixed(1)}K DA
                      </p>
                    </div>
                    <div className='w-full h-6 bg-white/40 rounded-full overflow-hidden border border-white/60'>
                      <div
                        className='h-full transition-all duration-500 flex items-center justify-end pr-2 text-white font-black text-xs'
                        style={{
                          width: `${(stat.totalRevenue / totalRevenue) * 100}%`,
                          backgroundColor: specialty.color,
                        }}
                      >
                        {((stat.totalRevenue / totalRevenue) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className='flex gap-3 pt-6 border-t border-white/40'>
                    <button
                      className='flex-1 py-3 bg-white/80 hover:bg-white rounded-xl font-bold text-gray-800 transition-all transform hover:scale-105'
                      style={{
                        borderLeft: `4px solid ${specialty.color}`,
                      }}
                    >
                      Rendez-vous
                    </button>
                    <button
                      className='flex-1 py-3 text-white font-bold rounded-xl transition-all transform hover:scale-105'
                      style={{ backgroundColor: specialty.color }}
                    >
                      Détails →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Appointments Table */}
      <div className='bg-white rounded-3xl shadow-lg p-8 border-2 border-gray-100 overflow-hidden'>
        <h2 className='text-2xl font-black text-gray-900 mb-8 flex items-center gap-3'>
          <Activity size={32} className='text-[#9B2C3E]' /> Rendez-vous
          détaillés par spécialité
        </h2>

        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b-2 border-gray-200'>
                <th className='text-left py-4 px-6 font-black text-gray-700 text-xs uppercase tracking-widest'>
                  Spécialité
                </th>
                <th className='text-center py-4 px-6 font-black text-gray-700 text-xs uppercase tracking-widest'>
                  Aujourd'hui
                </th>
                <th className='text-center py-4 px-6 font-black text-gray-700 text-xs uppercase tracking-widest'>
                  Cette semaine
                </th>
                <th className='text-center py-4 px-6 font-black text-gray-700 text-xs uppercase tracking-widest'>
                  Complétés
                </th>
                <th className='text-right py-4 px-6 font-black text-gray-700 text-xs uppercase tracking-widest'>
                  Revenus
                </th>
                <th className='text-right py-4 px-6 font-black text-gray-700 text-xs uppercase tracking-widest'>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, idx) => {
                const specialty = specialties[idx];
                return (
                  <tr
                    key={stat.specialty}
                    className='border-b border-gray-100 hover:bg-gray-50/50 transition-colors'
                  >
                    <td className='py-6 px-6 font-bold text-gray-900 flex items-center gap-3'>
                      <span className='text-3xl'>{specialty.icon}</span>
                      <div>
                        <p className='font-black'>{stat.specialty}</p>
                        <p className='text-xs text-gray-500'>
                          {specialty.description}
                        </p>
                      </div>
                    </td>
                    <td className='text-center py-6 px-6'>
                      <div
                        className='inline-block px-4 py-2 rounded-full font-black text-white'
                        style={{ backgroundColor: specialty.color }}
                      >
                        {stat.appointmentsToday}
                      </div>
                    </td>
                    <td className='text-center py-6 px-6'>
                      <div className='text-lg font-black text-gray-900'>
                        {stat.appointmentsUpcoming}
                      </div>
                      <p className='text-xs text-gray-500'>prévus</p>
                    </td>
                    <td className='text-center py-6 px-6'>
                      <div className='text-lg font-black text-green-600'>
                        ✓ {stat.completedToday}
                      </div>
                    </td>
                    <td className='text-right py-6 px-6'>
                      <p className='text-lg font-black text-gray-900'>
                        {(stat.totalRevenue / 1000).toFixed(1)}K
                      </p>
                      <p className='text-xs text-gray-500'>DA</p>
                    </td>
                    <td className='text-right py-6 px-6'>
                      <button
                        className='px-4 py-2 rounded-xl font-bold text-sm text-white transition-all hover:shadow-lg'
                        style={{ backgroundColor: specialty.color }}
                      >
                        Voir →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
