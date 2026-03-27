import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { useStore } from '../store';
import type { SolverSnapshot } from '../types';

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
            contentStyle={{
              background: 'var(--color-gunmetal)',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              color: 'var(--color-near-white)',
            }}
            formatter={(v) => [typeof v === 'number' ? v.toFixed(4) : String(v), 'Loss']}
            labelFormatter={(l) => `Iter ${l}`}
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
