import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Text, Billboard } from '@react-three/drei';
import { useStore } from '../store';

type Vec3 = [number, number, number];

function normalise(v: Vec3): Vec3 {
  const [x, y, z] = v;
  const len = Math.sqrt(x * x + y * y + z * z);
  return len > 0.001 ? [x / len, y / len, z / len] : [0, 1, 0];
}

function AxisLabel({ position, label, color }: { position: Vec3; label: string; color: string }) {
  return (
    <Billboard position={position}>
      <Text fontSize={0.15} color={color} anchorX="center" anchorY="middle">
        {label}
      </Text>
    </Billboard>
  );
}

function BlochScene({ blochState }: { blochState: Vec3 }) {
  const tip = normalise(blochState);
  const AX = 1.58; // axis line + label distance, just outside sphere

  return (
    <>
      <ambientLight intensity={0.75} />
      <pointLight position={[2, 3, 2]} intensity={1.5} />
      <pointLight position={[-2, -1, -1]} intensity={0.5} color="#3050a0" />

      {/* Sphere shell — glossy blue so it reads clearly on dark bg */}
      <Sphere args={[1, 32, 32]}>
        <meshPhongMaterial
          color="#1a3060"
          transparent
          opacity={0.78}
          shininess={70}
          specular="#3060b0"
        />
      </Sphere>
      {/* Wireframe lattice */}
      <Sphere args={[1.005, 16, 16]}>
        <meshBasicMaterial color="#2e55a0" wireframe transparent opacity={0.55} />
      </Sphere>

      {/* Axis lines */}
      <Line points={[[-AX, 0, 0], [AX, 0, 0]]} color="#5090c8" lineWidth={1.5} />
      <Line points={[[0, -AX, 0], [0, AX, 0]]} color="#5090c8" lineWidth={1.5} />
      <Line points={[[0, 0, -AX], [0, 0, AX]]} color="#5090c8" lineWidth={1.5} />

      {/* Axis labels — Billboard keeps them always upright, facing camera */}
      <AxisLabel position={[0,  AX + 0.18, 0]} label="|0⟩"  color="#80c8ff" />
      <AxisLabel position={[0, -AX - 0.18, 0]} label="|1⟩"  color="#c080ff" />
      <AxisLabel position={[ AX + 0.18, 0, 0]} label="|+⟩"  color="#7aacd8" />
      <AxisLabel position={[-AX - 0.18, 0, 0]} label="|−⟩"  color="#7aacd8" />
      <AxisLabel position={[0, 0,  AX + 0.18]} label="|i⟩"  color="#7aacd8" />
      <AxisLabel position={[0, 0, -AX - 0.18]} label="|−i⟩" color="#7aacd8" />

      {/* Pole markers */}
      <mesh position={[0, AX, 0]}>
        <sphereGeometry args={[0.048, 8, 8]} />
        <meshBasicMaterial color="#70b8ff" />
      </mesh>
      <mesh position={[0, -AX, 0]}>
        <sphereGeometry args={[0.048, 8, 8]} />
        <meshBasicMaterial color="#b070f0" />
      </mesh>

      {/* State vector */}
      <Line points={[[0, 0, 0], tip]} color="#4F7DF3" lineWidth={3} />
      <mesh position={tip}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color="#4F7DF3" />
      </mesh>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1.2}
        makeDefault
      />
    </>
  );
}

interface Props {
  blochState?: Vec3;
}

export default function BlochSphere({ blochState: blochStateProp }: Props) {
  const snapshots = useStore((s) => s.snapshots);
  const playbackIdx = useStore((s) => s.playbackIdx);
  const snap = snapshots[playbackIdx] ?? snapshots[snapshots.length - 1];
  const blochState: Vec3 = blochStateProp ?? (snap?.bloch_state as Vec3 | undefined) ?? [0, 1, 0];

  return (
    <div className="bg-[var(--color-obsidian)] border border-[var(--color-gunmetal)] rounded-[5px] p-4">
      <p className="text-[var(--color-steel)] text-xs mb-1 uppercase tracking-widest">Qubit State</p>
      <p className="text-[var(--color-silver)] text-xs mb-3">
        This is a qubit — the quantum equivalent of a coin that can be both heads and tails at once
      </p>
      <div style={{ height: 240, width: '100%' }}>
        <Canvas camera={{ position: [0, 0, 3.8], fov: 50 }}>
          <BlochScene blochState={blochState} />
        </Canvas>
      </div>
    </div>
  );
}
