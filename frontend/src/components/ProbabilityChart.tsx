import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useStore } from '../store';
import type { SolverSnapshot } from '../types';

const COLORS = [
  'var(--color-quantum-blue)',
  'var(--color-violet)',
  'var(--color-cyan)',
  'var(--color-magenta)',
  'var(--color-silver)',
];

interface Props {
  snapshot?: SolverSnapshot;
}

export default function ProbabilityChart({ snapshot }: Props) {
  const snapshots = useStore((s) => s.snapshots);
  const playbackIdx = useStore((s) => s.playbackIdx);
  const data_src = snapshot ?? snapshots[playbackIdx] ?? snapshots[snapshots.length - 1];

  if (!data_src) return null;

  const data = data_src.top_portfolios.map((p, i) => ({
    label: p.label,
    prob: parseFloat((p.probability * 100).toFixed(2)),
    index: i,
  }));

  return (
    <div className="bg-[var(--color-obsidian)] border border-[var(--color-gunmetal)] rounded-[5px] p-4">
      <p className="text-[var(--color-steel)] text-xs mb-1 uppercase tracking-widest">Portfolio Probability</p>
      <p className="text-[var(--color-silver)] text-xs mb-3">
        The quantum solver is concentrating probability on the best combinations
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--color-steel)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-steel)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-gunmetal)',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              color: 'var(--color-near-white)',
            }}
            formatter={(v) => [`${v}%`, 'Probability']}
          />
          <Bar dataKey="prob" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
