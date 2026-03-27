import { useState, useRef, useEffect, useCallback } from 'react';
import { searchTickers } from '../api';
import { useStore } from '../store';
import type { TickerSuggestion } from '../types';

export default function TickerSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { selectedTickers, addTicker, removeTicker } = useStore();

  const search = useCallback((q: string) => {
    if (!q.trim()) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    searchTickers(q)
      .then((res) => { setSuggestions(res); setOpen(true); })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const select = (t: TickerSuggestion) => {
    if (selectedTickers.length >= 20) return;
    addTicker(t);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search company or ticker (e.g. Apple, TSLA)…"
          disabled={selectedTickers.length >= 20}
          className="w-full bg-[var(--color-obsidian)] border border-[var(--color-gunmetal)] rounded-[5px] px-4 py-3 text-[var(--color-near-white)] placeholder-[var(--color-steel)] focus:outline-none focus:border-[var(--color-quantum-blue)] focus:shadow-[0_0_0_2px_rgba(79,125,243,0.12)] transition-all"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-steel)] text-xs">
            …
          </span>
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-[var(--color-obsidian)] border border-[var(--color-gunmetal)] rounded-[5px] overflow-hidden shadow-xl max-h-56 overflow-y-auto">
            {suggestions.map((s) => (
              <li
                key={s.ticker}
                onMouseDown={() => select(s)}
                className="px-4 py-2.5 cursor-pointer hover:bg-[var(--color-gunmetal)] flex items-center justify-between transition-colors"
              >
                <span className="text-[var(--color-near-white)] font-medium">{s.ticker}</span>
                <span className="text-[var(--color-steel)] text-sm">{s.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedTickers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTickers.map((t) => (
            <span
              key={t.ticker}
              className="flex items-center gap-1.5 px-3 py-1 bg-[var(--color-gunmetal)] rounded-[4px] text-sm"
            >
              <span className="text-[var(--color-quantum-blue)] font-medium">{t.ticker}</span>
              <span className="text-[var(--color-steel)] text-xs hidden sm:inline">{t.name}</span>
              <button
                onClick={() => removeTicker(t.ticker)}
                className="text-[var(--color-steel)] hover:text-[var(--color-magenta)] transition-colors ml-1 leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--color-steel)]">
        {selectedTickers.length}/20 assets selected
        {selectedTickers.length < 5 && selectedTickers.length > 0 && (
          <span className="text-[var(--color-magenta)] ml-2">— add at least 5 to optimize</span>
        )}
      </p>
    </div>
  );
}
