
import React, { useMemo, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Atom, Bond, ELEMENT_COLORS, ELEMENT_RADII, Vibration } from '../types';
import { OrbitalS, OrbitalP } from './OrbitalVisuals';

interface MoleculeViewerProps {
  atoms: Atom[];
  bonds: Bond[];
  dipoleMoment?: { x: number; y: number; z: number; magnitude: number };
  selectedVibration?: Vibration | null;
}

const PERIODIC_TABLE: Record<string, { number: number, mass: number }> = {
  H: { number: 1, mass: 1.008 },
  HE: { number: 2, mass: 4.0026 },
  LI: { number: 3, mass: 6.94 },
  BE: { number: 4, mass: 9.0122 },
  B: { number: 5, mass: 10.81 },
  C: { number: 6, mass: 12.011 },
  N: { number: 7, mass: 14.007 },
  O: { number: 8, mass: 15.999 },
  F: { number: 9, mass: 18.998 },
  NE: { number: 10, mass: 20.180 },
  NA: { number: 11, mass: 22.990 },
  MG: { number: 12, mass: 24.305 },
  AL: { number: 13, mass: 26.982 },
  SI: { number: 14, mass: 28.085 },
  P: { number: 15, mass: 30.974 },
  S: { number: 16, mass: 32.06 },
  CL: { number: 17, mass: 35.45 },
  AR: { number: 18, mass: 39.948 },
  K: { number: 19, mass: 39.098 },
  CA: { number: 20, mass: 40.078 },
  BR: { number: 35, mass: 79.904 },
  I: { number: 53, mass: 126.90 },
};

