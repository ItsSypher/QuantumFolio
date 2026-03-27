import { create } from 'zustand';
import type { FinalResult, SolverSnapshot, TickerSuggestion } from './types';

export type View = 'input' | 'solver' | 'results';

interface AppStore {
  view: View;
  selectedTickers: TickerSuggestion[];
  riskAversion: number;
  jobId: string | null;
  snapshots: SolverSnapshot[];
  playbackIdx: number;      // which snapshot is shown in replay
  result: FinalResult | null;
  error: string | null;

  setView(v: View): void;
  addTicker(t: TickerSuggestion): void;
  removeTicker(ticker: string): void;
  setRisk(v: number): void;
  setJobId(id: string): void;
  appendSnapshot(s: SolverSnapshot): void;
  setPlaybackIdx(i: number): void;
  setResult(r: FinalResult): void;
  setError(msg: string): void;
  reset(): void;
}

export const useStore = create<AppStore>((set) => ({
  view: 'input',
  selectedTickers: [],
  riskAversion: 0.5,
  jobId: null,
  snapshots: [],
  playbackIdx: 0,
  result: null,
  error: null,

  setView: (v) => set({ view: v }),
  addTicker: (t) =>
    set((s) =>
      s.selectedTickers.find((x) => x.ticker === t.ticker)
        ? s
        : { selectedTickers: [...s.selectedTickers, t] }
    ),
  removeTicker: (ticker) =>
    set((s) => ({ selectedTickers: s.selectedTickers.filter((x) => x.ticker !== ticker) })),
  setRisk: (v) => set({ riskAversion: v }),
  setJobId: (id) => set({ jobId: id }),
  appendSnapshot: (s) => set((st) => ({
    snapshots: [...st.snapshots, s],
    // During live solving, keep playbackIdx at the latest
    playbackIdx: st.snapshots.length,
  })),
  setPlaybackIdx: (i) => set({ playbackIdx: i }),
  setResult: (r) => set((st) => ({
    result: r,
    view: 'results',
    // Default to last snapshot for replay starting point
    playbackIdx: Math.max(0, st.snapshots.length - 1),
  })),
  setError: (msg) => set({ error: msg }),
  reset: () =>
    set({ view: 'input', snapshots: [], playbackIdx: 0, result: null, error: null, jobId: null }),
}));
