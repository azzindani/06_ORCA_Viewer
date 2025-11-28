
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, Legend } from 'recharts';
import { MolecularOrbital, GeometryConvergenceData } from '../types';

interface SCFConvergencePlotProps {
  data: { iteration: number; energy: number }[];
}

export const SCFConvergencePlot: React.FC<SCFConvergencePlotProps> = ({ data }) => {
  if (data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No SCF convergence data available.</div>;

  return (
    <div className="w-full h-64 bg-white p-4 rounded shadow">
      <h3 className="text-lg font-bold text-gray-700 mb-2">SCF Convergence</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="iteration" label={{ value: 'Iteration', position: 'insideBottom', offset: -5 }} />
          <YAxis domain={['auto', 'auto']} width={80} tickFormatter={(val) => val.toFixed(4)} />
          <Tooltip formatter={(val: number) => val.toFixed(6) + ' Eh'} />
          <Line type="monotone" dataKey="energy" stroke="#2563eb" dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const HyphenShape = (props: any) => {
  const { cx, cy, fill } = props;
  return (
      <rect x={cx - 15} y={cy - 2} width={30} height={4} fill={fill} rx={1} />
  );
};

export const OrbitalEnergyPlot: React.FC<{ orbitals: MolecularOrbital[] }> = ({ orbitals }) => {
    if (orbitals.length === 0) return <div className="h-96 flex items-center justify-center text-gray-400">No orbital data available.</div>;

    // Filter orbitals to a relevant range around HOMO/LUMO
    // Find HOMO (highest occupied)
    const homoIndex = orbitals.filter(o => o.occupancy > 0).pop()?.no || 0;
    
    // Get range around HOMO (e.g. -10 to +10 orbitals)
    const relevantOrbitals = orbitals.filter(o => o.no >= homoIndex - 8 && o.no <= homoIndex + 9);

    const data = relevantOrbitals.map(o => ({
        x: 1, // Single column
        y: o.energyEV,
        z: o.occupancy, // for color/size
        label: `${o.no}${o.occupancy > 0 ? ' (Occ)' : ' (Virt)'}`
    }));

    // Determine Gap
    const homo = orbitals.find(o => o.no === homoIndex);
    const lumo = orbitals.find(o => o.no === homoIndex + 1);
    const gap = homo && lumo ? (lumo.energyEV - homo.energyEV).toFixed(2) : '?';

    return (
        <div className="w-full h-96 bg-white p-4 rounded shadow flex flex-col">
            <div className="flex justify-between items-end mb-2">
                <h3 className="text-lg font-bold text-gray-700">Frontier Orbitals</h3>
                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">Gap: {gap} eV</span>
            </div>
            
            <div className="flex-1 relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 50, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" dataKey="x" hide domain={[0, 2]} />
                        <YAxis 
                            type="number" 
                            dataKey="y" 
                            domain={['auto', 'auto']} 
                            label={{ value: 'Energy (eV)', angle: -90, position: 'insideLeft' }} 
                        />
                        <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }} 
                            content={({ payload }) => {
                                if (payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-white p-2 border border-gray-200 rounded shadow text-xs">
                                            <p className="font-bold">MO #{d.label.split(' ')[0]}</p>
                                            <p>Energy: {d.y.toFixed(3)} eV</p>
                                            <p>Occ: {d.z.toFixed(1)}</p>
                                        </div>
                                    )
                                }
                                return null;
                            }}
                        />
                        <Scatter data={data} shape={<HyphenShape />}>
                             {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.z > 0 ? "#2563eb" : "#dc2626"} />
                             ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
             <div className="flex justify-center gap-4 text-xs text-gray-500 mt-2">
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-blue-600"></div> Occupied</div>
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-red-600"></div> Virtual</div>
            </div>
        </div>
    )
}

export const GradientPlot: React.FC<{ data: GeometryConvergenceData[] }> = ({ data }) => {
    if (data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No geometry convergence data available.</div>;

    return (
      <div className="w-full h-64 bg-white p-4 rounded shadow">
        <h3 className="text-lg font-bold text-gray-700 mb-2">Geometry Optimization</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="cycle" label={{ value: 'Cycle', position: 'insideBottom', offset: -5 }} />
            <YAxis yAxisId="left" label={{ value: 'RMS Gradient', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Energy Change', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend verticalAlign="top" height={36}/>
            <Line yAxisId="left" type="monotone" dataKey="rmsGradient" stroke="#ef4444" name="RMS Gradient" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="energyChange" stroke="#10b981" name="Energy Change" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
};