const AtomMesh: React.FC<{ atom: Atom, showOrbital?: boolean, showVdW?: boolean, vibrationVector?: { x: number, y: number, z: number } }> = ({ atom, showOrbital, showVdW, vibrationVector }) => {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const symbol = atom.element.toUpperCase();
  const color = ELEMENT_COLORS[symbol] || ELEMENT_COLORS.DEFAULT;
  const radius = (ELEMENT_RADII[symbol] || ELEMENT_RADII.DEFAULT) * 0.4; 
  const vdwRadius = (ELEMENT_RADII[symbol] || ELEMENT_RADII.DEFAULT);
  
  const info = PERIODIC_TABLE[symbol] || { number: 0, mass: 0 };
  
  const isSBlock = symbol === 'H' || symbol === 'HE' || symbol === 'LI' || symbol === 'NA' || symbol === 'K';

  useFrame(({ clock }) => {
    if (groupRef.current && vibrationVector) {
        const t = clock.getElapsedTime();
        // Animation logic: oscillate around base position
        // Scaling factor 0.5 for visualization
        const factor = Math.sin(t * 10) * 0.5; 
        groupRef.current.position.x = atom.x + vibrationVector.x * factor;
        groupRef.current.position.y = atom.y + vibrationVector.y * factor;
        groupRef.current.position.z = atom.z + vibrationVector.z * factor;
    } else if (groupRef.current) {
        // Reset to original position if no vibration
        groupRef.current.position.x = atom.x;
        groupRef.current.position.y = atom.y;
        groupRef.current.position.z = atom.z;
    }
  });

  const handlePointerOver = (e: any) => {
      e.stopPropagation();
      setHovered(true);
  };

  const handlePointerOut = (e: any) => {
      e.stopPropagation();
      setHovered(false);
  };

  return (
    <group ref={groupRef}>
      {/* Core Atom Sphere */}
      <mesh 
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
        
        {hovered && (
          <Html distanceFactor={10} style={{ pointerEvents: 'none', zIndex: 50 }}>
              <div className="text-xs text-white bg-black/80 p-2 rounded backdrop-blur-sm border border-white/20 shadow-xl min-w-[80px] pointer-events-none select-none">
                  <div className="flex justify-between items-center border-b border-white/20 pb-1 mb-1">
                      <span className="font-bold text-lg leading-none text-chem-500">{atom.element}</span>
                      <span className="text-gray-400 font-mono text-[10px]">#{info.number || '?'}</span>
                  </div>
                  <div className="text-gray-300 flex justify-between gap-2">
                      <span>Mass:</span>
                      <span className="font-mono text-gray-400">{info.mass ? info.mass.toFixed(3) : '?'}</span>
                  </div>
                   <div className="text-gray-400 text-[10px] mt-1 pt-1 border-t border-white/10 flex justify-between">
                      <span>Atom ID:</span>
                      <span className="font-mono">{atom.index}</span>
                  </div>
              </div>
          </Html>
        )}
      </mesh>

      {/* Element Label (when not hovered) */}
      {!hovered && !showOrbital && !showVdW && (
        <Html distanceFactor={12} style={{ pointerEvents: 'none' }}>
            <div className="text-[10px] font-bold text-gray-800/80 select-none pointer-events-none" style={{ textShadow: '0px 0px 2px white' }}>
                {atom.element}
            </div>
        </Html>
      )}

      {/* VdW Radius Sphere */}
      {showVdW && (
        <mesh>
          <sphereGeometry args={[vdwRadius, 32, 32]} />
          <meshStandardMaterial 
            color={color} 
            transparent 
            opacity={0.15} 
            roughness={0.8}
            metalness={0.1}
            depthWrite={false} 
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Schematic Orbitals */}
      {showOrbital && (
          isSBlock 
            ? <OrbitalS position={[0,0,0]} scale={1.5} />
            : <OrbitalP position={[0,0,0]} scale={1.5} />
      )}
    </group>
  );
};

const BondMesh: React.FC<{ start: THREE.Vector3, end: THREE.Vector3, order?: number, startAtom: Atom, endAtom: Atom, vibration?: Vibration | null }> = ({ start, end, order = 1, startAtom, endAtom, vibration }) => {
    const [hovered, setHovered] = useState(false);
    const meshRef = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        if (meshRef.current && vibration && vibration.vectors) {
             const t = clock.getElapsedTime();
             const factor = Math.sin(t * 10) * 0.5;

             const vStart = vibration.vectors[startAtom.index];
             const vEnd = vibration.vectors[endAtom.index];

             if (vStart && vEnd) {
                 const pStart = new THREE.Vector3(startAtom.x + vStart.x * factor, startAtom.y + vStart.y * factor, startAtom.z + vStart.z * factor);
                 const pEnd = new THREE.Vector3(endAtom.x + vEnd.x * factor, endAtom.y + vEnd.y * factor, endAtom.z + vEnd.z * factor);

                 const direction = new THREE.Vector3().subVectors(pEnd, pStart);
                 const length = direction.length();
                 const midPoint = new THREE.Vector3().addVectors(pStart, pEnd).multiplyScalar(0.5);
                 const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
                 
                 meshRef.current.position.copy(midPoint);
                 meshRef.current.quaternion.copy(quaternion);
                 // Scale y to match new length (assuming initial geometry length is 1 unit which is not true, we need to handle scale differently or recreate geometry)
                 // Easier: Update scale.y relative to original length? 
                 // Actually, cylinder geometry is static. Scaling group is easiest but distorts radius.
                 // Correct approach in Three.js without recreating geom is complex. 
                 // For simplicity in visualization, we might accept slight radius distortion or just update position/rotation.
                 // Let's update position and rotation. Length change is usually small in vibrations.
                 // If we want length change, we can scale Y.
                 const originalLength = new THREE.Vector3().subVectors(end, start).length();
                 meshRef.current.scale.set(1, length / originalLength, 1);
             }
        } else if (meshRef.current) {
             // Reset (static)
             // const direction = new THREE.Vector3().subVectors(end, start);
             // const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
             // const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
             // meshRef.current.position.copy(midPoint);
             // meshRef.current.quaternion.copy(quaternion);
             // meshRef.current.scale.set(1, 1, 1);
             // Actually since we pass start/end as props which don't change, the initial render state is correct.
             // But if we animated, we need to reset. 
             // However, ref is imperative. If we stop animating, we need to manually reset or rely on React re-render.
             // Let's just rely on initial positioning if vibration is null.
             // But wait, if we switch vibration off, useFrame won't run the 'reset' logic unless we handle it.
             // Easier to just keep updating in useFrame even if vibration is null to force reset?
             // No, better to compute current start/end in the component body and pass to static mesh if no vibration.
             // BUT BondMesh holds the mesh.
             // Let's keep it simple: We only animate if vibration is present. If it becomes null, we reset once.
        }
    });

    // Re-calculate static properties on prop change
    const { initialMidPoint, initialQuaternion, initialLength } = useMemo(() => {
        const direction = new THREE.Vector3().subVectors(end, start);
        const len = direction.length();
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        return { initialMidPoint: mid, initialQuaternion: quat, initialLength: len };
    }, [start, end]);
    
    // If not animating, use static values. If animating, useFrame overrides.
    // We use a group ref to apply transforms.
    // We set initial transforms via props to Group, but useFrame will override them.
    
    const label = order === 3 ? 'Triple Bond' : order === 2 ? 'Double Bond' : 'Single Bond';
    const color = hovered ? "#9ca3af" : "#6b7280";
    const singleRadius = 0.08;
    const multiRadius = 0.04;
    const separation = 0.15;

    const handlePointerOver = (e: any) => { e.stopPropagation(); setHovered(true); };
    const handlePointerOut = (e: any) => { e.stopPropagation(); setHovered(false); };

    const tooltip = hovered && (
        <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
             <div className="text-xs text-white bg-black/70 px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm border border-white/10 shadow-sm pointer-events-none select-none">
                {label}
            </div>
        </Html>
    );

    const geometries = useMemo(() => {
         if (order === 3) {
             return (
                 <>
                    <mesh position={[separation, 0, 0]}><cylinderGeometry args={[multiRadius, multiRadius, initialLength, 8]} /><meshStandardMaterial color={color} /></mesh>
                    <mesh position={[0, 0, 0]}><cylinderGeometry args={[multiRadius, multiRadius, initialLength, 8]} /><meshStandardMaterial color={color} /></mesh>
                    <mesh position={[-separation, 0, 0]}><cylinderGeometry args={[multiRadius, multiRadius, initialLength, 8]} /><meshStandardMaterial color={color} /></mesh>
                 </>
             )
         } else if (order === 2) {
             return (
                 <>
                    <mesh position={[separation / 2, 0, 0]}><cylinderGeometry args={[multiRadius, multiRadius, initialLength, 8]} /><meshStandardMaterial color={color} /></mesh>
                    <mesh position={[-separation / 2, 0, 0]}><cylinderGeometry args={[multiRadius, multiRadius, initialLength, 8]} /><meshStandardMaterial color={color} /></mesh>
                 </>
             )
         } else {
             return (
                 <mesh>
                    <cylinderGeometry args={[singleRadius, singleRadius, initialLength, 8]} />
                    <meshStandardMaterial color={color} />
                 </mesh>
             )
         }
    }, [order, color, initialLength]);

    return (
         <group 
            ref={meshRef}
            position={initialMidPoint} 
            quaternion={initialQuaternion} 
            onPointerOver={handlePointerOver} 
            onPointerOut={handlePointerOut}
        >
            {geometries}
            {tooltip}
         </group>
    );
};

