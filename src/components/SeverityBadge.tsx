interface SeverityBadgeProps {
  severity: 'Hard' | 'Soft';
  size?: 'sm' | 'md';
}

export default function SeverityBadge({ severity, size = 'sm' }: SeverityBadgeProps) {
  const isHard = severity === 'Hard';
  const pad = size === 'md' ? '3px 10px' : '2px 7px';
  const fontSize = size === 'md' ? '12px' : '11px';

  return (
    <span
      className="inline-flex items-center rounded-full font-semibold uppercase tracking-wide whitespace-nowrap"
      style={{
        backgroundColor: isHard ? '#fef2f2' : '#fffbeb',
        color: isHard ? '#b91c1c' : '#b45309',
        padding: pad,
        fontSize,
        letterSpacing: '0.04em',
      }}
    >
      {severity}
    </span>
  );
}
