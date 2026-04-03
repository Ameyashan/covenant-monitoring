import { getBreachesByBorrowerId, getWatchListHistory } from '@/lib/data';

interface Props {
  borrowerId: string;
}

function fmt(value: number, unit: string): string {
  const r = Math.round(value * 100) / 100;
  if (unit === '$M') return `$${r}M`;
  if (unit === '%') return `${r}%`;
  return `${r}x`;
}

function operatorLabel(op: string): string {
  return op === '<=' ? '≤' : '≥';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BreachHistoryTimeline({ borrowerId }: Props) {
  const breaches = getBreachesByBorrowerId(borrowerId).sort(
    (a, b) => new Date(a.detectedDate).getTime() - new Date(b.detectedDate).getTime()
  );
  const watchChanges = getWatchListHistory().filter(w => w.borrowerId === borrowerId).sort(
    (a, b) => new Date(a.changedDate).getTime() - new Date(b.changedDate).getTime()
  );

  if (breaches.length === 0 && watchChanges.length === 0) {
    return (
      <div className="text-sm" style={{ color: '#94a3b8' }}>No prior history found.</div>
    );
  }

  // Build combined timeline
  type TimelineEvent =
    | { kind: 'breach'; date: string; breach: typeof breaches[0] }
    | { kind: 'watch'; date: string; change: typeof watchChanges[0] };

  const events: TimelineEvent[] = [
    ...breaches.map(b => ({ kind: 'breach' as const, date: b.detectedDate, breach: b })),
    ...watchChanges.map(w => ({ kind: 'watch' as const, date: w.changedDate, change: w })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="relative">
      {/* Vertical line */}
      <div
        className="absolute left-2 top-2 bottom-2"
        style={{ width: '1px', backgroundColor: '#e2e8f0' }}
      />
      <div className="flex flex-col gap-4">
        {events.map((ev, i) => {
          if (ev.kind === 'breach') {
            const b = ev.breach;
            const isHard = b.severity === 'Hard';
            const dotColor = b.status === 'Resolved — Waived' ? '#86efac' : isHard ? '#dc2626' : '#f59e0b';
            return (
              <div key={i} className="flex items-start gap-3 pl-6 relative">
                <div
                  className="absolute left-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"
                  style={{ backgroundColor: dotColor, top: '2px' }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold" style={{ color: '#0f172a' }}>
                      {b.quarter}: {b.covenantName} breach
                    </span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase"
                      style={{
                        backgroundColor: isHard ? '#fef2f2' : '#fffbeb',
                        color: isHard ? '#b91c1c' : '#b45309',
                      }}
                    >
                      {b.severity}
                    </span>
                    {b.status === 'Resolved — Waived' && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}
                      >
                        Waived
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                    {fmt(b.actualValue, b.unit)} vs {operatorLabel(b.operator)} {fmt(b.threshold, b.unit)} · Detected {fmtDate(b.detectedDate)}
                  </div>
                </div>
              </div>
            );
          } else {
            const w = ev.change;
            const colorMap: Record<string, string> = { Green: '#16a34a', Amber: '#b45309', Red: '#dc2626' };
            return (
              <div key={i} className="flex items-start gap-3 pl-6 relative">
                <div
                  className="absolute left-0 w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: '#94a3b8', top: '2px' }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#374151' }}>
                    Watch list:{' '}
                    <span style={{ color: colorMap[w.previousStatus] ?? '#64748b' }}>{w.previousStatus}</span>
                    {' → '}
                    <span style={{ color: colorMap[w.newStatus] ?? '#64748b' }}>{w.newStatus}</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                    {w.reason} · {fmtDate(w.changedDate)}
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
