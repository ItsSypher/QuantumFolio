import Narration from '../components/Narration';
import LossChart from '../components/LossChart';
import ProbabilityChart from '../components/ProbabilityChart';
import CircuitDiagram from '../components/CircuitDiagram';
import BlochSphere from '../components/BlochSphere';
import ProgressBar from '../components/ProgressBar';
import LegalDisclaimer from '../components/LegalDisclaimer';

export default function SolverView() {
  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="w-2 h-2 rounded-full bg-[var(--color-quantum-blue)] animate-pulse" />
        <h2 className="text-[var(--color-near-white)] text-lg font-light tracking-tight">
          Quantum Solver Running
        </h2>
      </div>

      <ProgressBar />
      <Narration />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LossChart />
        <ProbabilityChart />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CircuitDiagram />
        <BlochSphere />
      </div>

      <LegalDisclaimer />
    </div>
  );
}
