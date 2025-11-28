
import React from 'react';
import { AtomicCharge, ThermoChemistry, SpinDensity, NMRShielding } from '../types';

// Utility to download CSV
const downloadCSV = (filename: string, header: string[], rows: (string | number)[][]) => {
    const csvContent = [
        header.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const TableHeader: React.FC<{ title: string; onExport: () => void }> = ({ title, onExport }) => (
    <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-gray-700">{title}</h3>
        <button 
            onClick={onExport}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded border border-gray-300 transition-colors"
        >
            Export CSV
        </button>
    </div>
);

export const ChargeTable: React.FC<{ title: string; charges: AtomicCharge[] }> = ({ title, charges }) => {
  if (charges.length === 0) return null;
  
  const handleExport = () => {
      const header = ['Index', 'Element', 'Charge'];
      const rows = charges.map(c => [c.atomIndex, c.element, c.charge]);
      downloadCSV(`${title.toLowerCase().replace(/\s+/g, '_')}.csv`, header, rows);
  };

  return (
    <div className="bg-white p-4 rounded shadow overflow-hidden">
        <TableHeader title={title} onExport={handleExport} />
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

export const SpinDensityTable: React.FC<{ title: string; densities: SpinDensity[] }> = ({ title, densities }) => {
    if (densities.length === 0) return null;

    const handleExport = () => {
        const header = ['Index', 'Element', 'Spin Density'];
        const rows = densities.map(c => [c.atomIndex, c.element, c.spin]);
        downloadCSV(`${title.toLowerCase().replace(/\s+/g, '_')}.csv`, header, rows);
    };

    return (
      <div className="bg-white p-4 rounded shadow overflow-hidden">
          <TableHeader title={title} onExport={handleExport} />
          <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full text-sm text-left text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                      <tr>
                          <th className="px-4 py-2">Idx</th>
                          <th className="px-4 py-2">Atom</th>
                          <th className="px-4 py-2 text-right">Spin</th>
                      </tr>
                  </thead>
                  <tbody>
                      {densities.map((c, i) => (
                          <tr key={i} className="bg-white border-b hover:bg-gray-50">
                              <td className="px-4 py-1">{c.atomIndex}</td>
                              <td className="px-4 py-1 font-medium text-gray-900">{c.element}</td>
                              <td className={`px-4 py-1 text-right font-mono ${Math.abs(c.spin) > 0.01 ? 'font-bold text-purple-600' : ''}`}>
                                  {c.spin.toFixed(4)}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    );
};

export const NMRTable: React.FC<{ shielding: NMRShielding[] }> = ({ shielding }) => {
    if (shielding.length === 0) return null;

    const handleExport = () => {
        const header = ['Index', 'Element', 'Isotropic', 'Anisotropy'];
        const rows = shielding.map(c => [c.atomIndex, c.element, c.isotropic, c.anisotropy]);
        downloadCSV('nmr_shielding.csv', header, rows);
    };

    return (
      <div className="bg-white p-4 rounded shadow overflow-hidden">
          <TableHeader title="NMR Chemical Shielding" onExport={handleExport} />
          <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full text-sm text-left text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                      <tr>
                          <th className="px-4 py-2">Idx</th>
                          <th className="px-4 py-2">Atom</th>
                          <th className="px-4 py-2 text-right">Iso (ppm)</th>
                          <th className="px-4 py-2 text-right">Aniso</th>
                      </tr>
                  </thead>
                  <tbody>
                      {shielding.map((c, i) => (
                          <tr key={i} className="bg-white border-b hover:bg-gray-50">
                              <td className="px-4 py-1">{c.atomIndex}</td>
                              <td className="px-4 py-1 font-medium text-gray-900">{c.element}</td>
                              <td className="px-4 py-1 text-right font-mono text-chem-700">
                                  {c.isotropic.toFixed(2)}
                              </td>
                              <td className="px-4 py-1 text-right font-mono text-gray-500">
                                  {c.anisotropy ? c.anisotropy.toFixed(2) : '-'}
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

export const DipoleTable: React.FC<{ dipole: { x: number; y: number; z: number; magnitude: number } }> = ({ dipole }) => {
    return (
        <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-bold text-gray-700 mb-2">Electric Properties</h3>
            <div className="text-sm">
                <div className="flex justify-between border-b py-2">
                    <span className="text-gray-500">Total Dipole Moment</span>
                    <span className="font-mono font-bold text-amber-600">{dipole.magnitude.toFixed(4)} Debye</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="text-center p-1 bg-gray-50 rounded">
                        <span className="text-xs text-gray-400 block">X</span>
                        <span className="font-mono">{dipole.x.toFixed(4)}</span>
                    </div>
                    <div className="text-center p-1 bg-gray-50 rounded">
                        <span className="text-xs text-gray-400 block">Y</span>
                        <span className="font-mono">{dipole.y.toFixed(4)}</span>
                    </div>
                    <div className="text-center p-1 bg-gray-50 rounded">
                        <span className="text-xs text-gray-400 block">Z</span>
                        <span className="font-mono">{dipole.z.toFixed(4)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
