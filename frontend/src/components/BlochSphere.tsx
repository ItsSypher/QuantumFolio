import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Line } from '@react-three/drei';
import { useStore } from '../store';

type Vec3 = [number, number, number];

function normalise(v: Vec3): Vec3 {
  const [x, y, z] = v;
  const len = Math.sqrt(x * x + y * y + z * z);
  return len > 0.001 ? [x / len, y / len, z / len] : [0, 1, 0];
}

function BlochScene({ blochState }: { blochState: Vec3 }) {
  const tip = normalise(blochState);

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[2, 2, 2]} intensity={0.9} />

      {/* Sphere shell — dark navy, clearly visible against black background */}
      <Sphere args={[1, 32, 32]}>
        <meshStandardMaterial color="#0e1f3d" transparent opacity={0.7} />
      </Sphere>
      {/* Wireframe lattice — blue-tinted, visible */}
      <Sphere args={[1.005, 16, 16]}>
        <meshBasicMaterial color="#1e3a64" wireframe transparent opacity={0.45} />
      </Sphere>

      {/* Axis lines — steel blue, clearly visible */}
      <Line points={[[-1.35, 0, 0], [1.35, 0, 0]]} color="#3a6090" lineWidth={1.5} />
      <Line points={[[0, -1.35, 0], [0, 1.35, 0]]} color="#3a6090" lineWidth={1.5} />
      <Line points={[[0, 0, -1.35], [0, 0, 1.35]]} color="#3a6090" lineWidth={1.5} />

      {/* Pole markers — |0⟩ north (blue), |1⟩ south (violet) */}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.048, 8, 8]} />
        <meshBasicMaterial color="#60aaff" />
      </mesh>
      <mesh position={[0, -1.35, 0]}>
        <sphereGeometry args={[0.048, 8, 8]} />
        <meshBasicMaterial color="#a060f0" />
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
      <div style={{ height: 192, width: '100%' }}>
        <Canvas camera={{ position: [0, 0, 2.8], fov: 45 }}>
          <BlochScene blochState={blochState} />
        </Canvas>
      </div>
    </div>
  );
}
