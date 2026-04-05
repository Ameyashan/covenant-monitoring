'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Database, Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ConfidenceBar from '@/components/ConfidenceBar';
import AgentActivityTimeline from '@/components/AgentActivityTimeline';
import type { TimelineEntry } from '@/components/AgentActivityTimeline';
import type { DealsPipeline, Deal, Borrower } from '@/lib/types';
import { usePipeline } from '@/context/PipelineContext';

interface Props {
  pipeline: DealsPipeline[];
  deals: Deal[];
  borrowers: Borrower[];
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildTimeline(item: DealsPipeline): TimelineEntry[] {
  const base = new Date(item.emailDate).getTime();
  return [
    {
      timestamp: new Date(base + 120000).toISOString(),
      agent: item.detectedBy,
      action: 'Deal record created and passed to Covenant Extraction pipeline',
      confidence: item.detectionConfidence,
    },
    {
      timestamp: new Date(base + 60000).toISOString(),
      agent: item.detectedBy,
      action: `Borrower identified: ${item.borrowerName}`,
    },
    {
      timestamp: new Date(base + 30000).toISOString(),
      agent: item.detectedBy,
      action: `Credit agreement attachment detected: ${item.attachments[0] ?? 'N/A'}`,
    },
    {
      timestamp: new Date(base).toISOString(),
      agent: item.detectedBy,
      action: `Email received from ${item.emailFrom}`,
    },
  ];
}

const DIVISION_SHORT: Record<string, string> = {
  'Investment Banking': 'IB',
  'Asset Management': 'AM',
  'Wealth Management': 'WM',
  Trading: 'Trading',
};

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-4 rounded" style={{ backgroundColor: '#f1f5f9' }} />
      ))}
    </div>
  );
}

// ─── Pipeline API types ────────────────────────────────────────────────────────

interface AgentData {
  status: 'success' | 'error' | 'skipped';
  result: unknown;
  duration_ms?: number;
  error?: string;
  note?: string;
}

interface PipelineApiResponse {
  pipeline_status: string;
  deal: { borrower_name: string; deal_date: string; logged_at: string };
  agents: {
    covenant_extractor?: AgentData;
    validation_agent_a?: AgentData;
    validation_agent_b?: AgentData;
    comparison?: AgentData;
    breach_detection?: AgentData | null;
    breach_summary?: AgentData | null;
  };
}

interface ExtractedCovenant {
  covenant_name: string;
  covenant_type: string;
  threshold_value: number | string;
  threshold_operator: string;
  threshold_unit: string;
  reporting_frequency: string;
  severity: string;
  classification?: string;
  confidence: number;
  source_clause: string;
}

interface ValidationResultA {
  covenant_name: string;
  validation_status: 'approved' | 'flagged' | 'rejected';
  confidence: number;
  reasoning: string;
  template_match?: string;
}

interface ValidationResultB {
  covenant_name: string;
  validation_status: 'approved' | 'flagged' | 'rejected';
  confidence: number;
  reasoning: string;
  concerns?: string;
}

interface ComparisonItem {
  covenant_name: string;
  status: 'auto_validated' | 'flagged_for_review' | 'escalated';
  validation_confidence: number;
  route: 'exception_queue' | null;
}

interface BreachDetectionItem {
  covenant_name: string;
  actual_value: number | string;
  threshold_value: number | string;
  threshold_operator: string;
  status: 'compliant' | 'breach_confirmed' | 'breach_pending_review';
  breach_delta: number | null;
  confidence: number;
  reasoning?: string;
}

interface BreachItem {
  covenant_name: string;
  actual_value?: number | string;
  threshold?: number | string;
  severity?: string;
  recommended_action?: string;
}

interface BreachSummaryResult {
  borrower_name: string;
  breach_summary: string;
  breaches: BreachItem[];
  overall_risk_assessment: 'low' | 'medium' | 'high' | 'critical';
  recommended_next_steps: string[];
  sector_context?: string;
}

// ─── Stepper types ─────────────────────────────────────────────────────────────

type StepState = 'pending' | 'loading' | 'success' | 'error' | 'skipped';

interface StepInfo {
  state: StepState;
  duration?: string;
}

const PIPELINE_STAGES = [
  'Deal Logged',
  'Covenants Extracted',
  'Validation A',
  'Validation B',
  'Comparison',
  'Breach Detection',
  'Breach Summary',
];

type AgentKey = keyof PipelineApiResponse['agents'];

const STAGE_AGENT_KEYS: (AgentKey | null)[] = [
  null,
  'covenant_extractor',
  'validation_agent_a',
  'validation_agent_b',
  'comparison',
  'breach_detection',
  'breach_summary',
];

const AGENT_TO_STEP_IDX: Record<string, number> = {
  deal_logged: 0,
  covenant_extractor: 1,
  validation_agent_a: 2,
  validation_agent_b: 3,
  comparison: 4,
  breach_detection: 5,
  breach_summary: 6,
};

interface StreamEvent {
  agent: string;
  status: 'running' | 'complete' | 'error' | 'skipped';
  result?: unknown;
  duration_ms?: number;
  error?: string;
  // __done__ fields
  borrower_name?: string;
  deal_date?: string;
  logged_at?: string;
  pipeline_status?: string;
}

const INITIAL_STEPS: StepInfo[] = PIPELINE_STAGES.map(() => ({ state: 'pending' }));

// ─── Small result UI helpers ───────────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number }) {
  const style =
    value > 90
      ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
      : value >= 80
      ? { backgroundColor: '#fffbeb', color: '#d97706' }
      : { backgroundColor: '#fef2f2', color: '#dc2626' };
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums"
      style={style}
    >
      {value}%
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const style =
    s === 'approved'
      ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
      : s === 'flagged'
      ? { backgroundColor: '#fffbeb', color: '#d97706' }
      : { backgroundColor: '#fef2f2', color: '#dc2626' };
  return (
    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize" style={style}>
      {status}
    </span>
  );
}

