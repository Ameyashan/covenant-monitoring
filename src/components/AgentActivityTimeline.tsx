import AgentTag from './AgentTag';

export interface TimelineEntry {
  timestamp: string;
  agent: string;
  action: string;
  confidence?: number;
}

interface Props {
  entries: TimelineEntry[];
  title?: string;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function AgentActivityTimeline({ entries, title = 'Agent Activity' }: Props) {
  return (
    <div>
      {title && (
        <div
          className="text-[11px] font-semibold uppercase tracking-widest mb-4"
          style={{ color: '#94a3b8' }}
        >
          {title}
        </div>
      )}
      <div className="relative pl-5">
        {/* Vertical guide line */}
        <div
          className="absolute left-[7px] top-1.5 bottom-1.5 w-px"
          style={{ backgroundColor: '#e2e8f0' }}
        />
        <div className="flex flex-col gap-5">
          {entries.map((entry, i) => (
            <div key={i} className="relative flex flex-col gap-1">
              {/* Dot */}
              <div
                className="absolute -left-5 top-0.5 w-3 h-3 rounded-full border-2 bg-white"
                style={{ borderColor: '#cbd5e1' }}
              />
              {/* Action text */}
              <div className="text-xs leading-relaxed" style={{ color: '#0f172a' }}>
                {entry.action}
              </div>
              {/* Agent pill + timestamp */}
              <div className="flex items-center gap-2 flex-wrap">
                <AgentTag name={entry.agent} />
                <span className="text-[11px]" style={{ color: '#94a3b8' }}>
                  {formatTime(entry.timestamp)}
                </span>
                {entry.confidence !== undefined && (
                  <span
                    className="text-[11px] font-medium tabular-nums"
                    style={{
                      color:
                        entry.confidence >= 0.9
                          ? '#16a34a'
                          : entry.confidence >= 0.75
                          ? '#d97706'
                          : '#dc2626',
                    }}
                  >
                    {Math.round(entry.confidence * 100)}% confidence
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
