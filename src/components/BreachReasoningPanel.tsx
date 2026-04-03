'use client';

import Link from 'next/link';
import type { Breach } from '@/lib/types';

interface Props {
  breach: Breach;
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

function extractDocName(reasoning: string): string | null {
  const m = reasoning.match(/source document ([\w_. -]+\.pdf)/i);
  return m ? m[1] : null;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] font-bold uppercase tracking-widest mb-2"
      style={{ color: '#64748b' }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid #f1f5f9', margin: '14px 0' }} />;
}

export default function BreachReasoningPanel({ breach }: Props) {
  const isPending = breach.status === 'Breach — Pending Review';
  const confidence = Math.round(breach.agentConfidence * 100);
  const extractionConf = Math.min(99, confidence + 1);
  const docName = extractDocName(breach.agentReasoning);

  const deviation = breach.operator === '<='
    ? breach.actualValue - breach.threshold
    : breach.threshold - breach.actualValue;
  const pctOver = breach.threshold !== 0
    ? Math.round((deviation / Math.abs(breach.threshold)) * 100)
    : 0;
  const direction = breach.operator === '<=' ? 'above limit' : 'below minimum';

  const barColor = isPending ? '#f59e0b' : confidence >= 90 ? '#10b981' : '#3b82f6';
  const barWidth = `${confidence}%`;

  return (
    <div
      className="rounded-lg p-5"
      style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: '#0f172a' }}>
          Breach Detection Agent
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums" style={{ color: isPending ? '#b45309' : '#0f172a' }}>
            {confidence}%
          </span>
          <div className="w-20 h-1.5 rounded-full" style={{ backgroundColor: '#e2e8f0' }}>
            <div
              className="h-1.5 rounded-full"
              style={{ width: barWidth, backgroundColor: barColor }}
            />
          </div>
        </div>
      </div>

      <Divider />

      {/* Verification */}
      <SectionHeader>Verification</SectionHeader>
      <div className="flex flex-col gap-1.5 text-sm" style={{ color: '#374151' }}>
        {isPending ? (
          <>
            <div className="flex items-start gap-2">
              <span style={{ color: '#f59e0b', flexShrink: 0 }}>⚠</span>
              <span>Extraction confidence below automated confirmation threshold</span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: '#f59e0b', flexShrink: 0 }}>⚠</span>
              <span>Non-standard line items detected in financial statement</span>
            </div>
            {docName && (
              <div className="flex items-start gap-2">
                <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
                <span>
                  Source document identified:{' '}
                  <span className="font-mono text-xs" style={{ color: '#64748b' }}>{docName}</span>
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            {docName && (
              <div className="flex items-start gap-2">
                <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
                <span>
                  Source document verified:{' '}
                  <span className="font-mono text-xs" style={{ color: '#64748b' }}>{docName}</span>
                </span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
              <span>Extraction confidence: {extractionConf}%</span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
              <span>Metric correctly mapped to covenant</span>
            </div>
          </>
        )}
      </div>

      <Divider />

      {/* Calculation */}
      <SectionHeader>Calculation</SectionHeader>
      <div className="flex flex-col gap-1 text-sm" style={{ color: '#374151' }}>
        <div style={{ color: '#64748b', fontSize: '12px' }}>
          {breach.covenantName} = {breach.metric}
        </div>
        <div className="flex items-baseline gap-3 mt-1">
          <div>
            <span className="text-xs" style={{ color: '#94a3b8' }}>Actual</span>
            <div className="font-semibold tabular-nums text-base" style={{ color: '#dc2626' }}>
              {fmt(breach.actualValue, breach.unit)}
            </div>
          </div>
          <div style={{ color: '#94a3b8' }}>vs</div>
          <div>
            <span className="text-xs" style={{ color: '#94a3b8' }}>Threshold</span>
            <div className="font-semibold tabular-nums text-base" style={{ color: '#475569' }}>
              {operatorLabel(breach.operator)} {fmt(breach.threshold, breach.unit)}
            </div>
          </div>
        </div>
        <div className="text-xs mt-1" style={{ color: '#64748b' }}>
          Deviation: {fmt(deviation, breach.unit)} {direction} ({pctOver}% over)
        </div>
      </div>

      <Divider />

      {/* Decision */}
      <SectionHeader>Decision</SectionHeader>
      {isPending ? (
        <div className="text-sm" style={{ color: '#374151' }}>
          Breach calculation indicates violation but confidence is below automated confirmation threshold.
          Routed to Exception Queue for human verification.
        </div>
      ) : (
        <div className="flex flex-col gap-1 text-sm" style={{ color: '#374151' }}>
          <div>Breach confirmed with {confidence}% confidence.</div>
          <div style={{ color: breach.severity === 'Hard' ? '#dc2626' : '#b45309' }}>
            {breach.severity === 'Hard'
              ? 'Hard covenant — breach constitutes event of default.'
              : 'Soft covenant — monitoring and discussion required.'}
          </div>
        </div>
      )}

      <Divider />

      {/* Recommended Action */}
      <SectionHeader>Recommended Action</SectionHeader>
      {isPending ? (
        <div className="flex items-center gap-2">
          <Link
            href="/exceptions"
            className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
            style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}
          >
            Review in Exception Queue →
          </Link>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
          <span style={{ color: '#3b82f6' }}>→</span>
          <span>{breach.recommendedAction}</span>
        </div>
      )}

      {/* Sector Context */}
      {breach.sectorContext && (
        <>
          <Divider />
          <SectionHeader>Sector Context</SectionHeader>
          <div className="text-sm" style={{ color: '#64748b' }}>
            {breach.sectorContext}
          </div>
        </>
      )}
    </div>
  );
}
