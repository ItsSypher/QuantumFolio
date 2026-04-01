import { Component, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useStore } from './store';
import InputView from './views/InputView';
import SolverView from './views/SolverView';
import ResultsView from './views/ResultsView';
import WakeUpScreen from './components/WakeUpScreen';
import { checkHealth } from './api';

// ── Error boundary so any component crash shows a message, not a white page ──
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#08080D',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 32,
          }}
        >
          <p style={{ color: '#D946EF', fontSize: 13 }}>⚠ Something went wrong</p>
          <p style={{ color: '#6B6B7B', fontSize: 12, maxWidth: 400, textAlign: 'center' }}>
            {(this.state.error as Error).message}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              marginTop: 8,
              padding: '8px 20px',
              border: '1px solid #1A1A24',
              borderRadius: 5,
              background: 'transparent',
              color: '#C8C8D4',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Main app ──────────────────────────────────────────────────────────────────
function AppInner() {
  const { view, error, setError, setView } = useStore();

  // 'checking' → silent first probe; 'sleeping' → show WakeUpScreen; 'awake' → normal
  const [backend, setBackend] = useState<'checking' | 'sleeping' | 'awake'>('checking');
  const handleReady = useCallback(() => setBackend('awake'), []);

  useEffect(() => {
    // Quick initial probe — if it replies within 3 s the service is warm, skip the screen
    checkHealth(3000).then((ok) => setBackend(ok ? 'awake' : 'sleeping'));
  }, []);

  if (backend === 'checking') {
    // Blank void while the first probe is in flight (usually < 200 ms on a warm backend)
    return <div style={{ minHeight: '100vh', background: '#08080D' }} />;
  }
  if (backend === 'sleeping') {
    return <WakeUpScreen onReady={handleReady} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-void)' }}>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-obsidian)] border border-[var(--color-magenta)] rounded-[5px] px-5 py-3 text-sm text-[var(--color-near-white)] shadow-xl flex items-center gap-4 max-w-md">
          <span style={{ color: 'var(--color-magenta)' }}>⚠</span>
          <span>{error}</span>
          <button
            onClick={() => { setError(''); setView('input'); }}
            className="ml-auto text-[var(--color-steel)] hover:text-[var(--color-near-white)]"
          >
            ✕
          </button>
        </div>
      )}

      <div key={view} style={{ animation: 'fadeIn 0.3s ease' }}>
        {view === 'input' && <InputView />}
        {view === 'solver' && <SolverView />}
        {view === 'results' && <ResultsView />}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
