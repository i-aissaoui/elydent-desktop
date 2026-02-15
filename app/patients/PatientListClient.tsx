"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, User } from "lucide-react";

type Patient = any; // Quick type

export default function PatientListClient({ initialPatients }: { initialPatients: Patient[] }) {
    const [filters, setFilters] = useState({
        name: "",
        phone: "",
        address: ""
    });

    const filteredPatients = initialPatients.filter((p: Patient) => {
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        const phone = p.phone.toLowerCase();
        const address = (p.address || "").toLowerCase();

        return (
            fullName.includes(filters.name.toLowerCase()) &&
            phone.includes(filters.phone.toLowerCase()) &&
            address.includes(filters.address.toLowerCase())
        );
    });

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
                    <p className="text-gray-500">Annuaire de la patientèle ({filteredPatients.length})</p>
                </div>
                <Link href="/" className="bg-primary hover:bg-purple-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Plus size={18} />
                    <span>Nouveau Patient</span>
                </Link>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                        <tr>
                            <th className="p-4 font-semibold w-1/3">
                                Nom Prénom
                                <div className="mt-2 relative">
                                    <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                                    <input
                                        placeholder="Filtrer nom..."
                                        className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:border-primary focus:outline-none"
                                        value={filters.name}
                                        onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                                    />
                                </div>
                            </th>
                            <th className="p-4 font-semibold w-1/4">
                                Téléphone
                                <div className="mt-2 relative">
                                    <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                                    <input
                                        placeholder="Filtrer tél..."
                                        className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:border-primary focus:outline-none"
                                        value={filters.phone}
                                        onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
                                    />
                                </div>
                            </th>
                            <th className="p-4 font-semibold w-1/4">
                                Adresse
                                <div className="mt-2 relative">
                                    <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                                    <input
                                        placeholder="Filtrer adresse..."
                                        className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:border-primary focus:outline-none"
                                        value={filters.address}
                                        onChange={(e) => setFilters({ ...filters, address: e.target.value })}
                                    />
                                </div>
                            </th>
                            <th className="p-4 font-semibold text-right">Dernière Visite</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredPatients.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-400">Aucun patient trouvé.</td>
                            </tr>
                        )}
                        {filteredPatients.map((patient: Patient) => (
                            <tr key={patient.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="p-4">
                                    <Link href={`/patients/${patient.id}`} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 text-primary flex items-center justify-center font-bold">
                                            {patient.firstName[0]}{patient.lastName[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 group-hover:text-primary transition-colors">
                                                {patient.firstName} {patient.lastName}
                                            </div>
                                            <div className="text-xs text-gray-400">Dossier #{patient.id.slice(-4)}</div>
                                        </div>
                                    </Link>
                                </td>
                                <td className="p-4 text-sm text-gray-600 font-mono">
                                    {patient.phone}
                                </td>
                                <td className="p-4 text-sm text-gray-600">
                                    {patient.address || "-"}
                                </td>
                                <td className="p-4 text-right text-sm text-gray-500">
                                    {new Date(patient.updatedAt).toLocaleDateString('fr-FR')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
