import { useEffect, useState } from 'react';
import { checkHealth } from '../api';

const FACTS = [
  {
    year: '1982',
    fact: 'Richard Feynman proposed that only a quantum computer could efficiently simulate quantum physics — classical machines face exponential slowdowns that make the problem intractable.',
  },
  {
    year: '1994',
    fact: "Peter Shor's algorithm can factor large integers exponentially faster than any known classical method, theoretically breaking RSA encryption on a sufficiently powerful quantum machine.",
  },
  {
    year: '1996',
    fact: "Lov Grover's search algorithm finds a target in an N-item list in √N steps — a quadratic speedup that becomes decisive at planetary-scale search problems.",
  },
  {
    year: '1997',
    fact: 'Anton Zeilinger demonstrated quantum teleportation for the first time: not matter, but the complete quantum state of a photon was transmitted across a lab using entanglement.',
  },
  {
    year: '2014',
    fact: 'Farhi, Goldstone, and Gutmann at MIT introduced QAOA — the Quantum Approximate Optimization Algorithm now powering this portfolio solver.',
  },
  {
    year: '2016',
    fact: 'IBM put a 5-qubit quantum computer on the cloud. Within a year, 40,000 users had run over 275,000 experiments — quantum computing became publicly accessible for the first time.',
  },
  {
    year: '1935',
    fact: 'Schrödinger coined "entanglement" (Verschränkung), calling it "the characteristic trait of quantum mechanics" — two particles sharing state regardless of the distance separating them.',
  },
  {
    year: '2019',
    fact: "Google's 53-qubit Sycamore chip finished a sampling task in 200 seconds. Google estimated the same computation would take the world's fastest supercomputer roughly 10,000 years.",
  },
  {
    year: '∞',
    fact: 'A 300-qubit register can hold more simultaneous states than there are atoms in the observable universe — a superposition of 2³⁰⁰ possibilities coexisting at once.',
  },
];

const POLL_INTERVAL_MS = 5000;
const FACT_INTERVAL_MS = 6000;

interface Props {
  onReady: () => void;
}

export default function WakeUpScreen({ onReady }: Props) {
  const [factIdx, setFactIdx] = useState(() => Math.floor(Math.random() * FACTS.length));
  const [visible, setVisible] = useState(true);

  // Rotate facts with a fade-out / fade-in cycle
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setFactIdx((i) => (i + 1) % FACTS.length);
        setVisible(true);
      }, 500);
    }, FACT_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Poll /ping until the backend is alive
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const ok = await checkHealth(4000);
      if (cancelled) return;
      if (ok) {
        // brief pause so the transition feels intentional, not jarring
        setTimeout(onReady, 600);
      } else {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [onReady]);

  const { year, fact } = FACTS[factIdx];

  return (
    <div style={styles.root}>
      <style>{css}</style>

      {/* Orb */}
      <div style={styles.orbWrap}>
        <div style={styles.ring3} />
        <div style={styles.ring2} />
        <div style={styles.ring1} />
        <div style={styles.core} />
      </div>

      {/* Title */}
      <p style={styles.wordmark}>QUANTUMFOLIO</p>
      <p style={styles.status}>
        <span style={styles.dot} />
        Waking up the quantum engine…
      </p>

      {/* Rotating fact */}
      <div style={styles.factBox}>
        <div
          style={{
            ...styles.factInner,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(6px)',
          }}
        >
          <span style={styles.yearBadge}>{year}</span>
          <p style={styles.factText}>{fact}</p>
        </div>
      </div>

      {/* Footer */}
      <p style={styles.footer}>
        This service uses a free-tier host which leads to a minute or so of load time
        if the site is accessed after some period of inactivity.
      </p>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#08080D',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 32px 100px',
    gap: 0,
    fontFamily: "'Inter', system-ui, sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  orbWrap: {
    position: 'relative',
    width: 160,
    height: 160,
    marginBottom: 52,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#4F7DF3',
    boxShadow: '0 0 28px 10px rgba(79,125,243,0.65)',
    animation: 'pulse-core 2s ease-in-out infinite',
  },
  ring1: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: '50%',
    border: '1px solid rgba(79,125,243,0.5)',
    animation: 'pulse-ring 2s ease-out infinite',
  },
  ring2: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: '50%',
    border: '1px solid rgba(79,125,243,0.28)',
    animation: 'pulse-ring 2s ease-out infinite 0.4s',
  },
  ring3: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: '50%',
    border: '1px solid rgba(79,125,243,0.14)',
    animation: 'pulse-ring 2s ease-out infinite 0.8s',
  },
  wordmark: {
    margin: 0,
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: '0.3em',
    color: '#D8D8E8',
  },
  status: {
    margin: '18px 0 0',
    fontSize: 15,
    color: '#9090B8',
    letterSpacing: '0.03em',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
  },
  dot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#4F7DF3',
    flexShrink: 0,
    animation: 'blink 1.4s ease-in-out infinite',
  },
  factBox: {
    marginTop: 64,
    width: '100%',
    maxWidth: 620,
    minHeight: 140,
    display: 'flex',
    alignItems: 'flex-start',
    borderLeft: '2px solid rgba(79,125,243,0.35)',
    paddingLeft: 24,
  },
  factInner: {
    transition: 'opacity 0.5s ease, transform 0.5s ease',
  },
  yearBadge: {
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.14em',
    color: '#4F7DF3',
    background: 'rgba(79,125,243,0.12)',
    border: '1px solid rgba(79,125,243,0.25)',
    borderRadius: 4,
    padding: '3px 10px',
    marginBottom: 14,
  },
  factText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.75,
    color: '#9898B8',
    fontWeight: 300,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 520,
    textAlign: 'center',
    fontSize: 13,
    color: '#60607A',
    lineHeight: 1.65,
    padding: '0 24px',
    margin: 0,
  },
};

const css = `
  @keyframes pulse-core {
    0%, 100% { transform: scale(1);   opacity: 1; }
    50%       { transform: scale(1.2); opacity: 0.7; }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(0.85); opacity: 0.8; }
    100% { transform: scale(1.15); opacity: 0; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.2; }
  }
`;
