import type { Portfolio } from '../types';

function sharpeLabel(sharpe: number): { label: string; color: string } {
  if (sharpe >= 2) return { label: 'Excellent', color: 'var(--color-cyan)' };
  if (sharpe >= 1.2) return { label: 'Good', color: 'var(--color-quantum-blue)' };
  if (sharpe >= 0.8) return { label: 'Acceptable', color: 'var(--color-violet)' };
  return { label: 'Below average', color: 'var(--color-magenta)' };
}

function riskLabel(vol: number): string {
  if (vol < 0.1) return 'Low — suitable for cautious investors';
  if (vol < 0.2) return 'Moderate — typical for a diversified portfolio';
  if (vol < 0.3) return 'Elevated — expect noticeable swings';
  return 'High — significant price swings expected';
}

interface Props {
  portfolio: Portfolio;
}

export default function MetricCard({ portfolio }: Props) {
  const { label, color } = sharpeLabel(portfolio.sharpe);

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-[var(--color-gunmetal)] rounded-[5px] p-3 text-center">
        <p className="text-[var(--color-steel)] text-xs mb-1">Expected Return</p>
        <p className="text-[var(--color-cyan)] text-xl font-light">
          {(portfolio.expected_return * 100).toFixed(1)}%
        </p>
        <p className="text-[var(--color-steel)] text-xs">per year</p>
      </div>
      <div className="bg-[var(--color-gunmetal)] rounded-[5px] p-3 text-center">
        <p className="text-[var(--color-steel)] text-xs mb-1">Risk Level</p>
        <p className="text-[var(--color-near-white)] text-sm font-medium leading-tight mt-1">
          {riskLabel(portfolio.volatility).split(' — ')[0]}
        </p>
        <p className="text-[var(--color-steel)] text-xs">{riskLabel(portfolio.volatility).split(' — ')[1]}</p>
      </div>
      <div className="bg-[var(--color-gunmetal)] rounded-[5px] p-3 text-center">
        <p className="text-[var(--color-steel)] text-xs mb-1">Quality Score</p>
        <p className="text-xl font-light" style={{ color }}>{label}</p>
        <p className="text-[var(--color-steel)] text-xs">risk-adjusted</p>
      </div>
    </div>
  );
}