const DipoleArrow: React.FC<{ dipole: { x: number; y: number; z: number; magnitude: number }, center: THREE.Vector3 }> = ({ dipole, center }) => {
    const dir = new THREE.Vector3(dipole.x, dipole.y, dipole.z).normalize();
    const length = Math.min(dipole.magnitude * 0.5, 6); 
    const origin = center.clone();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    
    return (
        <group position={origin} quaternion={quaternion}>
            <mesh position={[0, length / 2, 0]}>
                <cylinderGeometry args={[0.05, 0.05, length, 8]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.5} roughness={0.2} />
            </mesh>
            <mesh position={[0, length + 0.1, 0]}>
                <coneGeometry args={[0.15, 0.3, 16]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.5} roughness={0.2} />
            </mesh>
             <Html position={[0, length/2, 0]} distanceFactor={10} style={{pointerEvents: 'none'}}>
                <div className="px-2 py-1 rounded bg-black/70 text-amber-400 text-xs font-mono whitespace-nowrap border border-amber-400/30 shadow-lg">
                    μ = {dipole.magnitude.toFixed(2)} D
                </div>
            </Html>
        </group>
    )
}

export const MoleculeViewer: React.FC<MoleculeViewerProps> = ({ atoms, bonds, dipoleMoment, selectedVibration }) => {
  const [showOrbitals, setShowOrbitals] = useState(false);
  const [showDipole, setShowDipole] = useState(!!dipoleMoment);
  const [showVdW, setShowVdW] = useState(false);

  React.useEffect(() => {
      if(dipoleMoment) setShowDipole(true);
  }, [dipoleMoment]);

  const center = useMemo(() => {
      if (atoms.length === 0) return new THREE.Vector3(0,0,0);
      let x=0, y=0, z=0;
      atoms.forEach(a => { x+=a.x; y+=a.y; z+=a.z; });
      return new THREE.Vector3(x/atoms.length, y/atoms.length, z/atoms.length);
  }, [atoms]);

  if (atoms.length === 0) {
      return <div className="w-full h-full flex items-center justify-center text-white bg-gray-900">No molecular structure data available</div>;
  }

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden shadow-inner relative group">
      
      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
         <button 
            onClick={() => setShowVdW(!showVdW)}
            className={`px-3 py-1.5 text-xs font-medium rounded border backdrop-blur-md transition-colors shadow-lg
                ${showVdW 
                    ? 'bg-chem-500/90 border-chem-400 text-white' 
                    : 'bg-gray-800/60 border-gray-600 text-gray-300 hover:bg-gray-700/80'}
            `}
         >
            {showVdW ? 'Hide VdW Radii' : 'Show VdW Radii'}
         </button>
         <button 
            onClick={() => setShowOrbitals(!showOrbitals)}
            className={`px-3 py-1.5 text-xs font-medium rounded border backdrop-blur-md transition-colors shadow-lg
                ${showOrbitals 
                    ? 'bg-chem-500/90 border-chem-400 text-white' 
                    : 'bg-gray-800/60 border-gray-600 text-gray-300 hover:bg-gray-700/80'}
            `}
         >
            {showOrbitals ? 'Hide Orbitals' : 'Show Schematic Orbitals'}
         </button>
         {dipoleMoment && (
             <button 
                onClick={() => setShowDipole(!showDipole)}
                className={`px-3 py-1.5 text-xs font-medium rounded border backdrop-blur-md transition-colors shadow-lg
                    ${showDipole 
                        ? 'bg-amber-500/90 border-amber-400 text-white' 
                        : 'bg-gray-800/60 border-gray-600 text-gray-300 hover:bg-gray-700/80'}
                `}
             >
                {showDipole ? 'Hide Dipole' : 'Show Dipole Moment'}
             </button>
         )}
         {selectedVibration && (
             <div className="px-3 py-1.5 text-xs font-medium rounded border backdrop-blur-md bg-red-500/90 border-red-400 text-white shadow-lg">
                 Animating Mode {selectedVibration.mode} ({selectedVibration.frequency.toFixed(1)} cm⁻¹)
             </div>
         )}
      </div>

      <Canvas camera={{ position: [0, 0, 20], fov: 40 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.4} />
        <Environment preset="city" />
        
        <group position={[-center.x, -center.y, -center.z]}>
            {atoms.map((atom, i) => (
                <AtomMesh 
                    key={`atom-${i}`} 
                    atom={atom} 
                    showOrbital={showOrbitals} 
                    showVdW={showVdW} 
                    vibrationVector={selectedVibration?.vectors ? selectedVibration.vectors[i] : undefined}
                />
            ))}
            
            {bonds.map((bond, i) => {
                const a1 = atoms[bond.source];
                const a2 = atoms[bond.target];
                if(!a1 || !a2) return null;
                return <BondMesh 
                            key={`bond-${i}`} 
                            start={new THREE.Vector3(a1.x, a1.y, a1.z)} 
                            end={new THREE.Vector3(a2.x, a2.y, a2.z)} 
                            order={bond.order} 
                            startAtom={a1}
                            endAtom={a2}
                            vibration={selectedVibration}
                        />;
            })}
            
            {showDipole && dipoleMoment && <DipoleArrow dipole={dipoleMoment} center={center} />}
        </group>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};
