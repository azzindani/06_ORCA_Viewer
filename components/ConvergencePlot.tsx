import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ConvergencePlotProps {
  data: { iteration: number; energy: number }[];
}

export const ConvergencePlot: React.FC<ConvergencePlotProps> = ({ data }) => {
  if (data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No convergence data available.</div>;

  // Normalize energy relative to the last step for better visualization of convergence
  const finalE = data[data.length - 1].energy;
  const plotData = data.map(d => ({
      ...d,
      deltaE: (d.energy - finalE) * 627.5 // kcal/mol roughly, just for scale
  }));

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