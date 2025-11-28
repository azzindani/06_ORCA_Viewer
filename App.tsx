
import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseOrcaFiles } from './services/orcaParser';
import { OrcaData } from './types';
import { MoleculeViewer } from './components/MoleculeViewer';
import { SpectrumViewer } from './components/SpectrumViewer';
import { ConvergencePlot, OrbitalEnergyPlot } from './components/ConvergencePlot';
import { ChargeTable, ThermoTable } from './components/DataTable';

const App: React.FC = () => {
  const [data, setData] = useState<OrcaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'structure' | 'plots' | 'data'>('structure');
  const [currentStep, setCurrentStep] = useState<number>(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await parseOrcaFiles(acceptedFiles);
      setData(result);
      // Default to the last step (converged geometry) if trajectory exists
      if (result.trajectory.length > 0) {
        setCurrentStep(result.trajectory.length - 1);
      } else {
        setCurrentStep(0);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to parse ORCA files. Please check the format.");
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const currentAtoms = useMemo(() => {
    if (!data) return [];
    if (data.trajectory.length > 0) {
      // Ensure currentStep is safe
      const safeStep = Math.min(Math.max(0, currentStep), data.trajectory.length - 1);
      return data.trajectory[safeStep].coordinates;
    }
    return data.atoms;
  }, [data, currentStep]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-chem-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">O</div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">ORCA Vis</h1>
        </div>
        
        {data && (
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {['structure', 'plots', 'data'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                            activeTab === tab 
                            ? 'bg-white text-chem-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>
        )}
      </header>

      <main className="flex-1 p-6 bg-slate-50 overflow-y-auto">
        {!data ? (
          <div className="max-w-2xl mx-auto mt-20">
            <div 
              {...getRootProps()} 
              className={`
                border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-chem-500 bg-chem-50' : 'border-gray-300 hover:border-chem-500 hover:bg-white'}
              `}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📂</div>
              <p className="text-lg text-gray-600 font-medium mb-2">Drop ORCA output files here</p>
              <p className="text-sm text-gray-400">Supports .out, .hess, .xyz</p>
              {loading && <p className="mt-4 text-chem-600 animate-pulse">Parsing files...</p>}
            </div>
            {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded border border-red-200 text-sm text-center">
                    {error}
                </div>
            )}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">
             
             {/* Structure View */}
             <div className={activeTab === 'structure' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                    <div className="lg:col-span-3 bg-gray-900 rounded-xl shadow-lg overflow-hidden relative">
                        <MoleculeViewer 
                            atoms={currentAtoms} 
                            bonds={data.bonds} 
                            dipoleMoment={data.dipoleMoment}
                        />
                        <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs p-2 rounded backdrop-blur-sm">
                            {currentAtoms.length} Atoms • {data.bonds.length} Bonds
                            {data.dipoleMoment && ` • Dipole: ${data.dipoleMoment.magnitude.toFixed(2)} D`}
                        </div>
                    </div>
                </div>
                {data.trajectory.length > 1 && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-gray-700">Optimization Trajectory</h3>
                            <div className="text-sm font-medium text-gray-500 font-mono">
                                Step {currentStep + 1} / {data.trajectory.length}
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <input
                                type="range"
                                min={0}
                                max={data.trajectory.length - 1}
                                value={currentStep}
                                onChange={(e) => setCurrentStep(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-chem-600"
                            />
                            <div className="flex justify-between mt-2 text-xs text-gray-400 font-mono">
                                <span>Start</span>
                                {data.trajectory[currentStep]?.energy && (
                                    <span className="text-gray-600 font-semibold">
                                        E = {data.trajectory[currentStep].energy.toFixed(6)} Eh
                                    </span>
                                )}
                                <span>Final</span>
                            </div>
                        </div>
                    </div>
                )}
             </div>

             {/* Plots View */}
             <div className={activeTab === 'plots' ? 'space-y-6' : 'hidden'}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SpectrumViewer vibrations={data.vibrations} />
                    <OrbitalEnergyPlot orbitals={data.orbitals} />
                    <ConvergencePlot data={data.scfConvergence} />
                </div>
             </div>

             {/* Data Tables View */}
             <div className={activeTab === 'data' ? 'block' : 'hidden'}>
                <div className="space-y-6">
                    {data.thermo && (
                        <div>
                            <ThermoTable thermo={data.thermo} />
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ChargeTable title="Mulliken Charges" charges={data.mullikenCharges} />
                        <ChargeTable title="Loewdin Charges" charges={data.loewdinCharges} />
                    </div>
                </div>
             </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;
