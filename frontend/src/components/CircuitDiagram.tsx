import { useStore } from '../store';
import type { Gate, SolverSnapshot } from '../types';

const QUBIT_HEIGHT = 32;
const LAYER_WIDTH = 48;
const LEFT_MARGIN = 40;
const TOP_MARGIN = 24;

const GATE_COLORS: Record<string, string> = {
  H: '#4F7DF3',
  RZ: '#8B5CF6',
  RX: '#22D3EE',
  CNOT: '#D946EF',
};

interface Props {
  snapshot?: SolverSnapshot;
}

export default function CircuitDiagram({ snapshot }: Props) {
  const snapshots = useStore((s) => s.snapshots);
  const playbackIdx = useStore((s) => s.playbackIdx);
  const data = snapshot ?? snapshots[playbackIdx] ?? snapshots[snapshots.length - 1];

  if (!data || data.circuit_repr.length === 0) {
    return (
      <div className="bg-[var(--color-obsidian)] border border-[var(--color-gunmetal)] rounded-[5px] p-4 flex items-center justify-center h-40">
        <p className="text-[var(--color-steel)] text-sm">Circuit building…</p>
      </div>
    );
  }

  const gates: Gate[] = data.circuit_repr;
  const nQubits = Math.max(...gates.map((g) => Math.max(g.qubit, g.target ?? 0))) + 1;
  const maxLayer = gates.reduce((m, g) => Math.max(m, g.layer), 0);
  const svgWidth = LEFT_MARGIN + (maxLayer + 2) * LAYER_WIDTH;
  const svgHeight = TOP_MARGIN * 2 + nQubits * QUBIT_HEIGHT;
  const qy = (q: number) => TOP_MARGIN + q * QUBIT_HEIGHT;

  return (
    <div className="bg-[var(--color-obsidian)] border border-[var(--color-gunmetal)] rounded-[5px] p-4">
      <p className="text-[var(--color-steel)] text-xs mb-1 uppercase tracking-widest">Quantum Circuit</p>
      <p className="text-[var(--color-silver)] text-xs mb-3">
        The γ (RZ) and β (RX) rotation angles evolve each iteration as the solver tunes the circuit
      </p>
      <div className="overflow-x-auto">
        <svg width={Math.min(svgWidth, 600)} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          {Array.from({ length: nQubits }, (_, q) => (
            <g key={q}>
              <line
                x1={LEFT_MARGIN - 10} y1={qy(q)}
                x2={LEFT_MARGIN + (maxLayer + 1) * LAYER_WIDTH} y2={qy(q)}
                stroke="#1A1A24" strokeWidth={2}
              />
              <text x={8} y={qy(q) + 4} fill="#6B6B7B" fontSize={10} fontFamily="monospace">
                q{q}
              </text>
            </g>
          ))}

          {gates.map((gate, i) => {
            const x = LEFT_MARGIN + gate.layer * LAYER_WIDTH;
            const y = qy(gate.qubit);
            const color = GATE_COLORS[gate.type] ?? '#6B6B7B';

            if (gate.type === 'CNOT' && gate.target !== undefined) {
              const ty = qy(gate.target);
              return (
                <g key={i}>
                  <line x1={x} y1={y} x2={x} y2={ty} stroke={color} strokeWidth={1.5} />
                  <circle cx={x} cy={y} r={5} fill={color} />
                  <circle cx={x} cy={ty} r={7} fill="none" stroke={color} strokeWidth={1.5} />
                  <line x1={x - 7} y1={ty} x2={x + 7} y2={ty} stroke={color} strokeWidth={1.5} />
                  <line x1={x} y1={ty - 7} x2={x} y2={ty + 7} stroke={color} strokeWidth={1.5} />
                </g>
              );
            }

            const hasAngle = gate.angle !== undefined;
            const boxH = hasAngle ? 26 : 18;
            return (
              <g key={i}>
                <rect x={x - 14} y={y - boxH / 2} width={28} height={boxH} rx={3}
                  fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1} />
                <text x={x} y={hasAngle ? y - 3 : y + 4} textAnchor="middle"
                  fill={color} fontSize={9} fontFamily="monospace" fontWeight="600">
                  {gate.type}
                </text>
                {hasAngle && (
                  <text x={x} y={y + 9} textAnchor="middle"
                    fill={color} fontSize={7} fontFamily="monospace" opacity={0.8}>
                    {gate.angle!.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
