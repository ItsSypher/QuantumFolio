import { useStore } from '../store';

export default function RiskSlider() {
  const { riskAversion, setRisk } = useStore();

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-[var(--color-steel)]">
        <span>Safety</span>
        <span>Growth</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={riskAversion}
          onChange={(e) => setRisk(parseFloat(e.target.value))}
          className="w-full appearance-none h-1.5 rounded-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--color-cyan) 0%, var(--color-quantum-blue) ${riskAversion * 100}%, var(--color-gunmetal) ${riskAversion * 100}%, var(--color-gunmetal) 100%)`,
          }}
        />
      </div>
      <p className="text-xs text-[var(--color-steel)] text-center">
        {riskAversion < 0.3
          ? 'Conservative — prioritises stability over high returns'
          : riskAversion < 0.7
          ? 'Balanced — mix of stability and growth potential'
          : 'Aggressive — pursuing maximum growth, accepting more risk'}
      </p>
    </div>
  );
}
