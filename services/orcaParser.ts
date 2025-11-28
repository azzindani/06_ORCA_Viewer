
import { OrcaData, Atom, GeometryStep, Vibration, ThermoChemistry, AtomicCharge, Bond, MolecularOrbital } from '../types';

export const parseOrcaFiles = async (files: File[]): Promise<OrcaData> => {
  let combinedData: OrcaData = {
    atoms: [],
    bonds: [],
    trajectory: [],
    vibrations: [],
    mullikenCharges: [],
    loewdinCharges: [],
    scfConvergence: [],
    orbitals: []
  };

  // Helper to read file
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
    
    // Heuristic to determine content type
    if (file.name.endsWith('.hess') || content.includes('$ir_spectrum')) {
      parseHessianFile(content, combinedData);
    } else {
      parseOutputFile(content, combinedData);
    }
  }

  // Post-processing: Calculate bonds for the final geometry if atoms exist
  if (combinedData.atoms.length > 0) {
    combinedData.bonds = calculateBonds(combinedData.atoms);
  }

  return combinedData;
};

const parseOutputFile = (content: string, data: OrcaData) => {
  const lines = content.split('\n');
  
  // 1. Parse Geometry Optimization Trajectory
  
  let inCoords = false;
  let tempAtoms: Atom[] = [];
  
  // Regex for coordinate line: "  C     0.0000   1.0000   0.0000"
  const coordRegex = /^\s*([A-Za-z]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/;
  
  // Regex for IR Spectrum in .out file
  const irStartRegex = /^Mode\s+freq\s+eps\s+Int/;
  
  // Regex for Thermo
  const enthalpyRegex = /Total Enthalpy\s+\.\.\.\s+([-\d.]+)\s+Eh/;
  const entropyRegex = /Total entropy correction\s+\.\.\.\s+([-\d.]+)\s+Eh/;
  const gibbsRegex = /Final Gibbs free energy\s+\.\.\.\s+([-\d.]+)\s+Eh/;
  const zpeRegex = /Zero point energy\s+\.\.\.\s+([-\d.]+)\s+Eh/;
  const tempRegex = /Temperature\s+\.\.\.\s+([-\d.]+)\s+K/;

  // Regex for Charges
  const mullikenStart = /MULLIKEN ATOMIC CHARGES/;
  const loewdinStart = /LOEWDIN ATOMIC CHARGES/;

  // Regex for Dipole
  const dipoleRegex = /Total Dipole Moment\s+:\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/;
  
  // Regex for Orbitals
  const orbitalStart = /ORBITAL ENERGIES/;

  let readingIR = false;
  let readingMulliken = false;
  let readingLoewdin = false;
  let readingOrbitals = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Trajectory / Geometry
    if (line.includes("CARTESIAN COORDINATES (ANGSTROEM)")) {
      inCoords = true;
      tempAtoms = [];
      // Look ahead to see if this is part of an optimization cycle
      i += 1; // Skip header line "NO LB ZA FRAG MASS..." or "----------------"
      continue;
    }

    if (line.includes("CARTESIAN COORDINATES (A.U.)") || line.includes("INTERNAL COORDINATES")) {
       inCoords = false;
       if (tempAtoms.length > 0) {
           // If we collected atoms, push them to trajectory or set as final
           const energyMatch = lines.slice(Math.max(0, i - 100), i).join('\n').match(/FINAL SINGLE POINT ENERGY\s+([-\d.]+)/);
           let energy = 0;
           if (energyMatch) energy = parseFloat(energyMatch[1]);

           data.trajectory.push({
               cycle: data.trajectory.length,
               energy: energy, 
               gradient: 0,
               coordinates: [...tempAtoms]
           });
           data.atoms = [...tempAtoms];
       }
    }

    if (inCoords) {
      const match = line.match(coordRegex);
      if (match) {
        tempAtoms.push({
          index: tempAtoms.length,
          element: match[1],
          x: parseFloat(match[2]),
          y: parseFloat(match[3]),
          z: parseFloat(match[4]),
        });
      } else if (line === '' || line.includes('-------')) {
         // End of block usually
         if (tempAtoms.length > 0) inCoords = false;
      }
    }
    
    // Parse IR Spectrum from .out
    if (irStartRegex.test(line)) {
      readingIR = true;
      i += 1; // skip separator
      continue;
    }
    
    if (readingIR) {
      if (line === '' || line.includes('-----------')) {
        readingIR = false;
      } else {
        // Format:  6:      44.92   0.000100    0.50 ...
        const parts = line.split(/\s+/);
        if (parts.length >= 4 && parts[0].includes(':')) {
            const mode = parseInt(parts[0].replace(':', ''));
            const freq = parseFloat(parts[1]);
            const intensity = parseFloat(parts[3]);
            
            // Update or add
            const existing = data.vibrations.find(v => v.mode === mode);
            if (!existing && freq !== 0) {
                data.vibrations.push({ mode, frequency: freq, intensity, vectors: [] });
            }
        }
      }
    }

    // Thermochemistry
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
        i += 1; 
        continue;
    }
    if (readingMulliken) {
        if (line === '' || line.includes('Sum of atomic charges')) {
            readingMulliken = false;
        } else if (!line.includes('------')) {
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
        if (line === '' || line.includes('Sum of atomic charges')) {
            readingLoewdin = false;
        } else if (!line.includes('------')) {
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
    
    // Convergence of Energy (very crude, often in SOSCF block)
    if (line.startsWith('Total Energy') && line.includes('Eh')) {
        const parts = line.split(/\s+/);
        const e = parseFloat(parts[3]);
        if (!isNaN(e)) {
             data.scfConvergence.push({ iteration: data.scfConvergence.length + 1, energy: e});
        }
    }

    // Dipole Moment
    const dipoleMatch = line.match(dipoleRegex);
    if (dipoleMatch) {
        const x = parseFloat(dipoleMatch[1]);
        const y = parseFloat(dipoleMatch[2]);
        const z = parseFloat(dipoleMatch[3]);
        const magnitude = Math.sqrt(x*x + y*y + z*z);
        data.dipoleMoment = { x, y, z, magnitude };
    }

    // Orbital Energies
    if (orbitalStart.test(line)) {
        readingOrbitals = true;
        data.orbitals = [];
        i += 3; // Skip headers
        continue;
    }
    if (readingOrbitals) {
        if (line === '' || line.includes('-------')) {
            readingOrbitals = false;
        } else {
            //   0   2.0000     -19.180399      -521.9252 
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 4) {
                const no = parseInt(parts[0]);
                const occ = parseFloat(parts[1]);
                const eh = parseFloat(parts[2]);
                const ev = parseFloat(parts[3]);
                if (!isNaN(no)) {
                    data.orbitals.push({ no, occupancy: occ, energyEh: eh, energyEV: ev });
                }
            }
        }
    }

  }
  
  // Handle case where file ends with coordinates
  if (inCoords && tempAtoms.length > 0) {
       data.trajectory.push({
           cycle: data.trajectory.length,
           energy: 0, 
           gradient: 0,
           coordinates: [...tempAtoms]
       });
       data.atoms = [...tempAtoms];
  }
};

const parseHessianFile = (content: string, data: OrcaData) => {
    // The .hess file contains $ir_spectrum and $normal_modes
    const lines = content.split('\n');
    let section = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('$ir_spectrum')) {
            section = 'ir_spectrum';
            i++; // skip count line
            continue;
        } else if (line.startsWith('$normal_modes')) {
            section = 'normal_modes';
            i++; // skip dim line
            continue;
        } else if (line.startsWith('$end')) {
            section = '';
            continue;
        }

        if (section === 'ir_spectrum') {
            // Format:   6       44.92   0.000100    0.50 ...
            // Or standard hess file: freq eps int T**2 TX TY TZ
            const parts = line.split(/\s+/);
            if (parts.length >= 3) {
                const freq = parseFloat(parts[0]);
                const intensity = parseFloat(parts[2]); // 3rd column usually intensity
                if (!isNaN(freq) && freq > 0) {
                     // Check if exists (parsed from .out)
                     const existingIndex = data.vibrations.findIndex(v => Math.abs(v.frequency - freq) < 0.1);
                     if (existingIndex === -1) {
                         data.vibrations.push({
                             mode: data.vibrations.length + 6, // approx
                             frequency: freq,
                             intensity: intensity,
                             vectors: []
                         });
                     }
                }
            }
        }
    }
};

const calculateBonds = (atoms: Atom[]): Bond[] => {
  const bonds: Bond[] = [];
  
  // Covalent radii (approximate, in Angstroms)
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

  // Approximate Bond Lengths for Order Estimation (Angstroms)
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
      
      // Connectivity threshold: sum of radii + 15% tolerance + 0.1A buffer
      const connectivityLimit = (r1 + r2) * 1.15 + 0.1;

      if (dist <= connectivityLimit) {
        let order = 1;
        const info = getBondOrderInfo(a1.element, a2.element);
        
        if (info) {
            // Heuristic for bond order based on distance
            // Use midpoints between typical bond lengths to decide
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
