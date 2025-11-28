import { OrcaData, Atom, GeometryStep, Vibration, ThermoChemistry, AtomicCharge, Bond } from '../types';

export const parseOrcaFiles = async (files: File[]): Promise<OrcaData> => {
  let combinedData: OrcaData = {
    atoms: [],
    bonds: [],
    trajectory: [],
    vibrations: [],
    mullikenCharges: [],
    loewdinCharges: [],
    scfConvergence: []
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
  // Look for "CARTESIAN COORDINATES (ANGSTROEM)" blocks
  // In ORCA output, this often appears multiple times.
  
  let currentCycle = -1;
  let inCoords = false;
  let tempAtoms: Atom[] = [];
  
  // Regex for coordinate line: "  C     0.0000   1.0000   0.0000"
  const coordRegex = /^\s*([A-Za-z]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/;
  
  // Regex for SCF Energy
  const scfEnergyRegex = /FINAL SINGLE POINT ENERGY\s+([-\d.]+)/;
  const scfIterRegex = /^\s*(\d+)\s+([-\d.]+)\s+([-\d.]+)\s+/; // Very basic check for SCF table

  // Regex for IR Spectrum in .out file
  const irStartRegex = /^Mode\s+freq\s+eps\s+Int/;
  
  // Regex for Thermo
  const enthalpyRegex = /Total Enthalpy\s+\.\.\.\s+([-\d.]+)\s+Eh/;
  const entropyRegex = /Total entropy correction\s+\.\.\.\s+([-\d.]+)\s+Eh/;
  const gibbsRegex = /Final Gibbs free energy\s+\.\.\.\s+([-\d.]+)\s+Eh/;

  // Regex for Charges
  const mullikenStart = /MULLIKEN ATOMIC CHARGES/;
  const loewdinStart = /LOEWDIN ATOMIC CHARGES/;

  let readingIR = false;
  let readingMulliken = false;
  let readingLoewdin = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Trajectory / Geometry
    if (line.includes("CARTESIAN COORDINATES (ANGSTROEM)")) {
      inCoords = true;
      tempAtoms = [];
      // Look ahead to see if this is part of an optimization cycle
      // Usually preceded by "GEOMETRY OPTIMIZATION CYCLE   N" earlier
      i += 1; // Skip header line "NO LB ZA FRAG MASS..." or "----------------"
      continue;
    }

    if (line.includes("CARTESIAN COORDINATES (A.U.)") || line.includes("INTERNAL COORDINATES")) {
       inCoords = false;
       if (tempAtoms.length > 0) {
           // If we collected atoms, push them to trajectory or set as final
           // For simplicity, we just push to trajectory if it seems distinct, 
           // and update main 'atoms' to the latest found.
           data.trajectory.push({
               cycle: data.trajectory.length,
               energy: 0, // Filled later if found
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
    if (hMatch) {
        if (!data.thermo) data.thermo = { enthalpy: 0, entropy: 0, gibbsFreeEnergy: 0, zpe: 0, temperature: 298.15 };
        data.thermo.enthalpy = parseFloat(hMatch[1]);
    }
    const sMatch = line.match(entropyRegex);
    if (sMatch) {
        if (!data.thermo) data.thermo = { enthalpy: 0, entropy: 0, gibbsFreeEnergy: 0, zpe: 0, temperature: 298.15 };
        data.thermo.entropy = parseFloat(sMatch[1]);
    }
    const gMatch = line.match(gibbsRegex);
    if (gMatch) {
        if (!data.thermo) data.thermo = { enthalpy: 0, entropy: 0, gibbsFreeEnergy: 0, zpe: 0, temperature: 298.15 };
        data.thermo.gibbsFreeEnergy = parseFloat(gMatch[1]);
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
            // 0 C :   -0.453858
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
    // Try to capture "Total Energy       :       -662.95474275508991 Eh"
    if (line.startsWith('Total Energy') && line.includes('Eh')) {
        const parts = line.split(/\s+/);
        const e = parseFloat(parts[3]);
        if (!isNaN(e)) {
             data.scfConvergence.push({ iteration: data.scfConvergence.length + 1, energy: e});
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
    
    // Normal modes parsing state
    let normalModes: number[][] = []; 

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
                // In .hess files, frequencies usually listed just as numbers in a list if simple, 
                // but the block provided in prompt is formatted like a table.
                // We try to parse assuming standard columnar data.
                // But based on prompt's "$ir_spectrum" block:
                // 44.92   0.00009985   0.50458732 ...
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
        
        // Note: Parsing full normal mode vectors from the massive block in .hess is complex 
        // and requires mapping matrix columns to modes. 
        // For this simplified visualizer, we will skip detailed normal mode vector parsing 
        // unless specifically requested, as it requires robust matrix handling. 
        // We will focus on visualization of static data and spectra.
    }
};

// Simple bond calculation based on distance
const calculateBonds = (atoms: Atom[]): Bond[] => {
    const bonds: Bond[] = [];
    for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
            const a1 = atoms[i];
            const a2 = atoms[j];
            const dx = a1.x - a2.x;
            const dy = a1.y - a2.y;
            const dz = a1.z - a2.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            // Crude threshold for covalent bonds (1.6 Angstrom is typ max for C-C/C-N/C-O single)
            // Adjust for H atoms
            let threshold = 1.7;
            if (a1.element === 'H' || a2.element === 'H') threshold = 1.2;
            if ((a1.element === 'S' || a1.element === 'P' || a1.element === 'Cl') || 
                (a2.element === 'S' || a2.element === 'P' || a2.element === 'Cl')) threshold = 2.1;

            if (dist < threshold) {
                bonds.push({ source: i, target: j, order: 1 });
            }
        }
    }
    return bonds;
};
