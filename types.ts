
export interface Atom {
  index: number;
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface Bond {
  source: number;
  target: number;
  order?: number;
}

export interface Vibration {
  mode: number;
  frequency: number; // cm^-1
  intensity: number; // km/mol
  vectors?: { x: number; y: number; z: number }[]; // Displacement vectors
}

export interface GeometryStep {
  cycle: number;
  energy: number;
  gradient: number;
  coordinates: Atom[];
}

export interface GeometryConvergenceData {
  cycle: number;
  energyChange?: number;
  rmsGradient?: number;
  maxGradient?: number;
  rmsStep?: number;
  maxStep?: number;
  energy?: number;
}

export interface ThermoChemistry {
  temperature: number;
  enthalpy: number;
  entropy: number;
  gibbsFreeEnergy: number;
  zpe: number;
}

export interface AtomicCharge {
  atomIndex: number;
  element: string;
  charge: number;
}

export interface SpinDensity {
  atomIndex: number;
  element: string;
  spin: number;
}

export interface NMRShielding {
  atomIndex: number;
  element: string;
  isotropic: number;
  anisotropy: number;
}

export interface MolecularOrbital {
  no: number;
  occupancy: number;
  energyEh: number;
  energyEV: number;
}

export interface Excitation {
  state: number;
  energyCm: number;
  wavelength: number; // nm
  oscillatorStrength: number;
}

export interface OrcaData {
  atoms: Atom[]; // Final or single point geometry
  bonds: Bond[];
  trajectory: GeometryStep[];
  geometryConvergence: GeometryConvergenceData[];
  vibrations: Vibration[];
  thermo?: ThermoChemistry;
  mullikenCharges: AtomicCharge[];
  loewdinCharges: AtomicCharge[];
  mullikenSpinDensities: SpinDensity[];
  loewdinSpinDensities: SpinDensity[];
  nmrShielding: NMRShielding[];
  scfConvergence: { iteration: number; energy: number }[];
  dipoleMoment?: { x: number; y: number; z: number; magnitude: number };
  orbitals: MolecularOrbital[];
  excitations: Excitation[];
}

export const ELEMENT_COLORS: Record<string, string> = {
  H: '#FFFFFF',
  C: '#909090',
  N: '#3050F8',
  O: '#FF0D0D',
  F: '#90E050',
  CL: '#1FF01F',
  BR: '#A62929',
  I: '#940094',
  S: '#FFFF30',
  P: '#FF8000',
  DEFAULT: '#FF69B4'
};

export const ELEMENT_RADII: Record<string, number> = {
  H: 0.3,
  C: 0.7,
  N: 0.7,
  O: 0.7,
  F: 0.6,
  S: 1.0,
  CL: 1.0,
  DEFAULT: 0.8
};
