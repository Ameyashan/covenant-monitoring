const DEFAULT_LABELS: Record<string, string> = {
  name: 'Name',
  threshold: 'Threshold',
  frequency: 'Frequency',
  classification: 'Classification',
  severity: 'Severity',
};

interface Props {
  scores: Record<string, number>;
  labels?: Record<string, string>;
}

export default function ConfidenceBreakdown({ scores, labels }: Props) {
  const displayLabels = { ...DEFAULT_LABELS, ...labels };

  return (
    <div className="flex flex-col gap-2.5">
      {Object.entries(scores).map(([key, value]) => {
        const pct = Math.round(value * 100);
        const color = pct >= 90 ? '#22c55e' : pct >= 80 ? '#f59e0b' : '#ef4444';
        const label = displayLabels[key] ?? key;

        return (
          <div key={key} className="flex items-center gap-3">
            <div
              className="text-xs flex-shrink-0"
              style={{ color: '#64748b', width: '110px' }}
            >
              {label}
            </div>
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: '#e2e8f0' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <div
              className="text-xs tabular-nums font-medium flex-shrink-0"
              style={{ color: '#64748b', minWidth: '36px', textAlign: 'right' }}
            >
              {pct}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
