import React from 'react';
import { AtomicCharge, ThermoChemistry } from '../types';

export const ChargeTable: React.FC<{ title: string; charges: AtomicCharge[] }> = ({ title, charges }) => {
  if (charges.length === 0) return null;
  return (
    <div className="bg-white p-4 rounded shadow overflow-hidden">
        <h3 className="text-lg font-bold text-gray-700 mb-2">{title}</h3>
        <div className="max-h-60 overflow-y-auto">
            <table className="min-w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-4 py-2">Idx</th>
                        <th className="px-4 py-2">Atom</th>
                        <th className="px-4 py-2 text-right">Charge</th>
                    </tr>
                </thead>
                <tbody>
                    {charges.map((c, i) => (
                        <tr key={i} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-4 py-1">{c.atomIndex}</td>
                            <td className="px-4 py-1 font-medium text-gray-900">{c.element}</td>
                            <td className={`px-4 py-1 text-right font-mono ${c.charge > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {c.charge.toFixed(4)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export const ThermoTable: React.FC<{ thermo: ThermoChemistry }> = ({ thermo }) => {
    return (
        <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-bold text-gray-700 mb-2">Thermochemistry ({thermo.temperature} K)</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-2 bg-gray-50 rounded">
                    <span className="block text-gray-500 text-xs">Enthalpy (H)</span>
                    <span className="font-mono font-bold">{thermo.enthalpy.toFixed(6)} Eh</span>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                    <span className="block text-gray-500 text-xs">Entropy (S)</span>
                    <span className="font-mono font-bold">{thermo.entropy.toFixed(6)} Eh/K</span>
                </div>
                <div className="p-2 bg-gray-50 rounded col-span-2">
                    <span className="block text-gray-500 text-xs">Gibbs Free Energy (G)</span>
                    <span className="font-mono font-bold text-lg text-chem-600">{thermo.gibbsFreeEnergy.toFixed(6)} Eh</span>
                </div>
                 <div className="p-2 bg-gray-50 rounded col-span-2">
                    <span className="block text-gray-500 text-xs">Zero Point Energy</span>
                    <span className="font-mono font-bold">{thermo.zpe.toFixed(6)} Eh</span>
                </div>
            </div>
        </div>
    );
};
