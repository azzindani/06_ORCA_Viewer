
# ORCA Vis - ORCA Output Visualization Tool

ORCA Vis is a modern, web-based visualization tool designed for computational chemists to analyze output files from the ORCA quantum chemistry program package. It runs entirely in the browser, ensuring data privacy and ease of access.

## 🌟 Current Features

### 1. File Parsing
*   **Robust Support**: Automatically detects and parses `.out`, `.hess`, and `.xyz` files.
*   **Data Extraction**: Efficiently extracts molecular geometry, optimization trajectories, vibrational modes, thermochemistry, atomic charges, spin densities, orbital energies, dipole moments, UV-Vis excitations, and NMR shielding.

### 2. 3D Molecule Viewer
*   **Interactive Visualization**: Rotate, zoom, and pan molecular structures.
*   **Atom Representation**: Elements colored by CPK standards with tooltips showing element info (mass, number).
*   **Bond Visualization**: automatically calculated bond orders displayed as single, double, or triple cylinders.
*   **Measurement Tool**: Click on atoms to measure **Bond Distances** (2 atoms), **Bond Angles** (3 atoms), and **Dihedral Angles** (4 atoms).
*   **Visual Overlays**:
    *   **VdW Radii**: Toggleable transparent spheres representing Van der Waals radii.
    *   **Schematic Orbitals**: Toggleable visualization of s and p orbitals on atoms.
    *   **Dipole Moment**: 3D arrow indicating the magnitude and direction of the total dipole moment.
*   **Trajectory Player**: Scrub through geometry optimization steps to visualize structural changes.
*   **Image Export**: Capture high-quality PNG screenshots of the molecular structure.

### 3. Analysis Plots
*   **IR Spectrum**: Simulated Infrared spectrum using Lorentzian broadening based on calculated frequencies and intensities. **Interactive**: Click on peaks to animate the corresponding vibrational mode in the 3D viewer.
*   **UV-Vis Spectrum**: Simulated Absorption spectrum using Gaussian broadening of calculated excited states.
*   **SCF Convergence**: interactive plot of Energy vs. Iteration to diagnose convergence issues.
*   **Geometry Convergence**: Dual-axis plot showing RMS Gradient and Energy Change per optimization cycle.
*   **Orbital Energies**: Scatter plot of Molecular Orbitals (Occupied vs. Virtual) with HOMO-LUMO gap calculation.

### 4. Data Inspection & Export
*   **Thermochemistry**: Formatted display of Enthalpy, Entropy, Gibbs Free Energy, and Zero Point Energy at calculated temperature.
*   **Electric Properties**: Precise numerical values for Dipole Moment components (X, Y, Z) and total magnitude.
*   **Atomic Charges**: Sortable tables for Mulliken and Loewdin partial charges.
*   **Spin Density**: Tables for Mulliken and Loewdin atomic spin populations (for open-shell systems).
*   **NMR Shielding**: Table of Isotropic and Anisotropic chemical shielding values.
*   **Data Export**: Download any data table (Charges, Spin, NMR) as a CSV file for further analysis.

---

## 🗺️ Project Roadmap

We are actively working to make ORCA Vis the go-to tool for quick ORCA output analysis. Here is what's coming next:

### Phase 1: Enhanced Visualization
- [x] **Vibrational Mode Animation**: Animate atoms according to the displacement vectors for specific IR frequencies.
- [x] **Bond/Angle Measurement**: Click two or three atoms to measure distances and angles directly in the 3D viewer.
- [ ] **Unit Cell Support**: Visualization for periodic boundary condition calculations (Crystal-QMMM).

### Phase 2: Advanced Electronic Structure
- [ ] **Cube File Support**: Parse and render volumetric data for real Molecular Orbitals and Electron Density (Iso-surfaces).
- [x] **Spin Density**: Visualizing spin population for open-shell systems.
- [x] **UV-Vis Spectra**: Plotting excitation energies and oscillator strengths from TD-DFT calculations.

### Phase 3: Magnetic Properties & Spectroscopy
- [x] **NMR Visualization**: Visualization of Chemical Shift tensors and shielding values (Tabular data implemented).
- [ ] **EPR g-Tensor**: Visual representation of g-tensor principal axes on the molecule.

### Phase 4: Data Management & Export
- [x] **Export to Image**: Save high-quality snapshots of the 3D molecule and plots.
- [x] **Data Export**: Download parsed data tables as CSV.
- [ ] **Session State**: LocalStorage persistence to keep your data loaded between refreshes.

---

## 🛠️ Technical Stack

*   **Frontend**: React 18, TypeScript, Vite
*   **Styling**: Tailwind CSS
*   **3D Rendering**: React Three Fiber (Three.js)
*   **Charting**: Recharts
*   **State Management**: React Hooks

## 🤝 Contributing

Contributions are welcome! If you encounter a bug parsing a specific ORCA version or output format, please open an issue with a snippet of the output file.
