import { useStore } from '../store';
import type { SolverSnapshot } from '../types';

interface Props {
  snapshot?: SolverSnapshot;
}

export default function Narration({ snapshot }: Props) {
  const snapshots = useStore((s) => s.snapshots);
  const playbackIdx = useStore((s) => s.playbackIdx);
  const data = snapshot ?? snapshots[playbackIdx] ?? snapshots[snapshots.length - 1];

  if (!data) {
    return (
      <div className="bg-[var(--color-obsidian)] border border-[var(--color-gunmetal)] rounded-[5px] p-4 text-[var(--color-steel)] text-sm italic">
        Connecting to quantum solver…
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-obsidian)] border border-[var(--color-quantum-blue)] border-opacity-30 rounded-[5px] p-4 shadow-[0_0_16px_rgba(79,125,243,0.06)]">
      <p className="text-[var(--color-near-white)] text-sm leading-relaxed">{data.narration}</p>
      <p className="text-[var(--color-steel)] text-xs mt-1">
        Iteration {data.iteration} of {data.max_iterations}
      </p>
    </div>
  );
}