function RoutingPill({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const style =
    s === 'auto_validated'
      ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
      : s === 'flagged_for_review'
      ? { backgroundColor: '#fffbeb', color: '#d97706' }
      : { backgroundColor: '#fef2f2', color: '#dc2626' };
  const label =
    s === 'auto_validated' ? 'Auto-validated' : s === 'flagged_for_review' ? 'Flagged' : 'Escalated';
  return (
    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold" style={style}>
      {label}
    </span>
  );
}

function BreachStatusPill({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const style =
    s === 'compliant'
      ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
      : s === 'breach_confirmed'
      ? { backgroundColor: '#fef2f2', color: '#dc2626' }
      : { backgroundColor: '#fffbeb', color: '#d97706' };
  const label =
    s === 'compliant' ? 'Compliant' : s === 'breach_confirmed' ? 'Breach' : 'Pending Review';
  return (
    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold" style={style}>
      {label}
    </span>
  );
}

function RiskBadge({ level }: { level: string }) {
  const l = level?.toLowerCase();
  const style =
    l === 'low'
      ? { backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }
      : l === 'medium'
      ? { backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }
      : l === 'high'
      ? { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
      : { backgroundColor: '#fdf2f8', color: '#9333ea', border: '1px solid #f0abfc' };
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
      style={style}
    >
      {level}
    </span>
  );
}

function SectionCard({
  title,
  meta,
  open,
  onToggle,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#fff',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
        style={{
          backgroundColor: '#fafafa',
          borderBottom: open ? '1px solid #f1f5f9' : 'none',
          cursor: 'pointer',
        }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold" style={{ color: '#0f172a' }}>
            {title}
          </span>
          {meta}
        </div>
        {open ? (
          <ChevronUp size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
        ) : (
          <ChevronDown size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
        )}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

// ─── Result sub-panels ─────────────────────────────────────────────────────────

function ExtractionTable({ covenants }: { covenants: ExtractedCovenant[] }) {
  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '6px 12px 6px 0',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '8px 12px 8px 0',
    fontSize: '11px',
    verticalAlign: 'top',
    borderTop: '1px solid #f8fafc',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Threshold</th>
            <th style={thStyle}>Frequency</th>
            <th style={thStyle}>Severity</th>
            <th style={thStyle}>Confidence</th>
            <th style={{ ...thStyle, maxWidth: '220px' }}>Source Clause</th>
          </tr>
        </thead>
        <tbody>
          {covenants.map((cov, i) => (
            <tr key={i}>
              <td style={{ ...tdStyle, fontWeight: 600, color: '#0f172a', minWidth: '160px' }}>
                {cov.covenant_name}
              </td>
              <td style={{ ...tdStyle, color: '#64748b', textTransform: 'capitalize' }}>
                {cov.covenant_type}
              </td>
              <td style={{ ...tdStyle, color: '#0f172a', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {cov.threshold_operator} {cov.threshold_value}
                {cov.threshold_unit && cov.threshold_unit !== 'none' ? cov.threshold_unit : ''}
              </td>
              <td style={{ ...tdStyle, color: '#64748b', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                {cov.reporting_frequency}
              </td>
              <td style={tdStyle}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color:
                      cov.severity?.toLowerCase() === 'hard' ? '#dc2626' : '#d97706',
                    textTransform: 'capitalize',
                  }}
                >
                  {cov.severity}
                </span>
              </td>
              <td style={tdStyle}>
                <ConfidenceBadge value={cov.confidence} />
              </td>
              <td style={{ ...tdStyle, color: '#64748b', maxWidth: '220px' }}>
                <div
                  title={cov.source_clause}
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '220px',
                  }}
                >
                  {cov.source_clause}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValidationPanel({
  valA,
  valB,
  comparison,
}: {
  valA: ValidationResultA[] | null;
  valB: ValidationResultB[] | null;
  comparison: ComparisonItem[];
}) {
  const autoCount = comparison.filter((c) => c.status === 'auto_validated').length;
  const flaggedCount = comparison.filter((c) => c.status === 'flagged_for_review').length;
  const escalatedCount = comparison.filter((c) => c.status === 'escalated').length;

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '6px 12px 6px 0',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '8px 12px 8px 0',
    fontSize: '11px',
    verticalAlign: 'top',
    borderTop: '1px solid #f8fafc',
  };

  return (
    <div>
      {/* Summary chips */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
        >
          <span className="text-sm font-bold tabular-nums" style={{ color: '#16a34a' }}>
            {autoCount}
          </span>
          <span className="text-xs" style={{ color: '#16a34a' }}>
            auto-validated
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}
        >
          <span className="text-sm font-bold tabular-nums" style={{ color: '#d97706' }}>
            {flaggedCount}
          </span>
          <span className="text-xs" style={{ color: '#d97706' }}>
            flagged
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
        >
          <span className="text-sm font-bold tabular-nums" style={{ color: '#dc2626' }}>
            {escalatedCount}
          </span>
          <span className="text-xs" style={{ color: '#dc2626' }}>
            escalated
          </span>
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <th style={thStyle}>Covenant</th>
              <th style={thStyle}>Agent A</th>
              <th style={thStyle}>Agent B</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Agreement</th>
              <th style={thStyle}>Routing</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((comp, i) => {
              const a = valA?.find((x) => x.covenant_name === comp.covenant_name);
              const b = valB?.find((x) => x.covenant_name === comp.covenant_name);
              const disagree =
                a && b && a.validation_status !== b.validation_status;

              return (
                <tr
                  key={i}
                  style={{
                    backgroundColor: disagree
                      ? 'rgba(251,191,36,0.04)'
                      : 'transparent',
                  }}
                >
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                      color: '#0f172a',
                      minWidth: '150px',
                    }}
                  >
                    {comp.covenant_name}
                  </td>
                  <td style={{ ...tdStyle, minWidth: '160px' }}>
                    {a ? (
                      <div>
                        <StatusPill status={a.validation_status} />
                        {a.reasoning && (
                          <div
                            className="mt-1"
                            title={a.reasoning}
                            style={{
                              fontSize: '10px',
                              color: '#94a3b8',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '200px',
                            }}
                          >
                            {a.reasoning}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '10px' }}>—</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, minWidth: '160px' }}>
                    {b ? (
                      <div>
                        <StatusPill status={b.validation_status} />
                        {(b.concerns && b.concerns !== 'none') && (
                          <div
                            className="mt-1"
                            title={b.concerns}
                            style={{
                              fontSize: '10px',
                              color: '#94a3b8',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '200px',
                            }}
                          >
                            {b.concerns}
                          </div>
                        )}
                        {(!b.concerns || b.concerns === 'none') && b.reasoning && (
                          <div
                            className="mt-1"
                            title={b.reasoning}
                            style={{
                              fontSize: '10px',
                              color: '#94a3b8',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '200px',
                            }}
                          >
                            {b.reasoning}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '10px' }}>—</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {disagree ? (
                      <span style={{ color: '#d97706', fontSize: '13px' }}>✗</span>
                    ) : (
                      <span style={{ color: '#16a34a', fontSize: '13px' }}>✓</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <RoutingPill status={comp.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BreachDetectionTable({ results }: { results: BreachDetectionItem[] }) {
  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '6px 12px 6px 0',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '8px 12px 8px 0',
    fontSize: '11px',
    verticalAlign: 'top',
    borderTop: '1px solid #f8fafc',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
            <th style={thStyle}>Covenant</th>
            <th style={thStyle}>Actual Value</th>
            <th style={thStyle}>Threshold</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Delta</th>
            <th style={thStyle}>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i}>
              <td style={{ ...tdStyle, fontWeight: 600, color: '#0f172a', minWidth: '150px' }}>
                {r.covenant_name}
              </td>
              <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#0f172a' }}>
                {r.actual_value}
              </td>
              <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#64748b', whiteSpace: 'nowrap' }}>
                {r.threshold_operator} {r.threshold_value}
              </td>
              <td style={tdStyle}>
                <BreachStatusPill status={r.status} />
              </td>
              <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#64748b' }}>
                {r.breach_delta != null ? (
                  <span style={{ color: r.status !== 'compliant' ? '#dc2626' : '#64748b' }}>
                    {r.breach_delta > 0 ? '+' : ''}
                    {r.breach_delta}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td style={tdStyle}>
                <ConfidenceBadge value={r.confidence} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BreachSummaryCard({ summary }: { summary: BreachSummaryResult }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold" style={{ color: '#0f172a' }}>
            {summary.borrower_name}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            Executive Breach Summary
          </div>
        </div>
        <RiskBadge level={summary.overall_risk_assessment} />
      </div>

      {/* Overview paragraph */}
      <div
        className="text-sm leading-relaxed p-4 rounded-lg"
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          color: '#374151',
        }}
      >
        {summary.breach_summary}
      </div>

      {/* Breach list */}
      {summary.breaches && summary.breaches.length > 0 && (
        <div>
          <div
            className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: '#94a3b8' }}
          >
            Breaches ({summary.breaches.length})
          </div>
          <div className="space-y-2">
            {summary.breaches.map((b, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
              >
                <div className="flex-1">
                  <div className="text-xs font-semibold" style={{ color: '#0f172a' }}>
                    {b.covenant_name}
                  </div>
                  {(b.actual_value != null || b.threshold != null) && (
                    <div className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>
                      Actual: {b.actual_value ?? '—'} · Threshold: {b.threshold ?? '—'}
                      {b.severity && (
                        <span
                          className="ml-2 font-semibold"
                          style={{ color: b.severity.toLowerCase() === 'hard' ? '#dc2626' : '#d97706' }}
                        >
                          {b.severity}
                        </span>
                      )}
                    </div>
                  )}
                  {b.recommended_action && (
                    <div className="text-[11px] mt-1" style={{ color: '#374151' }}>
                      → {b.recommended_action}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next steps */}
      {summary.recommended_next_steps && summary.recommended_next_steps.length > 0 && (
        <div>
          <div
            className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: '#94a3b8' }}
          >
            Recommended Next Steps
          </div>
          <ul className="space-y-1.5">
            {summary.recommended_next_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#374151' }}>
                <span className="font-bold mt-0.5" style={{ color: '#3b82f6', flexShrink: 0 }}>
                  {i + 1}.
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sector context */}
      {summary.sector_context && (
        <div
          className="text-[11px] px-3 py-2 rounded-lg italic"
          style={{
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            border: '1px solid #e2e8f0',
          }}
        >
          {summary.sector_context}
        </div>
      )}
    </div>
  );
}

function ResultsPanel({ data }: { data: Partial<PipelineApiResponse> }) {
  const [open, setOpen] = useState({
    extraction: true,
    validation: true,
    breachDetection: true,
    breachSummary: true,
  });

  const toggle = (key: keyof typeof open) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const covenants = data.agents?.covenant_extractor?.result as ExtractedCovenant[] | null;
  const valA = data.agents?.validation_agent_a?.result as ValidationResultA[] | null;
  const valB = data.agents?.validation_agent_b?.result as ValidationResultB[] | null;
  const comparison = data.agents?.comparison?.result as ComparisonItem[] | null;
  const breachDetection = data.agents?.breach_detection?.result as BreachDetectionItem[] | null;
  const breachSummary = data.agents?.breach_summary?.result as BreachSummaryResult | null;

  const extractorDuration = data.agents?.covenant_extractor?.duration_ms;
  const comparisonDuration = data.agents?.comparison?.duration_ms;
  const breachDuration = data.agents?.breach_detection?.duration_ms;
  const summaryDuration = data.agents?.breach_summary?.duration_ms;

  function durationLabel(ms?: number) {
    if (!ms) return null;
    return (
      <span className="text-xs tabular-nums" style={{ color: '#94a3b8' }}>
        {(ms / 1000).toFixed(1)}s
      </span>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <div
        className="text-[10px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: '#94a3b8' }}
      >
        Pipeline Results — {data.deal?.borrower_name || 'Processing…'}
      </div>

      {/* Covenant Extractor */}
      {covenants && covenants.length > 0 && (
        <SectionCard
          title="Covenant Extractor"
          meta={
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}
              >
                {covenants.length} covenants
              </span>
              {durationLabel(extractorDuration)}
            </div>
          }
          open={open.extraction}
          onToggle={() => toggle('extraction')}
        >
          <ExtractionTable covenants={covenants} />
        </SectionCard>
      )}

      {/* Validation Funnel */}
      {comparison && comparison.length > 0 && (
        <SectionCard
          title="Validation Funnel"
          meta={
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#64748b' }}>
                Dual-agent comparison
              </span>
              {durationLabel(comparisonDuration)}
            </div>
          }
          open={open.validation}
          onToggle={() => toggle('validation')}
        >
          <ValidationPanel valA={valA} valB={valB} comparison={comparison} />
        </SectionCard>
      )}

      {/* Breach Detection */}
      {breachDetection && breachDetection.length > 0 && (
        <SectionCard
          title="Breach Detection"
          meta={
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: breachDetection.some((r) => r.status !== 'compliant')
                    ? '#fef2f2'
                    : '#f0fdf4',
                  color: breachDetection.some((r) => r.status !== 'compliant')
                    ? '#dc2626'
                    : '#16a34a',
                }}
              >
                {breachDetection.filter((r) => r.status !== 'compliant').length} breach
                {breachDetection.filter((r) => r.status !== 'compliant').length !== 1 ? 'es' : ''}
              </span>
              {durationLabel(breachDuration)}
            </div>
          }
          open={open.breachDetection}
          onToggle={() => toggle('breachDetection')}
        >
          <BreachDetectionTable results={breachDetection} />
        </SectionCard>
      )}

      {/* Breach Summary */}
      {breachSummary && (
        <SectionCard
          title="Breach Summary"
          meta={
            <div className="flex items-center gap-2">
              <RiskBadge level={breachSummary.overall_risk_assessment} />
              {durationLabel(summaryDuration)}
            </div>
          }
          open={open.breachSummary}
          onToggle={() => toggle('breachSummary')}
        >
          <BreachSummaryCard summary={breachSummary} />
        </SectionCard>
      )}
    </div>
  );
}

// ─── Pipeline stages ───────────────────────────────────────────────────────────

// ─── FileDropzone ──────────────────────────────────────────────────────────────

function FileDropzone({
  label,
  accept,
  required,
  helperText,
  file,
  onFile,
}: {
  label: string;
  accept: string;
  required?: boolean;
  helperText?: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs font-semibold" style={{ color: '#374151' }}>
          {label}
        </span>
        {required && (
          <span className="text-[10px]" style={{ color: '#dc2626' }}>
            *
          </span>
        )}
        {helperText && (
          <span className="text-[11px]" style={{ color: '#94a3b8' }}>
            — {helperText}
          </span>
        )}
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        className="flex flex-col items-center justify-center rounded-lg cursor-pointer"
        style={{
          border: `2px dashed ${isDragging ? '#3b82f6' : file ? '#10b981' : '#e2e8f0'}`,
          backgroundColor: isDragging ? '#eff6ff' : file ? '#f0fdf4' : '#fafafa',
          padding: '20px 16px',
          minHeight: '88px',
          transition: 'border-color 0.15s ease, background-color 0.15s ease',
        }}
      >
        {file ? (
          <div className="flex items-center gap-2 w-full">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: '#0f172a' }}>
                {file.name}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFile(null);
              }}
              className="flex-shrink-0 p-1 rounded"
              style={{ color: '#94a3b8' }}
              aria-label="Remove file"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={18} style={{ color: '#94a3b8', marginBottom: '6px' }} />
            <div className="text-xs font-medium" style={{ color: '#374151' }}>
              Drop PDF here or click to browse
            </div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}

// ─── PipelineStepper ───────────────────────────────────────────────────────────

function PipelineStepper({ steps, liveTimerMs }: { steps: StepInfo[]; liveTimerMs?: number }) {
  const successCount = steps.filter((s) => s.state === 'success').length;
  const n = steps.length;
  const pct = n > 1 ? (successCount / (n - 1)) * 100 : 0;

  return (
    <div className="relative" style={{ paddingTop: '4px' }}>
      {/* Background track */}
      <div
        className="absolute left-0 right-0"
        style={{ top: '17px', height: '2px', backgroundColor: '#e2e8f0', zIndex: 0 }}
      />
      {/* Progress fill */}
      <div
        className="absolute left-0"
        style={{
          top: '17px',
          height: '2px',
          backgroundColor: '#10b981',
          width: `${pct}%`,
          zIndex: 1,
          transition: 'width 0.6s ease',
        }}
      />
      {/* Step nodes */}
      <div className="relative flex justify-between" style={{ zIndex: 2 }}>
        {PIPELINE_STAGES.map((stage, idx) => {
          const { state, duration } = steps[idx] ?? { state: 'pending' as StepState };
          const isLoading = state === 'loading';
          const isSuccess = state === 'success';
          const isError = state === 'error';
          const isSkipped = state === 'skipped';

          return (
            <div key={stage} className="flex flex-col items-center" style={{ gap: '6px' }}>
              {/* Circle */}
              <div
                className={`flex items-center justify-center rounded-full${isLoading ? ' animate-pulse' : ''}`}
                style={{
                  width: '28px',
                  height: '28px',
                  backgroundColor: isSuccess
                    ? '#10b981'
                    : isError
                    ? '#ef4444'
                    : isSkipped
                    ? '#e2e8f0'
                    : '#fff',
                  border: `2px solid ${
                    isSuccess
                      ? '#10b981'
                      : isError
                      ? '#ef4444'
                      : isLoading
                      ? '#3b82f6'
                      : isSkipped
                      ? '#cbd5e1'
                      : '#e2e8f0'
                  }`,
                  boxShadow: isLoading ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
                  transition:
                    'background-color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
                }}
              >
                {isSuccess && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {isError && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
                {!isSuccess && !isError && (
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: isLoading ? '#3b82f6' : isSkipped ? '#94a3b8' : '#94a3b8',
                    }}
                  >
                    {idx + 1}
                  </span>
                )}
              </div>
              {/* Label + duration */}
              <div className="flex flex-col items-center" style={{ gap: '1px' }}>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    color: isSuccess
                      ? '#10b981'
                      : isError
                      ? '#ef4444'
                      : isLoading
                      ? '#3b82f6'
                      : isSkipped
                      ? '#cbd5e1'
                      : '#94a3b8',
                    maxWidth: '56px',
                    textAlign: 'center',
                    lineHeight: 1.3,
                    display: 'block',
                    transition: 'color 0.4s ease',
                  }}
                >
                  {stage}
                </span>
                {isLoading && liveTimerMs != null ? (
                  <span
                    style={{
                      fontSize: '8px',
                      color: '#3b82f6',
                      textAlign: 'center',
                      fontFamily: 'monospace',
                    }}
                  >
                    {(liveTimerMs / 1000).toFixed(1)}s
                  </span>
                ) : duration ? (
                  <span
                    style={{
                      fontSize: '8px',
                      color: '#94a3b8',
                      textAlign: 'center',
                      fontFamily: 'monospace',
                    }}
                  >
                    {duration}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FinancialsSkippedBanner ───────────────────────────────────────────────────

function FinancialsSkippedBanner({
  addedFile,
  onAddFile,
  onRerun,
  isRerunning,
}: {
  addedFile: File | null;
  onAddFile: (f: File | null) => void;
  onRerun: () => void;
  isRerunning: boolean;
}) {
  return (
    <div
      className="mt-5 rounded-lg p-4 space-y-3"
      style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}
    >
      <div className="flex items-start gap-2.5">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#d97706"
          strokeWidth="2"
          className="flex-shrink-0 mt-0.5"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <div className="text-xs font-semibold" style={{ color: '#92400e' }}>
            Breach Detection skipped — no financial statements uploaded.
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#b45309' }}>
            Upload financials below to test covenant thresholds against actual financial data.
          </div>
        </div>
      </div>

      <FileDropzone
        label="Financial Statements (PDF)"
        accept=".pdf"
        helperText="Required for breach detection"
        file={addedFile}
        onFile={onAddFile}
      />

      {addedFile && (
        <button
          onClick={onRerun}
          disabled={isRerunning}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{
            backgroundColor: isRerunning ? '#f1f5f9' : '#0f172a',
            color: isRerunning ? '#94a3b8' : '#fff',
            cursor: isRerunning ? 'not-allowed' : 'pointer',
            border: 'none',
          }}
        >
          {isRerunning && (
            <span
              className="animate-spin inline-block rounded-full flex-shrink-0"
              style={{
                width: '13px',
                height: '13px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
              }}
            />
          )}
          {isRerunning ? 'Running breach detection…' : 'Re-run Breach Detection'}
        </button>
      )}
    </div>
  );
}

// ─── UploadPanel ───────────────────────────────────────────────────────────────

function UploadPanel({ onSelectMock }: { onSelectMock: () => void }) {
  const { setPipelineResult } = usePipeline();
  const [creditFile, setCreditFile] = useState<File | null>(null);
  const [financialFile, setFinancialFile] = useState<File | null>(null);
  const [steps, setSteps] = useState<StepInfo[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [apiResult, setApiResult] = useState<Partial<PipelineApiResponse> | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [liveTimerMs, setLiveTimerMs] = useState(0);
  const [showFinancialsPrompt, setShowFinancialsPrompt] = useState(false);
  const [addedFinancialFile, setAddedFinancialFile] = useState<File | null>(null);
  const [isBreachRerunning, setIsBreachRerunning] = useState(false);
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const agentStartRef = useRef<number>(0);
  const accumulatedRef = useRef<Partial<PipelineApiResponse>>({});

  function stopLiveTimer() {
    if (liveTimerRef.current !== null) {
      clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
  }

  function applyStreamEvent(event: StreamEvent) {
    const { agent, status } = event;
    const stepIdx = AGENT_TO_STEP_IDX[agent];

    if (status === 'running') {
      agentStartRef.current = Date.now();
      setLiveTimerMs(0);
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
      liveTimerRef.current = setInterval(
        () => setLiveTimerMs(Date.now() - agentStartRef.current),
        100
      );
      if (stepIdx != null) {
        setSteps((prev) =>
          prev.map((s, i) => (i === stepIdx ? { state: 'loading' as StepState } : s))
        );
      }
      return;
    }

    if (status === 'complete') {
      stopLiveTimer();
      if (stepIdx != null) {
        const duration = event.duration_ms
          ? `${(event.duration_ms / 1000).toFixed(1)}s`
          : undefined;
        setSteps((prev) =>
          prev.map((s, i) =>
            i === stepIdx ? { state: 'success' as StepState, duration } : s
          )
        );
      }
      if (agent === '__done__') {
        accumulatedRef.current = {
          ...accumulatedRef.current,
          deal: {
            borrower_name: event.borrower_name ?? 'Unknown',
            deal_date: event.deal_date ?? '',
            logged_at: event.logged_at ?? '',
          },
          pipeline_status: event.pipeline_status ?? 'complete',
        };
        const final = { ...accumulatedRef.current };
        setApiResult(final);
        setPipelineResult(final as unknown as Parameters<typeof setPipelineResult>[0]);
      } else if (event.result !== undefined) {
        accumulatedRef.current = {
          ...accumulatedRef.current,
          agents: {
            ...accumulatedRef.current.agents,
            [agent]: {
              status: 'success',
              result: event.result,
              duration_ms: event.duration_ms,
            },
          },
        };
        setApiResult({ ...accumulatedRef.current });
      }
      return;
    }

    if (status === 'skipped') {
      if (stepIdx != null) {
        setSteps((prev) =>
          prev.map((s, i) => (i === stepIdx ? { state: 'skipped' as StepState } : s))
        );
      }
      if (agent === 'breach_detection') {
        setShowFinancialsPrompt(true);
      }
      accumulatedRef.current = {
        ...accumulatedRef.current,
        agents: {
          ...accumulatedRef.current.agents,
          [agent]: agent.startsWith('breach')
            ? null
            : { status: 'skipped', result: null },
        },
      };
      return;
    }

    if (status === 'error') {
      stopLiveTimer();
      if (stepIdx != null) {
        setSteps((prev) =>
          prev.map((s, i) => (i === stepIdx ? { state: 'error' as StepState } : s))
        );
      }
      if (event.error) setApiError(event.error);
    }
  }

  async function consumeStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onEvent: (e: StreamEvent) => void
  ) {
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          onEvent(JSON.parse(trimmed) as StreamEvent);
        } catch { /* skip malformed lines */ }
      }
    }
  }

  async function handleRun() {
    if (!creditFile || isRunning) return;

    setPipelineResult(null);
    setApiResult(null);
    setApiError(null);
    setIsDone(false);
    setIsRunning(true);
    setShowFinancialsPrompt(false);
    setAddedFinancialFile(null);
    stopLiveTimer();
    accumulatedRef.current = { agents: {} };

    setSteps(
      PIPELINE_STAGES.map((_, i) => ({
        state: (i === 0 ? 'success' : 'pending') as StepState,
      }))
    );

    try {
      const formData = new FormData();
      formData.append('creditAgreement', creditFile);
      if (financialFile) formData.append('financials', financialFile);

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text.slice(0, 200)}`);
      }
      if (!res.body) throw new Error('No response body');

      await consumeStream(res.body.getReader(), applyStreamEvent);
      setIsDone(true);
    } catch (err) {
      stopLiveTimer();
      const msg = err instanceof Error ? err.message : String(err);
      setApiError(msg);
      setSteps((prev) =>
        prev.map((s) => (s.state === 'loading' ? { state: 'error' as StepState } : s))
      );
    } finally {
      setIsRunning(false);
    }
  }

  async function handleBreachRerun() {
    if (!addedFinancialFile || isBreachRerunning) return;
    const covenants = (
      accumulatedRef.current.agents?.covenant_extractor as
        | { result?: unknown }
        | undefined
    )?.result;
    if (!covenants) return;

    setIsBreachRerunning(true);
    setApiError(null);
    setShowFinancialsPrompt(false);
    stopLiveTimer();
    setSteps((prev) =>
      prev.map((s, i) => (i === 5 || i === 6 ? { state: 'pending' as StepState } : s))
    );

    try {
      const formData = new FormData();
      formData.append('covenants', JSON.stringify(covenants));
      formData.append('financials', addedFinancialFile);

      const res = await fetch('/api/analyze-breach', { method: 'POST', body: formData });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text.slice(0, 200)}`);
      }
      if (!res.body) throw new Error('No response body');

      await consumeStream(res.body.getReader(), applyStreamEvent);
    } catch (err) {
      stopLiveTimer();
      const msg = err instanceof Error ? err.message : String(err);
      setApiError(msg);
      setSteps((prev) =>
        prev.map((s) => (s.state === 'loading' ? { state: 'error' as StepState } : s))
      );
    } finally {
      setIsBreachRerunning(false);
    }
  }

  const canRun = !!creditFile && !isRunning && !isBreachRerunning;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}
      >
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ width: '32px', height: '32px', backgroundColor: '#eff6ff' }}
        >
          <Upload size={16} style={{ color: '#3b82f6' }} />
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>
            Agent Pipeline Upload
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            Upload documents to run the full AI extraction and breach detection pipeline
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Dropzones */}
        <div className="grid grid-cols-2 gap-5 mb-6">
          <FileDropzone
            label="Credit Agreement (PDF)"
            accept=".pdf"
            required
            file={creditFile}
            onFile={setCreditFile}
          />
          <FileDropzone
            label="Financial Statements (PDF)"
            accept=".pdf"
            helperText="Optional — needed for breach detection"
            file={financialFile}
            onFile={setFinancialFile}
          />
        </div>

        {/* Run button + status */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleRun}
            disabled={!canRun}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
            style={{
              backgroundColor: canRun ? '#0f172a' : '#f1f5f9',
              color: canRun ? '#fff' : '#94a3b8',
              cursor: canRun ? 'pointer' : 'not-allowed',
              border: 'none',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
          >
            {isRunning && (
              <span
                className="animate-spin inline-block rounded-full flex-shrink-0"
                style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                }}
              />
            )}
            {isRunning ? 'Running pipeline…' : isDone ? 'Run Again' : 'Run Agent Pipeline'}
          </button>
          {!creditFile && !isRunning && !isDone && (
            <span className="text-xs" style={{ color: '#94a3b8' }}>
              Upload a credit agreement to enable
            </span>
          )}
          {isDone && !apiError && (
            <span className="text-xs font-medium" style={{ color: '#10b981' }}>
              ✓ Pipeline complete
            </span>
          )}
        </div>

        {/* Stepper */}
        <div>
          <div
            className="text-[10px] font-semibold uppercase tracking-widest mb-5"
            style={{ color: '#94a3b8' }}
          >
            Pipeline Stages
          </div>
          <PipelineStepper steps={steps} liveTimerMs={isRunning || isBreachRerunning ? liveTimerMs : undefined} />
        </div>

        {/* Error banner */}
        {apiError && (() => {
          const isApiKeyError = apiError.includes('API key not configured');
          return (
            <div
              className="mt-5 flex items-start gap-3 px-4 py-3 rounded-lg text-sm"
              style={{
                backgroundColor: isApiKeyError ? '#fffbeb' : '#fef2f2',
                border: `1px solid ${isApiKeyError ? '#fde68a' : '#fecaca'}`,
                color: isApiKeyError ? '#92400e' : '#dc2626',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="flex-shrink-0 mt-0.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                {isApiKeyError ? (
                  <>
                    <div className="font-semibold text-xs mb-0.5">API key not configured</div>
                    <div className="text-xs" style={{ color: '#92400e' }}>
                      API key not configured — contact the administrator to enable live agent processing.{' '}
                      You can still explore the platform using{' '}
                      <button
                        onClick={() => onSelectMock()}
                        className="underline font-semibold"
                        style={{ color: '#92400e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        mock data
                      </button>
                      .
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-xs mb-0.5">Pipeline error</div>
                    <div className="text-xs" style={{ color: '#991b1b' }}>
                      {apiError}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* No-financials prompt */}
        {showFinancialsPrompt && !isRunning && (
          <FinancialsSkippedBanner
            addedFile={addedFinancialFile}
            onAddFile={setAddedFinancialFile}
            onRerun={handleBreachRerun}
            isRerunning={isBreachRerunning}
          />
        )}

        {/* Results panel — renders progressively as agents complete */}
        {apiResult && <ResultsPanel data={apiResult} />}
      </div>
    </div>
  );
}

// ─── DealSourcingPage ──────────────────────────────────────────────────────────

export default function DealSourcingPage({ pipeline, deals, borrowers: _borrowers }: Props) {
  const [selectedId, setSelectedId] = useState<string>(pipeline[0]?.id ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<'mock' | 'upload' | null>(null);
  const mockContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  const selected = pipeline.find((p) => p.id === selectedId);
  const selectedDeal = selected ? deals.find((d) => d.id === selected.dealId) : undefined;

  const timelineEntries = useMemo(
    () => (selected ? buildTimeline(selected) : []),
    [selected]
  );

  const avgConf = pipeline.reduce((s, p) => s + p.detectionConfidence, 0) / pipeline.length;
  const mostRecent = pipeline.reduce(
    (best, p) => (p.emailDate > best ? p.emailDate : best),
    pipeline[0]?.emailDate ?? ''
  );
  const divisionCounts = deals.reduce<Record<string, number>>((acc, d) => {
    acc[d.division] = (acc[d.division] ?? 0) + 1;
    return acc;
  }, {});

  function handleModeSelect(mode: 'mock' | 'upload') {
    setActiveMode(mode);
    if (mode === 'mock') {
      setTimeout(() => {
        mockContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Deal Sourcing"
        description="Incoming credit agreement detection · Deal Spotter agent"
      />

      {isLoading ? (
        <div className="rounded-lg p-8" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
          <Skeleton />
        </div>
      ) : (
        <>
          {/* ── Mode Selector ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Explore Mock Data */}
            <button
              onClick={() => handleModeSelect('mock')}
              className="w-full text-left rounded-lg p-5"
              style={{
                backgroundColor: activeMode === 'mock' ? '#f8fafc' : '#fff',
                border: `1px solid ${activeMode === 'mock' ? '#94a3b8' : '#e2e8f0'}`,
                boxShadow:
                  activeMode === 'mock'
                    ? '0 0 0 2px rgba(100,116,139,0.08)'
                    : '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: activeMode === 'mock' ? '#e2e8f0' : '#f1f5f9',
                  }}
                >
                  <Database size={20} style={{ color: '#64748b' }} />
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1" style={{ color: '#0f172a' }}>
                    Explore Mock Data
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                    Browse pre-loaded demo data with 75 borrowers across all divisions
                  </div>
                </div>
              </div>
            </button>

            {/* Upload Credit Agreement — primary */}
            <button
              onClick={() => handleModeSelect('upload')}
              className="w-full text-left rounded-lg p-5"
              style={{
                backgroundColor: activeMode === 'upload' ? '#eff6ff' : '#fff',
                border: '1px solid #bfdbfe',
                borderLeft: '4px solid #3b82f6',
                boxShadow:
                  activeMode === 'upload'
                    ? '0 0 0 3px rgba(59,130,246,0.08)'
                    : '0 1px 3px rgba(59,130,246,0.1)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff' }}
                >
                  <Upload size={20} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold" style={{ color: '#1d4ed8' }}>
                      Upload Credit Agreement
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}
                    >
                      Live
                    </span>
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: '#3b82f6' }}>
                    Upload a real credit agreement and financial statements to run the AI agent
                    pipeline live
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* ── Upload Panel ───────────────────────────────────────── */}
          {activeMode === 'upload' && <UploadPanel onSelectMock={() => handleModeSelect('mock')} />}

          {/* ── Mock data content ──────────────────────────────────── */}
          {activeMode === 'mock' && (
            <div ref={mockContentRef}>
              {/* Two-panel layout */}
              <div className="flex gap-5 mb-6" style={{ minHeight: '640px' }}>
                {/* Left: Email inbox */}
                <div
                  className="rounded-lg overflow-hidden flex flex-col flex-shrink-0"
                  style={{
                    width: '42%',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    className="px-4 py-3 flex items-center justify-between flex-shrink-0"
                    style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}
                  >
                    <span
                      className="text-[11px] font-semibold uppercase tracking-widest"
                      style={{ color: '#94a3b8' }}
                    >
                      Incoming Deals
                    </span>
                    <span className="text-[11px]" style={{ color: '#94a3b8' }}>
                      {pipeline.length} emails
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {pipeline.map((item) => {
                      const isActive = item.id === selectedId;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          className="w-full text-left px-4 py-3.5 transition-colors"
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            borderLeft: `3px solid ${isActive ? '#3b82f6' : 'transparent'}`,
                            backgroundColor: isActive ? '#f8fafc' : '#fff',
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span
                              className="text-[11px] font-medium truncate"
                              style={{ color: '#64748b' }}
                            >
                              {item.emailFrom}
                            </span>
                            <span
                              className="text-[10px] flex-shrink-0"
                              style={{ color: '#94a3b8' }}
                            >
                              {fmtDateShort(item.emailDate)}
                            </span>
                          </div>
                          <div
                            className="text-xs font-medium mb-1 line-clamp-1"
                            style={{ color: '#0f172a' }}
                          >
                            {item.emailSubject}
                          </div>
                          <div
                            className="text-[11px] mb-2 line-clamp-2 leading-relaxed"
                            style={{ color: '#94a3b8' }}
                          >
                            {item.emailSnippet}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.attachments[0] && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] truncate max-w-[160px]"
                                style={{ color: '#64748b' }}
                              >
                                <svg
                                  width="10"
                                  height="10"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                                {item.attachments[0]}
                              </span>
                            )}
                            <span
                              className="inline-flex items-center gap-1 rounded-full text-[10px] font-medium px-2 py-0.5 flex-shrink-0"
                              style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}
                            >
                              ✓ {item.status}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Deal detail */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                  {selected ? (
                    <>
                      <div
                        className="rounded-lg p-5"
                        style={{
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <span
                            className="inline-flex items-center gap-1.5 rounded font-medium"
                            style={{
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              padding: '3px 10px',
                              fontSize: '12px',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot flex-shrink-0" />
                            {selected.detectedBy}
                          </span>
                          <span className="text-[11px]" style={{ color: '#94a3b8' }}>
                            Active · Monitoring inbox
                          </span>
                        </div>

                        <div className="mb-5">
                          <div
                            className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                            style={{ color: '#94a3b8' }}
                          >
                            Detection Confidence
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <ConfidenceBar value={selected.detectionConfidence} showLabel={false} />
                            </div>
                            <span
                              className="text-sm font-semibold tabular-nums"
                              style={{ color: '#0f172a' }}
                            >
                              {Math.round(selected.detectionConfidence * 100)}%
                            </span>
                          </div>
                        </div>

                        <AgentActivityTimeline entries={timelineEntries} title="Detection log" />
                      </div>

                      {selectedDeal ? (
                        <div
                          className="rounded-lg p-5 flex-1"
                          style={{
                            backgroundColor: '#fff',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          }}
                        >
                          <div
                            className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                            style={{ color: '#94a3b8' }}
                          >
                            Deal Summary
                          </div>
                          <div
                            className="text-lg font-semibold mb-4"
                            style={{ color: '#0f172a' }}
                          >
                            {selectedDeal.borrowerName}
                          </div>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                            <Field label="Deal Type" value={selectedDeal.dealType} />
                            <Field
                              label="Amount"
                              value={`$${selectedDeal.amount}${selectedDeal.amountUnit}`}
                            />
                            <Field label="Division" value={selectedDeal.division} />
                            <Field label="Sector" value={selectedDeal.sector} />
                            <Field
                              label="Relationship Manager"
                              value={selectedDeal.relationshipManager}
                            />
                            <Field label="Loan Officer" value={selectedDeal.loanOfficer} />
                            <Field label="Deal Date" value={fmtDate(selectedDeal.dealDate)} />
                            <Field
                              label="Maturity Date"
                              value={fmtDate(selectedDeal.maturityDate)}
                            />
                            <Field label="Law Firm" value={selectedDeal.lawFirm} />
                            <Field label="Status" value={selectedDeal.status} />
                          </div>
                          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                            <Link
                              href={`/extraction?borrower=${selectedDeal.borrowerId}`}
                              className="text-sm font-medium transition-colors hover:underline"
                              style={{ color: '#3b82f6' }}
                            >
                              View covenants →
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="rounded-lg p-5 flex-1 flex items-center justify-center"
                          style={{ border: '1px solid #e2e8f0' }}
                        >
                          <p className="text-sm" style={{ color: '#94a3b8' }}>
                            Deal record not found
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      className="rounded-lg p-8 flex-1 flex items-center justify-center"
                      style={{ border: '1px solid #e2e8f0' }}
                    >
                      <p className="text-sm" style={{ color: '#94a3b8' }}>
                        Select an email to view deal details
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ingestion summary */}
              <div
                className="rounded-lg p-5"
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  className="text-[11px] font-semibold uppercase tracking-widest mb-4"
                  style={{ color: '#94a3b8' }}
                >
                  Ingestion Summary
                </div>
                <div className="grid grid-cols-4 gap-6 items-start">
                  <div>
                    <div
                      className="text-2xl font-semibold tabular-nums"
                      style={{ color: '#0f172a' }}
                    >
                      {deals.length}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                      Total deals ingested
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-2xl font-semibold tabular-nums"
                      style={{ color: '#0f172a' }}
                    >
                      {Math.round(avgConf * 100)}%
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                      Avg detection confidence
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>
                      {fmtDate(mostRecent)}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                      Most recent ingestion
                    </div>
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {Object.entries(divisionCounts).map(([div, count]) => (
                        <span
                          key={div}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
                        >
                          {DIVISION_SHORT[div] ?? div}: {count}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs" style={{ color: '#64748b' }}>
                      By division
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
        style={{ color: '#94a3b8' }}
      >
        {label}
      </div>
      <div className="text-xs" style={{ color: '#0f172a' }}>
        {value}
      </div>
    </div>
  );
}
