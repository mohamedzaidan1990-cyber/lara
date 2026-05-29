"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";

const GOLD = "#F4D360";

// Shared liquid-gold material. Metalness needs lights + an env map to read as
// gold rather than black — both are provided in the scene below.
function useGold() {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(GOLD),
        metalness: 0.9,
        roughness: 0.1,
        envMapIntensity: 1.0
      }),
    []
  );
}

// ---- Beauty-themed objects, built from primitives ----

function Lipstick({ material }: { material: THREE.Material }) {
  return (
    <group rotation={[0.18, 0, 0.25]}>
      {/* case */}
      <mesh material={material} position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.95, 48]} />
      </mesh>
      {/* bullet tip */}
      <mesh material={material} position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.15, 0.16, 0.3, 48]} />
      </mesh>
      <mesh material={material} position={[0, 0.46, 0]}>
        <sphereGeometry args={[0.15, 48, 48]} />
      </mesh>
    </group>
  );
}

function PerfumeBottle({ material }: { material: THREE.Material }) {
  return (
    <group>
      {/* body — wide, short */}
      <mesh material={material}>
        <boxGeometry args={[0.8, 0.7, 0.4]} />
      </mesh>
      {/* neck */}
      <mesh material={material} position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.28, 32]} />
      </mesh>
      {/* cap */}
      <mesh material={material} position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.18, 32]} />
      </mesh>
    </group>
  );
}

function CreamJar({ material }: { material: THREE.Material }) {
  return (
    <group>
      {/* jar — wide flat disc */}
      <mesh material={material} position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.36, 56]} />
      </mesh>
      {/* lid — slightly smaller disc */}
      <mesh material={material} position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.16, 56]} />
      </mesh>
    </group>
  );
}

function SerumDropper({ material }: { material: THREE.Material }) {
  return (
    <group rotation={[0, 0, -0.12]}>
      {/* thin tube */}
      <mesh material={material} position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 1.0, 40]} />
      </mesh>
      {/* dropper bulb */}
      <mesh material={material} position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.17, 40, 40]} />
      </mesh>
    </group>
  );
}

interface Placed {
  Comp: (p: { material: THREE.Material }) => JSX.Element;
  pos: [number, number, number];
  scale: number;
}

const OBJECTS: Placed[] = [
  { Comp: Lipstick, pos: [-2.1, 0.5, 0], scale: 1 },
  { Comp: PerfumeBottle, pos: [2.0, -0.2, -0.6], scale: 1 },
  { Comp: CreamJar, pos: [0.1, 1.35, -1], scale: 0.95 },
  { Comp: SerumDropper, pos: [1.5, 1.2, 0.4], scale: 0.9 },
  { Comp: Lipstick, pos: [-1.4, -1.25, 0.3], scale: 0.75 }
];

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

  const material = useMemo(
    () => new THREE.PointsMaterial({ color: new THREE.Color(GOLD), size: 0.05, transparent: true, opacity: 0.8, depthWrite: false }),
    []
  );

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
    <points ref={ref} material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
    </points>
  );
}

// Isolate Environment (loads an HDR over the network) so a failure can't take
// down the whole scene — the lights alone still render the gold nicely.
class EnvBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Scene({ count, particleCount }: { count: number; particleCount: number }) {
  const group = useRef<THREE.Group>(null);
  const gold = useGold();
  useFrame((state) => {
    if (group.current) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.3;
  });
  const objects = OBJECTS.slice(0, count);

  return (
    <>
      <ambientLight intensity={0.5} color="#FFF5E6" />
      <pointLight position={[10, 10, 10]} intensity={1.5} color={GOLD} />
      <pointLight position={[-10, -10, -5]} intensity={0.8} color="#FFFFFF" />
      <spotLight position={[0, 10, 5]} intensity={1} color="#FFFDF5" />

      <EnvBoundary>
        <Suspense fallback={null}>
          <Environment preset="studio" />
        </Suspense>
      </EnvBoundary>

      <group ref={group}>
        {objects.map((o, i) => {
          const Shape = o.Comp;
          return (
            <Float key={i} speed={1.5} rotationIntensity={0.5} floatIntensity={0.8}>
              <group position={o.pos} scale={o.scale}>
                <Shape material={gold} />
              </group>
            </Float>
          );
        })}
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
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      <Scene count={mobile ? 2 : 5} particleCount={mobile ? 100 : 200} />
    </Canvas>
  );
}
