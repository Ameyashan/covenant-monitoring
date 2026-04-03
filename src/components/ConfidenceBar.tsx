interface ConfidenceBarProps {
  value: number; // 0–1
  showLabel?: boolean;
}

export default function ConfidenceBar({ value, showLabel = true }: ConfidenceBarProps) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? '#22c55e' : pct >= 75 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#e2e8f0' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs tabular-nums font-medium" style={{ color: '#64748b', minWidth: '32px' }}>
          {pct}%
        </span>
      )}
    </div>
  );
}
