
import { OrcaData, Atom, GeometryStep, Vibration, ThermoChemistry, AtomicCharge, Bond, MolecularOrbital, GeometryConvergenceData, SpinDensity, Excitation, NMRShielding } from '../types';

export const parseOrcaFiles = async (files: File[]): Promise<OrcaData> => {
  let combinedData: OrcaData = {
    atoms: [],
    bonds: [],
    trajectory: [],
    geometryConvergence: [],
    vibrations: [],
    mullikenCharges: [],
    loewdinCharges: [],
    mullikenSpinDensities: [],
    loewdinSpinDensities: [],
    nmrShielding: [],
    scfConvergence: [],
    orbitals: [],
    excitations: []
  };

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  for (const file of files) {
    const content = await readFile(file);
    
    if (file.name.endsWith('.hess') || content.includes('$ir_spectrum')) {
      parseHessianFile(content, combinedData);
    } else {
      parseOutputFile(content, combinedData);
    }
  }

  if (combinedData.atoms.length > 0) {
    combinedData.bonds = calculateBonds(combinedData.atoms);
  }

  return combinedData;
};

const parseOutputFile = (content: string, data: OrcaData) => {
  const lines = content.split('\n');
  
  let inCoords = false;
  let tempAtoms: Atom[] = [];
  
  const coordRegex = /^\s*([A-Za-z]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/;
  const irStartRegex = /^\s*Mode\s+freq\s+eps\s+Int/;
  
  const enthalpyRegex = /Total Enthalpy\s+\.\.\.\s+([-\d.]+)\s+Eh/;
  const entropyRegex = /Total entropy correction\s+\.\.\.\s+([-\d.]+)\s+Eh/;
  const gibbsRegex = /Final Gibbs free energy\s+\.\.\.\s+([-\d.]+)\s+Eh/;
  const zpeRegex = /Zero point energy\s+\.\.\.\s+([-\d.]+)\s+Eh/;
  const tempRegex = /Temperature\s+\.\.\.\s+([-\d.]+)\s+K/;

  const mullikenStart = /MULLIKEN ATOMIC CHARGES/;
  const loewdinStart = /LOEWDIN ATOMIC CHARGES/;
  const mullikenSpinStart = /MULLIKEN ATOMIC SPIN DENSITIES/;
  const loewdinSpinStart = /LOEWDIN ATOMIC SPIN DENSITIES/;
  const absorptionStart = /ABSORPTION SPECTRUM VIA TRANSITION ELECTRIC DIPOLE MOMENTS/;
  const nmrStart = /CHEMICAL SHIELDING SUMMARY/;

  const dipoleRegex = /Total Dipole Moment\s+:\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/;
  const orbitalBlockStart = /ORBITAL ENERGIES/;
  const orbitalHeaderRegex = /NO\s+OCC\s+E\(Eh\)\s+E\(eV\)/;
  const geomConvStart = /Geometry convergence/;
  
  let readingIR = false;
  let readingMulliken = false;
  let readingLoewdin = false;
  let readingMullikenSpin = false;
  let readingLoewdinSpin = false;
  let readingAbsorption = false;
  let readingOrbitals = false;
  let searchingOrbitalHeader = false;
  let readingGeomConv = false;
  let readingNMR = false;
  let currentGeomConv: Partial<GeometryConvergenceData> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Trajectory / Geometry
    if (line.includes("CARTESIAN COORDINATES (ANGSTROEM)")) {
      inCoords = true;
      tempAtoms = [];
      continue;
    }

    if (inCoords) {
      // Ignore separator lines like "---------------------------------" inside the block
      // Only stop if we hit a blank line OR a new known header
      if (line.startsWith('------')) {
         // Do nothing, just skip this line but keep reading
         continue;
      }
      
      const match = line.match(coordRegex);
      if (match) {
        tempAtoms.push({
          index: tempAtoms.length,
          element: match[1],
          x: parseFloat(match[2]),
          y: parseFloat(match[3]),
          z: parseFloat(match[4]),
        });
      } else if (line === '' || line.includes('CARTESIAN COORDINATES (A.U.)') || line.includes('INTERNAL COORDINATES')) {
         if (tempAtoms.length > 0) {
             data.atoms = [...tempAtoms];
             const lastStep = data.trajectory[data.trajectory.length - 1];
             if (!lastStep || lastStep.coordinates.length > 0) {
                 data.trajectory.push({
                     cycle: data.trajectory.length,
                     energy: 0, 
                     gradient: 0,
                     coordinates: [...tempAtoms]
                 });
             } else {
                 lastStep.coordinates = [...tempAtoms];
             }
         }
         inCoords = false;
      }
    }
    
    if (line.includes("FINAL SINGLE POINT ENERGY")) {
        const parts = line.split(/\s+/);
        const energy = parseFloat(parts[parts.length - 1]);
        if (!isNaN(energy)) {
            if (data.trajectory.length > 0) {
                data.trajectory[data.trajectory.length - 1].energy = energy;
            }
        }
    }

    if (irStartRegex.test(line)) {
      readingIR = true;
      continue;
    }
    
    if (readingIR) {
      if (line === '' || line.includes('-----------')) {
        readingIR = false;
      } else {
        const parts = line.replace(':', '').trim().split(/\s+/);
        if (parts.length >= 4) {
            const mode = parseInt(parts[0]);
            const freq = parseFloat(parts[1]);
            const intensity = parseFloat(parts[3]);
            
            if (!isNaN(mode) && !isNaN(freq)) {
                const existingIndex = data.vibrations.findIndex(v => v.mode === mode);
                if (existingIndex === -1) {
                    data.vibrations.push({ mode, frequency: freq, intensity, vectors: [] });
                } else {
                    data.vibrations[existingIndex].frequency = freq;
                    data.vibrations[existingIndex].intensity = intensity;
                }
            }
        }
      }
    }

    const hMatch = line.match(enthalpyRegex);
    const sMatch = line.match(entropyRegex);
    const gMatch = line.match(gibbsRegex);
    const zMatch = line.match(zpeRegex);
    const tMatch = line.match(tempRegex);

    if (hMatch || sMatch || gMatch || zMatch || tMatch) {
        if (!data.thermo) data.thermo = { enthalpy: 0, entropy: 0, gibbsFreeEnergy: 0, zpe: 0, temperature: 298.15 };
        if (hMatch) data.thermo.enthalpy = parseFloat(hMatch[1]);
        if (sMatch) data.thermo.entropy = parseFloat(sMatch[1]);
        if (gMatch) data.thermo.gibbsFreeEnergy = parseFloat(gMatch[1]);
        if (zMatch) data.thermo.zpe = parseFloat(zMatch[1]);
        if (tMatch) data.thermo.temperature = parseFloat(tMatch[1]);
    }

    // Charges
    if (mullikenStart.test(line)) {
        readingMulliken = true;
        data.mullikenCharges = [];
        i += 1; // Skip header
        continue;
    }
    if (readingMulliken) {
        if (line === '' || line.includes('Sum of atomic charges') || line.includes('------')) {
            if (data.mullikenCharges.length > 0) readingMulliken = false;
        } else {
            const parts = line.split(':');
            if (parts.length === 2) {
                const left = parts[0].trim().split(/\s+/);
                const charge = parseFloat(parts[1]);
                if (left.length >= 2) {
                    data.mullikenCharges.push({
                        atomIndex: parseInt(left[0]),
                        element: left[1],
                        charge
                    });
                }
            }
        }
    }

    if (loewdinStart.test(line)) {
        readingLoewdin = true;
        data.loewdinCharges = [];
        i += 1; 
        continue;
    }
    if (readingLoewdin) {
        if (line === '' || line.includes('Sum of atomic charges') || line.includes('------')) {
             if (data.loewdinCharges.length > 0) readingLoewdin = false;
        } else {
            const parts = line.split(':');
            if (parts.length === 2) {
                const left = parts[0].trim().split(/\s+/);
                const charge = parseFloat(parts[1]);
                if (left.length >= 2) {
                    data.loewdinCharges.push({
                        atomIndex: parseInt(left[0]),
                        element: left[1],
                        charge
                    });
                }
            }
        }
    }

    // Spin Densities
    if (mullikenSpinStart.test(line)) {
        readingMullikenSpin = true;
        data.mullikenSpinDensities = [];
        i += 1; 
        continue;
    }
    if (readingMullikenSpin) {
        if (line === '' || line.includes('Sum of atomic spin densities') || line.includes('------')) {
            if (data.mullikenSpinDensities.length > 0) readingMullikenSpin = false;
        } else {
            const parts = line.trim().split(/\s+/);
             // Format: Index Element Spin
             // ORCA sometimes formats:   0 C   0.000000
            if (parts.length >= 3) {
                let spinIndex = 2;
                if (parts[2] === ':' && parts.length > 3) spinIndex = 3;
                const spin = parseFloat(parts[spinIndex]);
                if (!isNaN(spin)) {
                    data.mullikenSpinDensities.push({
                        atomIndex: parseInt(parts[0]),
                        element: parts[1],
                        spin: spin
                    });
                }
            }
        }
    }

    if (loewdinSpinStart.test(line)) {
        readingLoewdinSpin = true;
        data.loewdinSpinDensities = [];
        i += 1; 
        continue;
    }
    if (readingLoewdinSpin) {
         if (line === '' || line.includes('Sum of atomic spin densities') || line.includes('------')) {
            if (data.loewdinSpinDensities.length > 0) readingLoewdinSpin = false;
        } else {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
                let spinIndex = 2;
                if (parts[2] === ':' && parts.length > 3) spinIndex = 3;
                const spin = parseFloat(parts[spinIndex]);
                if (!isNaN(spin)) {
                    data.loewdinSpinDensities.push({
                        atomIndex: parseInt(parts[0]),
                        element: parts[1],
                        spin: spin
                    });
                }
            }
        }
    }

    // NMR
    if (nmrStart.test(line)) {
        readingNMR = true;
        data.nmrShielding = [];
        // Skip header lines manually
        continue;
    }
    if (readingNMR) {
         // Example format:
         //   0  C    123.456    12.345
         if (line === '' || line.startsWith('------')) {
             if (data.nmrShielding.length > 0) readingNMR = false;
         } else {
            const parts = line.trim().split(/\s+/);
            // Expect at least 3 parts: Index, Element, Isotropic
            if (parts.length >= 3) {
                const index = parseInt(parts[0]);
                const element = parts[1];
                const iso = parseFloat(parts[2]);
                const aniso = parseFloat(parts[3]);
                
                if (!isNaN(index) && !isNaN(iso)) {
                    data.nmrShielding.push({
                        atomIndex: index,
                        element: element,
                        isotropic: iso,
                        anisotropy: isNaN(aniso) ? 0 : aniso
                    });
                }
            }
         }
    }

    // UV-Vis / Excitation
    if (absorptionStart.test(line)) {
        readingAbsorption = true;
        data.excitations = [];
        // Skip table headers usually ~4 lines
        // State   Energy    Wavelength  fosc         T2         TX        TY        TZ
        continue;
    }
    if (readingAbsorption) {
        if (line === '' || line.startsWith('---------')) {
             // If we just started reading and hit separators, keep reading. 
             // If we have data and hit separator or empty line, stop.
             if(data.excitations.length > 0 && line === '') readingAbsorption = false;
        } else {
            const parts = line.trim().split(/\s+/);
            // Expecting: State, Energy(cm-1), Wavelength(nm), fosc, ...
            // e.g.   1   25000.0     400.0     0.010000 ...
            if (parts.length >= 4) {
                const state = parseInt(parts[0]);
                const energy = parseFloat(parts[1]);
                const wl = parseFloat(parts[2]);
                const fosc = parseFloat(parts[3]);
                
                if (!isNaN(state) && !isNaN(energy) && !isNaN(wl) && !isNaN(fosc)) {
                    data.excitations.push({
                        state,
                        energyCm: energy,
                        wavelength: wl,
                        oscillatorStrength: fosc
                    });
                }
            }
        }
    }
    
    if (line.startsWith('Total Energy') && line.includes('Eh')) {
        const parts = line.split(/\s+/);
        const eStr = parts.find(p => p.includes('.') && !p.includes(':') && !isNaN(parseFloat(p)));
        if (eStr) {
             const e = parseFloat(eStr);
             data.scfConvergence.push({ iteration: data.scfConvergence.length + 1, energy: e});
        }
    }

    const dipoleMatch = line.match(dipoleRegex);
    if (dipoleMatch) {
        const x = parseFloat(dipoleMatch[1]);
        const y = parseFloat(dipoleMatch[2]);
        const z = parseFloat(dipoleMatch[3]);
        const magnitude = Math.sqrt(x*x + y*y + z*z);
        data.dipoleMoment = { x, y, z, magnitude };
    }

    if (orbitalBlockStart.test(line)) {
        searchingOrbitalHeader = true;
        data.orbitals = [];
        continue;
    }
    if (searchingOrbitalHeader) {
        if (orbitalHeaderRegex.test(line)) {
            searchingOrbitalHeader = false;
            readingOrbitals = true;
            continue;
        }
    }
    if (readingOrbitals) {
        if (line === '' || line.includes('-------')) {
            readingOrbitals = false;
        } else {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 4) {
                const no = parseInt(parts[0]);
                const occ = parseFloat(parts[1]);
                const eh = parseFloat(parts[2]);
                const ev = parseFloat(parts[3]);
                if (!isNaN(no) && !isNaN(ev)) {
                    data.orbitals.push({ no, occupancy: occ, energyEh: eh, energyEV: ev });
                }
            }
        }
    }

    if (geomConvStart.test(line)) {
        readingGeomConv = true;
        currentGeomConv = { cycle: data.geometryConvergence.length + 1 };
        continue;
    }
    if (readingGeomConv) {
        if (line.includes("Energy change")) {
            const parts = line.split(/\s+/);
            currentGeomConv.energyChange = parseFloat(parts[2]);
        }
        if (line.includes("RMS gradient")) {
            const parts = line.split(/\s+/);
            currentGeomConv.rmsGradient = parseFloat(parts[2]);
        }
        if (line.includes("MAX gradient")) {
            const parts = line.split(/\s+/);
            currentGeomConv.maxGradient = parseFloat(parts[2]);
        }
        if (line.includes("RMS step")) {
            const parts = line.split(/\s+/);
            currentGeomConv.rmsStep = parseFloat(parts[2]);
        }
        if (line.includes("MAX step")) {
            const parts = line.split(/\s+/);
            currentGeomConv.maxStep = parseFloat(parts[2]);
        }
        if (line.includes("----------------") && currentGeomConv.rmsGradient !== undefined) {
            readingGeomConv = false;
            const trajStep = data.trajectory[data.geometryConvergence.length];
            if (trajStep) {
                currentGeomConv.energy = trajStep.energy;
                trajStep.gradient = currentGeomConv.rmsGradient || 0;
            }
            data.geometryConvergence.push(currentGeomConv as GeometryConvergenceData);
            currentGeomConv = {};
        }
    }
  }
  
  return data;
};

