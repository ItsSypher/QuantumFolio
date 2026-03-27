export interface TickerSuggestion {
  ticker: string;
  name: string;
}

export interface Gate {
  type: 'H' | 'RZ' | 'CNOT' | 'RX';
  qubit: number;
  target?: number;
  layer: number;
}

export interface TopPortfolio {
  assets: string[];
  probability: number;
  label: string;
}

export interface SolverSnapshot {
  iteration: number;
  max_iterations: number;
  loss: number;
  parameters: number[];
  circuit_depth: number;
  circuit_repr: Gate[];
  top_portfolios: TopPortfolio[];
  bloch_state: [number, number, number];
  narration: string;
  status: 'running' | 'converged' | 'failed';
}

export interface Allocation {
  ticker: string;
  weight: number;
  name: string;
}

export interface Explanation {
  ticker: string;
  reason: string;
}

export interface Portfolio {
  allocations: Allocation[];
  expected_return: number;
  volatility: number;
  sharpe: number;
  explanations: Explanation[];
}

// classical is no longer sent by the backend
export interface FinalResult {
  quantum: Portfolio;
}

export type WsMessage =
  | { type: 'snapshot'; data: SolverSnapshot }
  | { type: 'result'; data: FinalResult }
  | { type: 'error'; data: { message: string } };
