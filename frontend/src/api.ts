import type { WsMessage } from './types';

export async function searchTickers(q: string) {
  const res = await fetch(`/api/tickers/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json() as Promise<{ ticker: string; name: string }[]>;
}

export async function startOptimize(tickers: string[], riskAversion: number) {
  const res = await fetch('/api/optimize', {
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
  onError: (e: Event) => void
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${protocol}://${window.location.host}/ws/${jobId}`);
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as WsMessage;
      onMessage(msg);
    } catch {
      // ignore malformed frames
    }
  };
  ws.onclose = onClose;
  ws.onerror = onError;
  return ws;
}
