import { useStore } from '../store';
import AllocationChart from '../components/AllocationChart';
import MetricCard from '../components/MetricCard';
import Narration from '../components/Narration';
import LossChart from '../components/LossChart';
import ProbabilityChart from '../components/ProbabilityChart';
import CircuitDiagram from '../components/CircuitDiagram';
import BlochSphere from '../components/BlochSphere';

export default function ResultsView() {
  const { result, snapshots, playbackIdx, setPlaybackIdx, reset } = useStore();

  if (!result) return null;

  const { quantum } = result;
  const currentSnap = snapshots[playbackIdx];
  const totalSnaps = snapshots.length;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-gunmetal)] rounded-full text-xs text-[var(--color-cyan)] uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-cyan)]" />
          Optimisation Complete
        </div>
        <h1 className="text-2xl font-light text-[var(--color-near-white)]">Your Portfolio</h1>
      </div>

      {/* ── Portfolio result ──────────────────────────────────────── */}
      <div className="bg-[var(--color-obsidian)] border border-[var(--color-gunmetal)] rounded-[6px] p-6">
        <AllocationChart portfolio={quantum} label="Recommended Allocation" />
      </div>

      <MetricCard portfolio={quantum} />

      {/* Why these assets */}
      <div className="bg-[var(--color-obsidian)] border border-[var(--color-gunmetal)] rounded-[6px] p-6 space-y-3">
        <p className="text-xs text-[var(--color-steel)] uppercase tracking-widest">Why These Assets?</p>
        <div className="space-y-2">
          {quantum.explanations.map((ex) => (
            <div key={ex.ticker} className="flex gap-3">
              <span className="text-[var(--color-quantum-blue)] font-medium text-sm w-14 shrink-0">
                {ex.ticker}
              </span>
              <p className="text-[var(--color-silver)] text-sm leading-relaxed">{ex.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quantum Journey replay ────────────────────────────────── */}
      {totalSnaps > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-violet)]" />
            <p className="text-[var(--color-near-white)] text-sm font-light tracking-tight">
              Quantum Journey
            </p>
            <span className="text-[var(--color-steel)] text-xs ml-auto">
              Scrub the timeline to replay the solver
            </span>
          </div>

          {/* Narration for current playback position */}
          {currentSnap && <Narration snapshot={currentSnap} />}

          {/* Charts side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LossChart upToIdx={playbackIdx} />
            <ProbabilityChart snapshot={currentSnap} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CircuitDiagram snapshot={currentSnap} />
            <BlochSphere blochState={currentSnap?.bloch_state} />
          </div>

          {/* Timeline slider */}
          <div className="bg-[var(--color-obsidian)] border border-[var(--color-gunmetal)] rounded-[5px] p-4 space-y-3">
            <div className="flex justify-between text-xs text-[var(--color-steel)]">
              <span>Iteration 1</span>
              <span className="text-[var(--color-silver)]">
                Iteration {(currentSnap?.iteration ?? 1)} / {totalSnaps}
              </span>
              <span>Iteration {totalSnaps}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, totalSnaps - 1)}
              step={1}
              value={playbackIdx}
              onChange={(e) => setPlaybackIdx(parseInt(e.target.value))}
              className="w-full appearance-none h-1.5 rounded-full cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--color-violet) 0%, var(--color-quantum-blue) ${(playbackIdx / Math.max(totalSnaps - 1, 1)) * 100}%, var(--color-gunmetal) ${(playbackIdx / Math.max(totalSnaps - 1, 1)) * 100}%, var(--color-gunmetal) 100%)`,
              }}
            />
            <p className="text-center text-xs text-[var(--color-steel)]">
              {currentSnap?.status === 'converged'
                ? 'Solver converged'
                : `Energy: ${currentSnap?.loss.toFixed(4) ?? '—'}`}
            </p>
          </div>
        </div>
      )}

      {/* Run again */}
      <div className="text-center pt-2 pb-8">
        <button
          onClick={reset}
          className="px-8 py-3 border border-[var(--color-gunmetal)] rounded-[5px] text-sm text-[var(--color-silver)] hover:border-[var(--color-quantum-blue)] hover:text-[var(--color-near-white)] hover:shadow-[0_0_16px_rgba(79,125,243,0.12)] transition-all duration-200"
        >
          Run Again
        </button>
      </div>
    </div>
  );
}
