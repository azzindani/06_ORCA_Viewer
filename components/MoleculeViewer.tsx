import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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
      <Html distanceFactor={10}>
        <div className="text-xs text-gray-700 font-semibold bg-white/70 px-1 rounded pointer-events-none select-none">
            {atom.element}
        </div>
      </Html>
    </mesh>
  );
};

const BondMesh: React.FC<{ start: THREE.Vector3, end: THREE.Vector3 }> = ({ start, end }) => {
    const ref = useRef<THREE.Mesh>(null);
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    
    // Align cylinder to direction
    const orientation = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    
    // Avoid gimbal lock if direction is parallel to up
    if (Math.abs(direction.normalize().dot(up)) > 0.99) {
       orientation.lookAt(new THREE.Vector3(0,0,0), direction, new THREE.Vector3(1,0,0));
    } else {
        orientation.lookAt(new THREE.Vector3(0,0,0), direction, up);
    }
    
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.normalize());

    return (
        <mesh position={midPoint} quaternion={quaternion}>
            <cylinderGeometry args={[0.1, 0.1, length, 12]} />
            <meshStandardMaterial color="#888888" />
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
                return <BondMesh key={`bond-${i}`} start={new THREE.Vector3(a1.x, a1.y, a1.z)} end={new THREE.Vector3(a2.x, a2.y, a2.z)} />;
            })}
        </group>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};