'use client';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  key: string;
  label: string;
  options: FilterOption[];
}

interface Props {
  filters: FilterDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function FilterBar({ filters, values, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-5">
      {filters.map((filter) => (
        <div key={filter.key} className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-widest flex-shrink-0"
            style={{ color: '#94a3b8' }}
          >
            {filter.label}
          </span>
          <div className="flex gap-1">
            {filter.options.map((opt) => {
              const isActive = values[filter.key] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onChange(filter.key, opt.value)}
                  className="text-xs px-2.5 py-1 rounded-full transition-all duration-150"
                  style={{
                    backgroundColor: isActive ? '#0f172a' : 'transparent',
                    color: isActive ? '#fff' : '#64748b',
                    border: '1px solid',
                    borderColor: isActive ? '#0f172a' : '#e2e8f0',
                    fontWeight: isActive ? 500 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
