
import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Vibration } from '../types';

interface SpectrumViewerProps {
  vibrations: Vibration[];
  onVibrationSelect?: (vibration: Vibration | null) => void;
}

// Lorentzian function for broadening
const lorentzian = (x: number, x0: number, gamma: number) => {
    return (1 / Math.PI) * (gamma / (Math.pow(x - x0, 2) + Math.pow(gamma, 2)));
};

const CustomTooltip = ({ active, payload, label, vibrations }: any) => {
  if (active && payload && payload.length) {
    const freq = Number(label);
    // Find vibrations close to this frequency (within 20 cm-1)
    const nearby = vibrations
        .filter((v: Vibration) => Math.abs(v.frequency - freq) < 25)
        .sort((a: Vibration, b: Vibration) => b.intensity - a.intensity)
        .slice(0, 5);

    return (
      <div className="bg-white/95 p-3 border border-gray-200 rounded shadow-lg text-sm backdrop-blur-sm z-50">
        <p className="font-bold mb-1">{freq.toFixed(0)} cm⁻¹</p>
        <p className="text-red-600 mb-2">
            Absorbance: {payload[0].value.toFixed(3)}
        </p>
        
        {nearby.length > 0 && (
            <div className="border-t border-gray-100 pt-2 mt-1">
                <p className="text-xs font-semibold text-gray-500 mb-1">Contributing Modes:</p>
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left text-gray-400 font-normal">
                            <th className="pr-2 font-normal">Mode</th>
                            <th className="pr-2 font-normal">Freq</th>
                            <th className="text-right font-normal">Int (km/mol)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {nearby.map((v: Vibration) => (
                            <tr key={v.mode}>
                                <td className="pr-2 text-gray-600">#{v.mode}</td>
                                <td className="pr-2">{v.frequency.toFixed(1)}</td>
                                <td className="text-right font-mono font-medium text-slate-700">{v.intensity.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
        <p className="text-[10px] text-gray-400 mt-2 italic">Click to animate dominant mode</p>
      </div>
    );
  }
  return null;
};

export const SpectrumViewer: React.FC<SpectrumViewerProps> = ({ vibrations, onVibrationSelect }) => {
  const [selectedFreq, setSelectedFreq] = useState<number | null>(null);

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

  const handleClick = (data: any) => {
      if (data && data.activeLabel) {
          const freq = Number(data.activeLabel);
          // Find the dominant vibration at this frequency
          const closestVibration = vibrations
            .filter((v) => Math.abs(v.frequency - freq) < 40) // look in range
            .sort((a, b) => b.intensity - a.intensity)[0]; // pick highest intensity
          
          if (closestVibration) {
              setSelectedFreq(closestVibration.frequency);
              if (onVibrationSelect) {
                  onVibrationSelect(closestVibration);
              }
          } else {
              // Clicked on empty space, deselect
              setSelectedFreq(null);
              if (onVibrationSelect) {
                  onVibrationSelect(null);
              }
          }
      }
  };

  if (vibrations.length === 0) {
      return <div className="flex items-center justify-center h-64 text-gray-400">No vibrational data found.</div>;
  }

  return (
    <div className="w-full h-96 bg-white p-4 rounded shadow">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-gray-700">IR Spectrum (Simulated)</h3>
        {selectedFreq && (
             <button 
                onClick={() => { setSelectedFreq(null); if(onVibrationSelect) onVibrationSelect(null); }}
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1"
             >
                 Stop Animation
             </button>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} onClick={handleClick} className="cursor-pointer">
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
          <Tooltip content={<CustomTooltip vibrations={vibrations} />} />
          <Line type="monotone" dataKey="intensity" stroke="#dc2626" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
          {selectedFreq !== null && (
              <ReferenceLine x={selectedFreq} stroke="blue" strokeDasharray="3 3" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
