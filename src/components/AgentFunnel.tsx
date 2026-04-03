import Link from 'next/link';
import type { AgentFunnelData } from '@/lib/types';
import { ArrowRight } from 'lucide-react';

interface AgentFunnelProps {
  data: AgentFunnelData;
}

interface FunnelStage {
  label: string;
  value: number;
  sub?: string;
  color?: 'default' | 'amber' | 'red' | 'blue';
  href?: string;
}

function Stage({ label, value, sub, color = 'default', href }: FunnelStage) {
  const styles = {
    default: { bg: '#fff', border: '#e2e8f0', valueColor: '#0f172a', labelColor: '#64748b' },
    blue:    { bg: '#eff6ff', border: '#bfdbfe', valueColor: '#1d4ed8', labelColor: '#3b82f6' },
    amber:   { bg: '#fffbeb', border: '#fde68a', valueColor: '#d97706', labelColor: '#f59e0b' },
    red:     { bg: '#fef2f2', border: '#fecaca', valueColor: '#dc2626', labelColor: '#ef4444' },
  }[color];

  const inner = (
    <>
      <span
        className="text-2xl font-bold tabular-nums leading-none"
        style={{ color: styles.valueColor }}
      >
        {value.toLocaleString()}
      </span>
      <span className="text-[11px] font-medium mt-1 text-center leading-tight" style={{ color: styles.labelColor }}>
        {label}
      </span>
      {sub && (
        <span className="text-[10px] mt-0.5 text-center" style={{ color: styles.labelColor, opacity: 0.7 }}>
          {sub}
        </span>
      )}
    </>
  );

  const cls = "flex flex-col flex-1 items-center justify-center px-3 py-3 rounded-lg min-w-0";
  const style = { backgroundColor: styles.bg, border: `1px solid ${styles.border}` };

  if (href) {
    return (
      <Link href={href} className={cls} style={{ ...style, textDecoration: 'none', transition: 'opacity 0.15s' }}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={cls} style={style}>
      {inner}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center flex-shrink-0 px-1">
      <ArrowRight size={14} className="text-slate-300" />
    </div>
  );
}

export default function AgentFunnel({ data }: AgentFunnelProps) {
  const humanItems = data.escalatedToHuman;
  const totalProcessed = data.testsRun;
  const autonomyRate = ((totalProcessed - humanItems) / totalProcessed * 100).toFixed(1);

  return (
    <div
      className="rounded-lg p-5"
      style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#0f172a' }}>Agent Activity Pipeline</h2>
          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>End-to-end volume across all AI agents</p>
        </div>
        <div
          className="text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
        >
          AI Autonomy: {autonomyRate}%
        </div>
      </div>

      {/* Top row: Ingestion & Extraction */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>
          Ingestion &amp; Extraction Pipeline
        </div>
        <div className="flex items-center gap-0">
          <Stage label="Deals Ingested" value={data.dealsIngested} color="blue" href="/deals" />
          <Arrow />
          <Stage label="Covenants Extracted" value={data.covenantsExtracted} href="/extraction" />
          <Arrow />
          <Stage label="Auto-Validated" value={data.autoValidated} color="default" href="/validation" />
          <Arrow />
          <Stage label="Flagged / Reviewed" value={data.flaggedReviewed} color="amber" />
          <Arrow />
          <Stage label="Escalated to Human" value={data.escalatedToHuman} color="amber" />
        </div>
      </div>

      {/* Divider */}
      <div className="my-3 border-t" style={{ borderColor: '#f1f5f9' }} />

      {/* Bottom row: Monitoring */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>
          Monitoring &amp; Breach Detection Pipeline
        </div>
        <div className="flex items-center gap-0">
          <Stage label="Financials Received" value={data.financialsReceived} color="blue" />
          <Arrow />
          <Stage label="Tests Run" value={data.testsRun} />
          <Arrow />
          <Stage label="Breaches Detected" value={data.breachesDetected} color="red" />
          <Arrow />
          <Stage label="Alerts Sent" value={data.alertsSent} color="red" />
          <Arrow />
          <Stage label="Waivers Granted" value={data.waiversGranted} color="default" />
        </div>
      </div>

      {/* Summary line */}
      <div
        className="mt-4 pt-3 border-t text-xs"
        style={{ borderColor: '#f1f5f9', color: '#64748b' }}
      >
        <span className="font-semibold" style={{ color: '#0f172a' }}>AI autonomy rate: {autonomyRate}%</span>
        {' '}— {data.escalatedToHuman + data.flaggedReviewed} of {data.testsRun.toLocaleString()} items required human review.
        {' '}Breach Detection Agent processed all {data.testsRun.toLocaleString()} tests automatically.
      </div>
    </div>
  );
}