const parseHessianFile = (content: string, data: OrcaData) => {
    const lines = content.split('\n');
    let section = '';
    let normalModesCols: number[] = [];
    let normalModesData: number[][] = []; // [coordinate_index][mode_index]

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('$ir_spectrum')) {
            section = 'ir_spectrum';
            i++; 
            continue;
        } else if (line.startsWith('$normal_modes')) {
            section = 'normal_modes';
            i++; 
            // Skip dimensions line usually present after $normal_modes, e.g., "69 69"
            const dimParts = lines[i].trim().split(/\s+/);
            if (dimParts.length === 2 && !isNaN(parseInt(dimParts[0]))) {
               // Consumed dimension line
            } else {
               i--; // Backtrack if not dimensions
            }
            continue;
        } else if (line.startsWith('$end')) {
            // Process collected normal modes before exiting or changing section
            if (section === 'normal_modes') {
               processNormalModes(normalModesData, data);
            }
            section = '';
            continue;
        }

        if (section === 'ir_spectrum') {
            const parts = line.split(/\s+/);
            if (parts.length >= 3) {
                const freq = parseFloat(parts[1]); 
                const intensity = parseFloat(parts[3]); 
                if (!isNaN(freq)) {
                     const existingIndex = data.vibrations.findIndex(v => Math.abs(v.frequency - freq) < 0.1);
                     if (existingIndex === -1) {
                         data.vibrations.push({
                             mode: data.vibrations.length, // Temporary mode index, will rely on matching later
                             frequency: freq,
                             intensity: intensity,
                             vectors: []
                         });
                     }
                }
            }
        } else if (section === 'normal_modes') {
            // Check if this is a header line (integers only)
            if (/^\s*\d+(\s+\d+)+$/.test(line)) {
                normalModesCols = line.trim().split(/\s+/).map(Number);
            } else {
                const parts = line.trim().split(/\s+/);
                // Valid data line should start with coordinate index
                if (parts.length > 1) {
                    const coordIndex = parseInt(parts[0]);
                    if (!isNaN(coordIndex)) {
                         if (!normalModesData[coordIndex]) normalModesData[coordIndex] = [];
                         const values = parts.slice(1).map(parseFloat);
                         values.forEach((val, k) => {
                             if (normalModesCols[k] !== undefined) {
                                 normalModesData[coordIndex][normalModesCols[k]] = val;
                             }
                         });
                    }
                }
            }
        }
    }
    
    // Ensure we process normal modes if file ends without $end
    if (section === 'normal_modes' && normalModesData.length > 0) {
        processNormalModes(normalModesData, data);
    }
};

