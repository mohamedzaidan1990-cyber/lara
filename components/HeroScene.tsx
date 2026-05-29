"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const GOLD = "#F4D360";
const CREAM = "#FFFDF5";

// Liquid-gold material: highly metallic, low roughness, faint warm emissive.
function GoldMaterial() {
  return (
    <meshStandardMaterial color={GOLD} metalness={1} roughness={0.12} emissive="#2a2000" emissiveIntensity={0.2} />
  );
}

interface ShapeDef {
  pos: [number, number, number];
  geo: "sphere" | "cylinder" | "capsule" | "torus";
  scale: number;
}

// Abstract luxury beauty forms: jar, perfume bottle, lipstick, ring.
const ALL_SHAPES: ShapeDef[] = [
  { pos: [-1.7, 0.5, 0], geo: "capsule", scale: 1 },
  { pos: [1.7, -0.4, -0.6], geo: "sphere", scale: 1 },
  { pos: [0.1, 1.5, -1], geo: "cylinder", scale: 1 },
  { pos: [1.3, 1.2, 0.5], geo: "torus", scale: 1 },
  { pos: [-1.2, -1.2, 0.3], geo: "sphere", scale: 0.7 }
];

function Geo({ def }: { def: ShapeDef }) {
  switch (def.geo) {
    case "sphere":
      return (
        <mesh position={def.pos} scale={def.scale}>
          <sphereGeometry args={[0.8, 48, 48]} />
          <GoldMaterial />
        </mesh>
      );
    case "cylinder":
      return (
        <mesh position={def.pos} scale={def.scale}>
          <cylinderGeometry args={[0.42, 0.42, 1.4, 48]} />
          <GoldMaterial />
        </mesh>
      );
    case "capsule":
      return (
        <mesh position={def.pos} scale={def.scale}>
          <capsuleGeometry args={[0.45, 0.9, 16, 32]} />
          <GoldMaterial />
        </mesh>
      );
    case "torus":
      return (
        <mesh position={def.pos} scale={def.scale}>
          <torusGeometry args={[0.55, 0.2, 32, 64]} />
          <GoldMaterial />
        </mesh>
      );
    default:
      return null;
  }
}

function Particles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      a[i * 3] = (Math.random() - 0.5) * 12;
      a[i * 3 + 1] = (Math.random() - 0.5) * 10;
      a[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return a;
  }, [count]);

  useFrame((_, delta) => {
    const p = ref.current;
    if (!p) return;
    const arr = p.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      arr[i * 3 + 1] += delta * 0.35;
      if (arr[i * 3 + 1] > 5) arr[i * 3 + 1] = -5;
    }
    p.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={GOLD} size={0.07} transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Scene({ shapeCount, particleCount }: { shapeCount: number; particleCount: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.35;
  });
  const shapes = ALL_SHAPES.slice(0, shapeCount);
  return (
    <>
      <ambientLight color="#FFF5E6" intensity={0.6} />
      <pointLight color={GOLD} position={[5, 5, 5]} intensity={1.5} />
      <pointLight color="#FFFFFF" position={[-5, -3, 4]} intensity={0.5} />
      <group ref={group}>
        {shapes.map((d, i) => (
          <Float key={i} speed={1.2} rotationIntensity={0.6} floatIntensity={1.1} floatingRange={[-0.15, 0.15]}>
            <Geo def={d} />
          </Float>
        ))}
      </group>
      <Particles count={particleCount} />
    </>
  );
}

export default function HeroScene() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(window.innerWidth < 768);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 45 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: CREAM }}
    >
      {/* Fog fakes a soft depth-of-field falloff toward the back. */}
      <fog attach="fog" args={[CREAM, 8, 16]} />
      <Scene shapeCount={mobile ? 2 : 5} particleCount={mobile ? 100 : 200} />
    </Canvas>
  );
}
