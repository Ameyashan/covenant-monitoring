interface Props {
  covenantName: string;
  operator: '>=' | '<=';
  threshold: number;
  unit: string;
  actualValue: number;
  size?: 'sm' | 'md';
}

function fmtVal(value: number, unit: string): string {
  const r = Math.round(value * 100) / 100;
  if (unit === '$M') return `$${r}M`;
  if (unit === '%') return `${r}%`;
  return `${r}x`;
}

export default function HeadroomGauge({ covenantName, operator, threshold, unit, actualValue, size = 'md' }: Props) {
  // Compute headroom
  const headroom = operator === '>='
    ? (actualValue - threshold) / Math.abs(threshold)
    : (threshold - actualValue) / Math.abs(threshold);

  const breached = headroom < 0;
  const nearLimit = !breached && headroom <= 0.15;

  const color = breached ? '#dc2626' : nearLimit ? '#f59e0b' : '#16a34a';
  const bgColor = breached ? '#fef2f2' : nearLimit ? '#fffbeb' : '#f0fdf4';
  const trackColor = breached ? '#fecaca' : nearLimit ? '#fde68a' : '#bbf7d0';

  // Gauge position
  // Range: 0 to 2*threshold (for <=) or similar
  const max = 2 * Math.abs(threshold);
  const thresholdPct = 50; // threshold always at midpoint
  const actualPct = Math.min(100, Math.max(0, (actualValue / max) * 100));

  // For >= covenants: bar fills from left; green zone is right of threshold
  // For <= covenants: bar fills from left; green zone is left of threshold
  const isAboveThreshold = actualPct >= thresholdPct;
  const barColor = operator === '>='
    ? (isAboveThreshold ? color : '#dc2626')
    : (!isAboveThreshold ? color : '#dc2626');

  const headroomPct = Math.round(Math.abs(headroom) * 1000) / 10;

  if (size === 'sm') {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span style={{ color: '#374151', fontWeight: 500 }}>{covenantName}</span>
          <span style={{ color: '#94a3b8' }}>{operator === '<=' ? '≤' : '≥'} {fmtVal(threshold, unit)}</span>
        </div>
        <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e2e8f0' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
            style={{ width: `${actualPct}%`, backgroundColor: barColor }}
          />
          {/* Threshold marker */}
          <div
            className="absolute inset-y-0 w-0.5"
            style={{ left: `${thresholdPct}%`, backgroundColor: 'rgba(0,0,0,0.3)' }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span style={{ color: '#64748b' }}>Actual: {fmtVal(actualValue, unit)}</span>
          <span style={{ color, fontWeight: 600 }}>
            {breached ? `BREACHED ${headroomPct.toFixed(1)}%` : `Headroom ${headroomPct.toFixed(1)}%`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: bgColor, border: `1px solid ${trackColor}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-medium" style={{ color: '#0f172a' }}>{covenantName}</div>
          <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            Threshold: {operator === '<=' ? '≤' : '≥'} {fmtVal(threshold, unit)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums" style={{ color }}>
            {breached ? `BREACHED` : `${headroomPct.toFixed(1)}% headroom`}
          </div>
          <div className="text-xs" style={{ color: '#64748b' }}>Actual: {fmtVal(actualValue, unit)}</div>
        </div>
      </div>

      {/* Gauge bar */}
      <div className="relative mt-3">
        <div className="relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#e2e8f0' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${actualPct}%`, backgroundColor: barColor }}
          />
          {/* Threshold marker */}
          <div
            className="absolute inset-y-0 w-0.5"
            style={{ left: `${thresholdPct}%`, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 1 }}
          />
        </div>
        <div
          className="absolute text-[10px] font-medium mt-1"
          style={{ left: `${thresholdPct}%`, transform: 'translateX(-50%)', color: '#64748b', top: '100%', paddingTop: '2px' }}
        >
          threshold
        </div>
      </div>
      <div className="mt-5" />
    </div>
  );
}