const processNormalModes = (matrix: number[][], data: OrcaData) => {
    if (matrix.length === 0) return;
    const numModes = matrix[0].length;
    const numCoords = matrix.length;
    const numAtoms = Math.floor(numCoords / 3);

    for (let m = 0; m < numModes; m++) {
        const vectors: { x: number, y: number, z: number }[] = [];
        for (let a = 0; a < numAtoms; a++) {
            vectors.push({
                x: matrix[a * 3][m] || 0,
                y: matrix[a * 3 + 1][m] || 0,
                z: matrix[a * 3 + 2][m] || 0
            });
        }
        
        if (m < data.vibrations.length) {
            data.vibrations[m].vectors = vectors;
        }
    }
};

const calculateBonds = (atoms: Atom[]): Bond[] => {
  const bonds: Bond[] = [];
  
  const radii: Record<string, number> = {
    H: 0.31, He: 0.28,
    Li: 1.28, Be: 0.96, B: 0.84, C: 0.76, N: 0.71, O: 0.66, F: 0.57, Ne: 0.58,
    Na: 1.66, Mg: 1.41, Al: 1.21, Si: 1.11, P: 1.07, S: 1.05, Cl: 1.02, Ar: 1.06,
    K: 2.03, Ca: 1.76, Sc: 1.70, Ti: 1.60, V: 1.53, Cr: 1.39, Mn: 1.39, Fe: 1.32, Co: 1.26, Ni: 1.24, Cu: 1.32, Zn: 1.22,
    Ga: 1.22, Ge: 1.20, As: 1.19, Se: 1.20, Br: 1.20, Kr: 1.16,
    DEFAULT: 1.5
  };
  
  const getRadius = (el: string) => {
      const key = el.charAt(0).toUpperCase() + el.slice(1).toLowerCase();
      return radii[key] || radii[el.toUpperCase()] || radii.DEFAULT;
  };

  const bondRef: Record<string, Record<string, { single: number, double?: number, triple?: number }>> = {
    C: {
        C: { single: 1.54, double: 1.34, triple: 1.20 },
        N: { single: 1.47, double: 1.28, triple: 1.16 },
        O: { single: 1.43, double: 1.20, triple: 1.13 }, 
        S: { single: 1.82, double: 1.60 },
        H: { single: 1.09 },
        F: { single: 1.35 },
        CL: { single: 1.77 },
        BR: { single: 1.94 },
        I: { single: 2.14 }
    },
    N: {
        N: { single: 1.45, double: 1.25, triple: 1.10 },
        O: { single: 1.40, double: 1.20 },
        H: { single: 1.01 }
    },
    O: {
        O: { single: 1.48, double: 1.21 },
        H: { single: 0.96 }
    },
    H: {
        H: { single: 0.74 }
    }
  };

  const getBondOrderInfo = (el1: string, el2: string) => {
      const e1 = el1.charAt(0).toUpperCase() + el1.slice(1).toLowerCase();
      const e2 = el2.charAt(0).toUpperCase() + el2.slice(1).toLowerCase();
      
      if (bondRef[e1] && bondRef[e1][e2]) return bondRef[e1][e2];
      if (bondRef[e2] && bondRef[e2][e1]) return bondRef[e2][e1];
      return null;
  };

  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const a1 = atoms[i];
      const a2 = atoms[j];
      
      const dx = a1.x - a2.x;
      const dy = a1.y - a2.y;
      const dz = a1.z - a2.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      const r1 = getRadius(a1.element);
      const r2 = getRadius(a2.element);
      
      const connectivityLimit = (r1 + r2) * 1.15 + 0.1;

      if (dist <= connectivityLimit) {
        let order = 1;
        const info = getBondOrderInfo(a1.element, a2.element);
        
        if (info) {
            if (info.triple && dist <= (info.double ? (info.double + info.triple)/2 : info.triple + 0.1)) {
                order = 3;
            } else if (info.double && dist <= (info.single + info.double)/2) {
                order = 2;
            }
        }
        
        bonds.push({ source: i, target: j, order });
      }
    }
  }

  return bonds;
};
