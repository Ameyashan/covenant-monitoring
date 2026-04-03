interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  valueColor?: string;
  children?: React.ReactNode;
}

export default function MetricCard({ label, value, subtitle, valueColor, children }: MetricCardProps) {
  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-1"
      style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: '#94a3b8' }}
      >
        {label}
      </div>
      <div
        className="text-3xl font-semibold tabular-nums leading-none"
        style={{ color: valueColor ?? '#0f172a' }}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-xs" style={{ color: '#94a3b8' }}>
          {subtitle}
        </div>
      )}
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
