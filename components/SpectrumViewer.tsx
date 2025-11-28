import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Vibration } from '../types';

interface SpectrumViewerProps {
  vibrations: Vibration[];
}

// Lorentzian function for broadening
const lorentzian = (x: number, x0: number, gamma: number) => {
    return (1 / Math.PI) * (gamma / (Math.pow(x - x0, 2) + Math.pow(gamma, 2)));
};

export const SpectrumViewer: React.FC<SpectrumViewerProps> = ({ vibrations }) => {
  
  const data = useMemo(() => {
    if (vibrations.length === 0) return [];
    
    const minFreq = 0;
    const maxFreq = Math.max(...vibrations.map(v => v.frequency)) + 500;
    const step = 5; // cm^-1 resolution
    const gamma = 20; // FWHM roughly 2*gamma

    const points = [];
    for (let freq = maxFreq; freq >= minFreq; freq -= step) {
        let intensity = 0;
        vibrations.forEach(vib => {
            // Scale Lorentzian by calculated intensity
            intensity += vib.intensity * lorentzian(freq, vib.frequency, gamma);
        });
        points.push({ frequency: freq, intensity });
    }
    return points;
  }, [vibrations]);

  if (vibrations.length === 0) {
      return <div className="flex items-center justify-center h-64 text-gray-400">No vibrational data found.</div>;
  }

  return (
    <div className="w-full h-96 bg-white p-4 rounded shadow">
      <h3 className="text-lg font-bold text-gray-700 mb-2">IR Spectrum (Simulated)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="frequency" 
            label={{ value: 'Wavenumber (cm⁻¹)', position: 'insideBottomRight', offset: -5 }} 
            type="number" 
            domain={['dataMin', 'dataMax']}
            reversed={true}
          />
          <YAxis 
             label={{ value: 'Absorbance (arb. units)', angle: -90, position: 'insideLeft' }} 
          />
          <Tooltip labelFormatter={(value) => `${Number(value).toFixed(1)} cm⁻¹`} />
          <Line type="monotone" dataKey="intensity" stroke="#dc2626" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};