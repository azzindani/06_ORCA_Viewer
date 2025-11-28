
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Excitation } from '../types';

interface UVVisViewerProps {
  excitations: Excitation[];
}

// Gaussian broadening function
const gaussian = (x: number, x0: number, sigma: number) => {
    return Math.exp(-Math.pow(x - x0, 2) / (2 * Math.pow(sigma, 2)));
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 p-2 border border-gray-200 rounded shadow-lg text-xs backdrop-blur-sm">
                <p className="font-bold mb-1">{label} nm</p>
                <p className="text-violet-600">Intensity: {payload[0].value.toFixed(3)}</p>
            </div>
        );
    }
    return null;
};

export const UVVisViewer: React.FC<UVVisViewerProps> = ({ excitations }) => {
  const data = useMemo(() => {
    if (excitations.length === 0) return [];
    
    // Determine range
    const minWl = Math.max(0, Math.min(...excitations.map(e => e.wavelength)) - 50);
    const maxWl = Math.max(...excitations.map(e => e.wavelength)) + 100;
    const step = 1; 
    const sigma = 20; // Broadening width in nm (approx)

    const points = [];
    for (let wl = minWl; wl <= maxWl; wl += step) {
        let intensity = 0;
        excitations.forEach(exc => {
            intensity += exc.oscillatorStrength * gaussian(wl, exc.wavelength, sigma);
        });
        points.push({ wavelength: wl, intensity });
    }
    return points;
  }, [excitations]);

  if (excitations.length === 0) {
      return <div className="flex items-center justify-center h-64 text-gray-400">No UV-Vis excitation data found.</div>;
  }

  return (
    <div className="w-full h-96 bg-white p-4 rounded shadow">
      <h3 className="text-lg font-bold text-gray-700 mb-2">UV-Vis Spectrum (Simulated)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="wavelength" 
            label={{ value: 'Wavelength (nm)', position: 'insideBottomRight', offset: -5 }} 
            type="number" 
            domain={['dataMin', 'dataMax']}
          />
          <YAxis 
             label={{ value: 'Absorbance (arb. units)', angle: -90, position: 'insideLeft' }} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="intensity" stroke="#8b5cf6" fill="#a78bfa" fillOpacity={0.3} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
       <div className="mt-2 h-24 overflow-y-auto text-xs">
            <table className="w-full text-left text-gray-500">
                <thead className="bg-gray-50 text-gray-700 sticky top-0">
                    <tr>
                        <th className="px-2 py-1">State</th>
                        <th className="px-2 py-1">Energy (cm⁻¹)</th>
                        <th className="px-2 py-1">Wavelength (nm)</th>
                        <th className="px-2 py-1">f_osc</th>
                    </tr>
                </thead>
                <tbody>
                    {excitations.map(exc => (
                        <tr key={exc.state} className="border-b hover:bg-gray-50">
                            <td className="px-2 py-1">{exc.state}</td>
                            <td className="px-2 py-1">{exc.energyCm.toFixed(1)}</td>
                            <td className="px-2 py-1 font-semibold text-violet-600">{exc.wavelength.toFixed(1)}</td>
                            <td className="px-2 py-1">{exc.oscillatorStrength.toFixed(4)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
       </div>
    </div>
  );
};
