
import React, { useMemo } from 'react';
import * as THREE from 'three';

// Custom Shader for Volumetric-like Orbital Effect
export const OrbitalShaderMaterial = {
  uniforms: {
    color: { value: new THREE.Color(0x0000ff) },
    opacity: { value: 0.4 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float opacity;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      float dotProduct = dot(normal, viewDir);
      // Fresnel effect: brighter at edges, transparent in center
      float fresnel = pow(1.0 - abs(dotProduct), 3.0);
      // Base alpha plus fresnel
      float alpha = opacity * (0.1 + 0.9 * fresnel);
      gl_FragColor = vec4(color, alpha);
    }
  `,
  transparent: true,
  side: THREE.FrontSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending
};

export const OrbitalLobe: React.FC<{ position?: [number, number, number], color: string, scale?: number }> = ({ position = [0,0,0], color, scale = 1 }) => {
    const materialRef = React.useRef<THREE.ShaderMaterial>(null);
    
    const shaderArgs = useMemo(() => ({
        uniforms: {
            color: { value: new THREE.Color(color) },
            opacity: { value: 0.5 }
        },
        vertexShader: OrbitalShaderMaterial.vertexShader,
        fragmentShader: OrbitalShaderMaterial.fragmentShader,
        transparent: true,
        side: THREE.FrontSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    }), [color]);

    return (
        <mesh position={position} scale={scale}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <shaderMaterial args={[shaderArgs]} ref={materialRef} />
        </mesh>
    )
}

export const OrbitalS: React.FC<{ position: [number, number, number], scale?: number }> = ({ position, scale = 1 }) => {
    return (
        <group position={position}>
            <OrbitalLobe color="#3b82f6" scale={scale * 1.2} />
        </group>
    )
}

export const OrbitalP: React.FC<{ position: [number, number, number], scale?: number }> = ({ position, scale = 1 }) => {
    const dist = 0.4 * scale;
    const lobeScale = 0.8 * scale;
    return (
        <group position={position}>
             {/* Pz */}
            <OrbitalLobe position={[0, 0, dist]} color="#3b82f6" scale={lobeScale} />
            <OrbitalLobe position={[0, 0, -dist]} color="#ef4444" scale={lobeScale} />
            {/* Px */}
            <OrbitalLobe position={[dist, 0, 0]} color="#3b82f6" scale={lobeScale} />
            <OrbitalLobe position={[-dist, 0, 0]} color="#ef4444" scale={lobeScale} />
            {/* Py */}
            <OrbitalLobe position={[0, dist, 0]} color="#3b82f6" scale={lobeScale} />
            <OrbitalLobe position={[0, -dist, 0]} color="#ef4444" scale={lobeScale} />
        </group>
    )
}
