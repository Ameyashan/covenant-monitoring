interface StatusBadgeProps {
  status: 'Green' | 'Amber' | 'Red' | 'Compliant' | 'Breach — Confirmed' | 'Breach — Pending Review' | 'Resolved — Waived' | string;
  size?: 'sm' | 'md';
}

const CONFIG = {
  Green:                    { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e', label: 'Green' },
  Amber:                    { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b', label: 'Amber' },
  Red:                      { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Red' },
  Compliant:                { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e', label: 'Compliant' },
  'Breach — Confirmed':     { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Breach' },
  'Breach — Pending Review':{ bg: '#fffbeb', text: '#d97706', dot: '#f59e0b', label: 'Pending' },
  'Resolved — Waived':      { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e', label: 'Waived' },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = CONFIG[status as keyof typeof CONFIG] ?? {
    bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8', label: status,
  };

  const pad = size === 'md' ? '3px 10px' : '2px 7px';
  const fontSize = size === 'md' ? '12px' : '11px';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap"
      style={{ backgroundColor: config.bg, color: config.text, padding: pad, fontSize }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: config.dot }}
      />
      {config.label}
    </span>
  );
}
