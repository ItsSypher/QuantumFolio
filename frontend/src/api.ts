import type { WsMessage } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE  = import.meta.env.VITE_WS_URL  || 'ws://localhost:8000';

/** Returns true if the backend responds to /ping within `timeoutMs`. */
export async function checkHealth(timeoutMs = 4000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${API_BASE}/ping`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

export async function searchTickers(q: string) {
  const res = await fetch(`${API_BASE}/api/tickers/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json() as Promise<{ ticker: string; name: string }[]>;
}

export async function startOptimize(tickers: string[], riskAversion: number) {
  const res = await fetch(`${API_BASE}/api/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tickers, risk_aversion: riskAversion }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail ?? 'Optimize failed');
  }
  const data = await res.json();
  return data.job_id as string;
}

export function connectSolverStream(
  jobId: string,
  onMessage: (msg: WsMessage) => void,
  onClose: () => void,
  onError: (e: Event) => void,
  maxRetries = 4,
): () => void {
  let ws: WebSocket | null = null;
  let retries = 0;
  let cancelled = false;

  function connect() {
    if (cancelled) return;
    ws = new WebSocket(`${WS_BASE}/ws/${jobId}`);
    let opened = false;

    ws.onopen = () => { opened = true; };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMessage;
        onMessage(msg);
      } catch {
        // ignore malformed frames
      }
    };
    ws.onerror = (e) => {
      if (opened) onError(e);
      // if not yet opened, onclose will handle the retry
    };
    ws.onclose = () => {
      if (!opened && retries < maxRetries) {
        // connection was rejected before it opened — retry with backoff
        retries++;
        setTimeout(connect, 800 * retries);
      } else {
        onClose();
      }
    };
  }

  connect();
  // return a cancel function so callers can tear down if needed
  return () => { cancelled = true; ws?.close(); };
}
