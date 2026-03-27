import { useStore } from '../store';
import { useEffect, useRef, useState } from 'react';

export default function ProgressBar() {
  const snapshots = useStore((s) => s.snapshots);
  // Always show live progress (latest snapshot) during solve
  const latest = snapshots[snapshots.length - 1];
  const startRef = useRef<number>(Date.now());
  const [eta, setEta] = useState<string>('');

  useEffect(() => {
    if (!latest || latest.iteration === 0) return;
    const elapsed = (Date.now() - startRef.current) / 1000;
    const rate = latest.iteration / elapsed;
    const remaining = (latest.max_iterations - latest.iteration) / rate;
    if (remaining > 0 && remaining < 300) {
      setEta(`~${Math.ceil(remaining)}s remaining`);
    }
  }, [latest]);

  if (!latest) return null;

  const pct = Math.round((latest.iteration / latest.max_iterations) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-[var(--color-steel)]">
        <span>Optimising…</span>
        <span>{eta || `${pct}%`}</span>
      </div>
      <div className="h-1 bg-[var(--color-gunmetal)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: pct < 40
              ? 'var(--color-quantum-blue)'
              : pct < 80
              ? 'var(--color-violet)'
              : 'var(--color-cyan)',
          }}
        />
      </div>
    </div>
  );
}
