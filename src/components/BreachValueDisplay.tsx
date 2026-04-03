interface Props {
  actual: number;
  operator: '>=' | '<=';
  threshold: number;
  unit: string;
  size?: 'sm' | 'md' | 'lg';
}

function fmt(value: number, unit: string): string {
  const rounded = Math.round(value * 100) / 100;
  if (unit === '$M') return `$${rounded}M`;
  if (unit === '%') return `${rounded}%`;
  return `${rounded}x`;
}

function operatorLabel(op: '>=' | '<='): string {
  return op === '<=' ? '≤' : '≥';
}

export default function BreachValueDisplay({ actual, operator, threshold, unit, size = 'md' }: Props) {
  // deviation = how far actual is from the threshold (positive = breaching)
  const deviation = operator === '<='
    ? actual - threshold   // for "must be ≤ threshold"
    : threshold - actual;  // for "must be ≥ threshold"

  const pctOver = threshold !== 0 ? Math.abs(Math.round((deviation / Math.abs(threshold)) * 100)) : 0;
  const direction = operator === '<=' ? 'above limit' : 'below minimum';

  const actualSize = size === 'lg' ? '22px' : size === 'md' ? '18px' : '14px';
  const thresholdSize = size === 'lg' ? '14px' : size === 'md' ? '13px' : '12px';
  const devSize = size === 'lg' ? '12px' : '11px';

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-2">
        <span
          className="font-semibold tabular-nums"
          style={{ color: '#dc2626', fontSize: actualSize, lineHeight: 1 }}
        >
          {fmt(actual, unit)}
        </span>
        <span style={{ color: '#94a3b8', fontSize: thresholdSize }}>
          vs {operatorLabel(operator)} {fmt(threshold, unit)}
        </span>
      </div>
      {deviation > 0 && (
        <div style={{ color: '#94a3b8', fontSize: devSize }}>
          Δ {fmt(deviation, unit)} {direction} ({pctOver}% over)
        </div>
      )}
    </div>
  );
}
