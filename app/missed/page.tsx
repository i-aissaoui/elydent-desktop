"use client";

import { useEffect, useState } from "react";
import { autoMarkMissedVisits, getMissedVisits } from "@/app/actions";
import { Phone, Calendar, User, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function MissedAppointmentsPage() {
    const [missedVisits, setMissedVisits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        await autoMarkMissedVisits();
        const data = await getMissedVisits();
        setMissedVisits(data);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Relance Clients</h1>
                    <p className="text-gray-500 font-medium tracking-tight">Gérez les rendez-vous manqués et re-contactez vos patients.</p>
                </div>
                <button
                    onClick={loadData}
                    className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-all text-gray-500"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            {missedVisits.length === 0 ? (
                <div className="bg-white p-20 rounded-[2.5rem] border border-gray-100 shadow-sm text-center space-y-4">
                    <div className="inline-flex p-6 bg-green-50 text-green-500 rounded-full">
                        <User size={48} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">Tout est à jour !</h2>
                    <p className="text-gray-500 max-w-md mx-auto">Aucun rendez-vous manqué n'a été détecté. Vos patients sont assidus !</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {missedVisits.map((visit) => (
                        <div key={visit.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <span className="bg-red-50 text-red-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Manqué</span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-primary font-black text-lg">
                                        {visit.patient.firstName[0]}{visit.patient.lastName[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-gray-900 line-clamp-1">{visit.patient.firstName} {visit.patient.lastName}</h3>
                                        <div className="flex items-center gap-1 text-gray-400 text-xs font-bold uppercase tracking-tighter">
                                            <Calendar size={12} />
                                            {new Date(visit.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Phone size={10} /> Contacts Disponibles
                                    </p>
                                    <div className="space-y-2">
                                        {/* Main Number */}
                                        <div className="flex items-center justify-between group/contact">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Principal</span>
                                                <span className="text-sm font-black text-gray-700">{visit.patient.phone}</span>
                                            </div>
                                        </div>

                                        {/* Additional Contacts */}
                                        {(() => {
                                            try {
                                                const extra = visit.patient.contacts ? JSON.parse(visit.patient.contacts) : [];
                                                return extra.map((c: any, i: number) => (
                                                    <div key={i} className="flex items-center justify-between group/contact border-t border-gray-100 pt-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">{c.label || "Additionnel"}</span>
                                                            <span className="text-sm font-black text-gray-700">{c.phone}</span>
                                                        </div>
                                                    </div>
                                                ));
                                            } catch { return null; }
                                        })()}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Soin Prévu</p>
                                    <p className="font-bold text-gray-700 text-sm line-clamp-1">{visit.treatment}</p>
                                </div>

                                <div className="pt-2">
                                    <Link
                                        href={`/patients/${visit.patient.id}?tab=planning`}
                                        className="w-full bg-white border border-gray-100 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-50 transition-all text-gray-600 shadow-sm"
                                    >
                                        Re-planifier le rendez-vous <ArrowRight size={12} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
