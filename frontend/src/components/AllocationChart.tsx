import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Portfolio } from '../types';

const COLORS = [
  '#4F7DF3',
  '#8B5CF6',
  '#22D3EE',
  '#D946EF',
  '#C8C8D4',
  '#6B6B7B',
  '#4F7DF3aa',
  '#8B5CF6aa',
];

interface Props {
  portfolio: Portfolio;
  label: string;
}

export default function AllocationChart({ portfolio, label }: Props) {
  const data = portfolio.allocations
    .filter((a) => a.weight > 0.001)
    .map((a) => ({ name: a.ticker, value: Math.round(a.weight * 1000) / 10 }));

  return (
    <div className="space-y-2">
      <p className="text-[var(--color-steel)] text-xs uppercase tracking-widest">{label}</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            isAnimationActive
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--color-gunmetal)',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              color: 'var(--color-near-white)',
            }}
            formatter={(v) => [`${v}%`, 'Allocation']}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(v) => <span style={{ color: 'var(--color-silver)', fontSize: 12 }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
