import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { useStore } from '../store';
import type { SolverSnapshot } from '../types';

interface TooltipArgs { active?: boolean; payload?: { value: number }[]; label?: string | number; }

function CustomTooltip({ active, payload, label }: TooltipArgs) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value as number;
  return (
    <div style={{
      background: 'rgba(10, 10, 18, 0.82)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(79, 125, 243, 0.25)',
      borderRadius: 6,
      padding: '8px 12px',
      boxShadow: '0 0 18px rgba(79, 125, 243, 0.1)',
      pointerEvents: 'none',
    }}>
      <p style={{ margin: 0, fontSize: 10, color: '#606080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
        Iter {label}
      </p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#4F7DF3', letterSpacing: '-0.01em' }}>
        {typeof value === 'number' ? value.toFixed(4) : value}
      </p>
      <p style={{ margin: '3px 0 0', fontSize: 10, color: '#606080', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        energy
      </p>
    </div>
  );
}

interface Props {
  snapshotsOverride?: SolverSnapshot[];
  upToIdx?: number;
}

export default function LossChart({ snapshotsOverride, upToIdx }: Props) {
  const storeSnapshots = useStore((s) => s.snapshots);
  const playbackIdx = useStore((s) => s.playbackIdx);

  const allSnapshots = snapshotsOverride ?? storeSnapshots;
  const cutoff = upToIdx !== undefined ? upToIdx + 1 : (snapshotsOverride ? allSnapshots.length : playbackIdx + 1);
  const visible = allSnapshots.slice(0, cutoff);

  const data = visible.map((s) => ({ i: s.iteration, loss: parseFloat(s.loss.toFixed(4)) }));

  return (
    <div className="bg-[var(--color-obsidian)] border border-[var(--color-gunmetal)] rounded-[5px] p-4">
      <p className="text-[var(--color-steel)] text-xs mb-1 uppercase tracking-widest">Energy</p>
      <p className="text-[var(--color-silver)] text-xs mb-3">
        Lower is better — the solver is trying to reach the lowest point
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data}>
          <XAxis dataKey="i" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(79, 125, 243, 0.2)', strokeWidth: 1, strokeDasharray: '4 2' }}
          />
          <Line
            type="monotone"
            dataKey="loss"
            stroke="var(--color-quantum-blue)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {data.length > 0 && upToIdx !== undefined && (
            <ReferenceLine
              x={data[data.length - 1]?.i}
              stroke="var(--color-cyan)"
              strokeDasharray="3 3"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
