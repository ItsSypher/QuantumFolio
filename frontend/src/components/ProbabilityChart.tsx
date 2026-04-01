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

const COLOR_HEX = ['#4F7DF3', '#8B5CF6', '#22D3EE', '#D946EF', '#9CA3AF'];

interface TooltipArgs { active?: boolean; payload?: { value: number; payload: { index: number } }[]; label?: string; }

function CustomTooltip({ active, payload, label }: TooltipArgs) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value as number;
  const colorIdx = (payload[0].payload as { index: number }).index % COLOR_HEX.length;
  const accent = COLOR_HEX[colorIdx];
  return (
    <div style={{
      background: 'rgba(10, 10, 18, 0.82)',
      backdropFilter: 'blur(10px)',
      border: `1px solid rgba(${hexToRgb(accent)}, 0.3)`,
      borderRadius: 6,
      padding: '8px 12px',
      boxShadow: `0 0 18px rgba(${hexToRgb(accent)}, 0.12)`,
      pointerEvents: 'none',
    }}>
      <p style={{ margin: 0, fontSize: 10, color: '#606080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
        Probability
      </p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: accent, letterSpacing: '-0.01em' }}>
        {value.toFixed(2)}%
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#9090b0', maxWidth: 180, lineHeight: 1.4 }}>
        {label}
      </p>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

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
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(79, 125, 243, 0.06)' }}
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
