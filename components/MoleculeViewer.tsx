import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Atom, Bond, ELEMENT_COLORS, ELEMENT_RADII } from '../types';

interface MoleculeViewerProps {
  atoms: Atom[];
  bonds: Bond[];
}

const AtomMesh: React.FC<{ atom: Atom }> = ({ atom }) => {
  const color = ELEMENT_COLORS[atom.element.toUpperCase()] || ELEMENT_COLORS.DEFAULT;
  const radius = (ELEMENT_RADII[atom.element.toUpperCase()] || ELEMENT_RADII.DEFAULT) * 0.4; // Scale down slightly
  
  return (
    <mesh position={[atom.x, atom.y, atom.z]}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="text-xs text-gray-700 font-semibold bg-white/70 px-1 rounded select-none pointer-events-none">
            {atom.element}
        </div>
      </Html>
    </mesh>
  );
};

const BondMesh: React.FC<{ start: THREE.Vector3, end: THREE.Vector3, order?: number }> = ({ start, end, order = 1 }) => {
    const [hovered, setHovered] = useState(false);
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

    const singleRadius = 0.12;
    const multiRadius = 0.05;
    const offset = 0.18;

    const material = <meshStandardMaterial color={hovered ? "#aaaaaa" : "#888888"} roughness={0.4} metalness={0.5} />;
    const multiGeometry = <cylinderGeometry args={[multiRadius, multiRadius, length, 12]} />;
    const singleGeometry = <cylinderGeometry args={[singleRadius, singleRadius, length, 12]} />;

    const label = order === 3 ? 'Triple Bond' : order === 2 ? 'Double Bond' : 'Single Bond';

    const handlePointerOver = (e: any) => {
        e.stopPropagation();
        setHovered(true);
    };

    const handlePointerOut = (e: any) => {
        e.stopPropagation();
        setHovered(false);
    };

    const tooltip = hovered && (
        <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
             <div className="text-xs text-white bg-black/60 px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm border border-white/10">
                {label}
            </div>
        </Html>
    );

    if (order === 3) {
         return (
             <group 
                position={midPoint} 
                quaternion={quaternion}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
             >
                <mesh position={[offset, 0, 0]}>{multiGeometry}{material}</mesh>
                <mesh position={[0, 0, 0]}>{multiGeometry}{material}</mesh>
                <mesh position={[-offset, 0, 0]}>{multiGeometry}{material}</mesh>
                {tooltip}
             </group>
         );
    }

    if (order === 2) {
        return (
             <group 
                position={midPoint} 
                quaternion={quaternion}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
             >
                <mesh position={[offset * 0.6, 0, 0]}>{multiGeometry}{material}</mesh>
                <mesh position={[-offset * 0.6, 0, 0]}>{multiGeometry}{material}</mesh>
                {tooltip}
             </group>
        );
    }

    return (
        <mesh 
            position={midPoint} 
            quaternion={quaternion}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
        >
            {singleGeometry}
            {material}
            {tooltip}
        </mesh>
    );
};

export const MoleculeViewer: React.FC<MoleculeViewerProps> = ({ atoms, bonds }) => {
  
  // Calculate center of geometry to center the camera
  const center = useMemo(() => {
      if (atoms.length === 0) return new THREE.Vector3(0,0,0);
      let x=0, y=0, z=0;
      atoms.forEach(a => { x+=a.x; y+=a.y; z+=a.z; });
      return new THREE.Vector3(x/atoms.length, y/atoms.length, z/atoms.length);
  }, [atoms]);

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden shadow-inner">
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Environment preset="city" />
        
        <group position={[-center.x, -center.y, -center.z]}>
            {atoms.map((atom, i) => (
            <AtomMesh key={`atom-${i}`} atom={atom} />
            ))}
            
            {bonds.map((bond, i) => {
                const a1 = atoms[bond.source];
                const a2 = atoms[bond.target];
                if(!a1 || !a2) return null;
                return <BondMesh key={`bond-${i}`} start={new THREE.Vector3(a1.x, a1.y, a1.z)} end={new THREE.Vector3(a2.x, a2.y, a2.z)} order={bond.order} />;
            })}
        </group>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};
