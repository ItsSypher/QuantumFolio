import { useState } from 'react';
import TickerSearch from '../components/TickerSearch';
import RiskSlider from '../components/RiskSlider';
import { useStore } from '../store';
import { startOptimize, connectSolverStream } from '../api';
import type { WsMessage } from '../types';

export default function InputView() {
  const { selectedTickers, riskAversion, setJobId, setView, appendSnapshot, setResult, setError } = useStore();
  const [loading, setLoading] = useState(false);

  const canSubmit = selectedTickers.length >= 5 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const jobId = await startOptimize(selectedTickers.map((t) => t.ticker), riskAversion);
      setJobId(jobId);
      setView('solver');

      connectSolverStream(
        jobId,
        (msg: WsMessage) => {
          if (msg.type === 'snapshot') appendSnapshot(msg.data);
          else if (msg.type === 'result') setResult(msg.data);
          else if (msg.type === 'error') { setError(msg.data.message); setView('input'); }
        },
        () => {},
        () => { setError('Connection lost. Please try again.'); setView('input'); }
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start optimization');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-gunmetal)] rounded-full text-xs text-[var(--color-quantum-blue)] uppercase tracking-widest mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-quantum-blue)] animate-pulse" />
            Quantum-Powered
          </div>
          <h1 className="text-4xl font-light text-[var(--color-near-white)] tracking-tight">
            QuantumFolio
          </h1>
          <p className="text-[var(--color-steel)] text-sm max-w-sm mx-auto leading-relaxed">
            Build an optimised investment portfolio. Pick your stocks, set your risk
            preference, and watch a quantum solver find your best combination.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-obsidian)] border border-[var(--color-gunmetal)] rounded-[6px] p-6 space-y-6">
          <div>
            <label className="block text-xs text-[var(--color-steel)] uppercase tracking-widest mb-2">
              Your Stocks
            </label>
            <TickerSearch />
          </div>

          <div>
            <label className="block text-xs text-[var(--color-steel)] uppercase tracking-widest mb-3">
              Your Goal
            </label>
            <RiskSlider />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-3 rounded-[5px] text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canSubmit
                ? 'linear-gradient(135deg, var(--color-quantum-blue), var(--color-violet))'
                : 'var(--color-gunmetal)',
              color: 'var(--color-near-white)',
              boxShadow: canSubmit ? '0 0 24px rgba(79,125,243,0.2)' : 'none',
            }}
          >
            {loading ? 'Starting…' : 'Find My Portfolio'}
          </button>

          {selectedTickers.length < 5 && (
            <p className="text-center text-xs text-[var(--color-steel)]">
              Select at least 5 stocks to begin
            </p>
          )}
        </div>

        <p className="text-center text-xs text-[var(--color-steel)]">
          No account needed · Data from Yahoo Finance · Runs entirely on our server
        </p>
      </div>
    </div>
  );
}
