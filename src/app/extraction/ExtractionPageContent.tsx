'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import ConfidenceBar from '@/components/ConfidenceBar';
import SeverityBadge from '@/components/SeverityBadge';
import AgentActivityTimeline from '@/components/AgentActivityTimeline';
import ConfidenceBreakdown from '@/components/ConfidenceBreakdown';
import type { Borrower, Covenant, CovenantTemplate } from '@/lib/types';

interface Props {
  borrowers: Borrower[];
  covenants: Covenant[];
  templates: CovenantTemplate[];
}

const VALIDATION_CONFIG = {
  'Auto-Validated': { bg: '#f0fdf4', text: '#16a34a', label: 'Auto-Validated' },
  'Flagged — Reviewed': { bg: '#fffbeb', text: '#d97706', label: 'Flagged — Reviewed' },
  'Escalated to Human': { bg: '#fef2f2', text: '#dc2626', label: 'Escalated to Human' },
};

const AGENT_ICON = {
  Approved: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Flagged: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="12" />
      <circle cx="12" cy="17" r="1" fill="#ef4444" />
    </svg>
  ),
};

function fmtThreshold(op: '>=' | '<=', threshold: number, unit: string): string {
  return `${op === '>=' ? '≥' : '≤'} ${threshold}${unit}`;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 p-6">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className="h-10 rounded"
          style={{ backgroundColor: '#f1f5f9' }}
        />
      ))}
    </div>
  );
}

export default function ExtractionPageContent({ borrowers, covenants, templates }: Props) {
  const searchParams = useSearchParams();
  const paramBorrower = searchParams.get('borrower');

  const sortedBorrowers = useMemo(
    () => [...borrowers].sort((a, b) => a.name.localeCompare(b.name)),
    [borrowers]
  );

  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>(
    paramBorrower ?? sortedBorrowers[0]?.id ?? ''
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (paramBorrower) setSelectedBorrowerId(paramBorrower);
  }, [paramBorrower]);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  const borrowerCovenants = useMemo(
    () => covenants.filter((c) => c.borrowerId === selectedBorrowerId),
    [covenants, selectedBorrowerId]
  );

  const selectedBorrower = borrowers.find((b) => b.id === selectedBorrowerId);

  // Stats for selected borrower
  const autoCount = borrowerCovenants.filter((c) => c.validationStatus === 'Auto-Validated').length;
  const flagCount = borrowerCovenants.filter((c) => c.validationStatus === 'Flagged — Reviewed').length;
  const escalCount = borrowerCovenants.filter((c) => c.validationStatus === 'Escalated to Human').length;
  const avgConf =
    borrowerCovenants.length > 0
      ? borrowerCovenants.reduce((s, c) => s + c.overallConfidence, 0) / borrowerCovenants.length
      : 0;

  const displayedCovenants = showAll ? borrowerCovenants : borrowerCovenants.slice(0, 20);

  // Timeline entries for the selected borrower
  const timelineEntries = useMemo(() => {
    if (!selectedBorrower || borrowerCovenants.length === 0) return [];
    const baseDate = new Date('2025-10-01T10:00:00Z').getTime();
    return [
      {
        timestamp: new Date(baseDate + 240000).toISOString(),
        agent: 'Covenant Extractor',
        action: `Reporting calendar generated for all validated covenants`,
      },
      {
        timestamp: new Date(baseDate + 180000).toISOString(),
        agent: 'Covenant Extractor',
        action: `${autoCount} auto-validated, ${flagCount} flagged, ${escalCount} escalated to human review`,
      },
      {
        timestamp: new Date(baseDate + 60000).toISOString(),
        agent: 'Covenant Extractor',
        action: `Extracted ${borrowerCovenants.length} covenants with average confidence ${Math.round(avgConf * 100)}%`,
      },
      {
        timestamp: new Date(baseDate).toISOString(),
        agent: 'Covenant Extractor',
        action: `Parsed credit agreement for ${selectedBorrower.name}`,
        confidence: avgConf,
      },
    ];
  }, [selectedBorrower, borrowerCovenants, autoCount, flagCount, escalCount, avgConf]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Covenant Extraction"
        description="AI-extracted covenants with per-field confidence scores · Covenant Extractor agent"
      />

      {isLoading ? (
        <div
          className="rounded-lg"
          style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
        >
          <Skeleton />
        </div>
      ) : (
        <>
          {/* ── Borrower selector + stats ──────────────────────────── */}
          <div className="flex items-center gap-6 mb-6 flex-wrap">
            {/* Dropdown */}
            <div className="flex items-center gap-2">
              <label
                className="text-[11px] font-semibold uppercase tracking-widest flex-shrink-0"
                style={{ color: '#94a3b8' }}
              >
                Borrower
              </label>
              <select
                value={selectedBorrowerId}
                onChange={(e) => {
                  setSelectedBorrowerId(e.target.value);
                  setExpandedId(null);
                  setShowAll(false);
                }}
                className="text-sm rounded-md px-3 py-1.5 pr-8"
                style={{
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  backgroundColor: '#fff',
                  outline: 'none',
                }}
              >
                {sortedBorrowers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stats pills */}
            <div className="flex items-center gap-3 flex-wrap">
              <Stat label="Covenants extracted" value={borrowerCovenants.length} />
              <StatSep />
              <Stat
                label="Avg confidence"
                value={`${Math.round(avgConf * 100)}%`}
                color={avgConf >= 0.9 ? '#16a34a' : avgConf >= 0.8 ? '#d97706' : '#dc2626'}
              />
              <StatSep />
              <Stat label="Auto-validated" value={autoCount} color="#16a34a" />
              <StatSep />
              <Stat label="Flagged" value={flagCount} color="#d97706" />
              <StatSep />
              <Stat label="Escalated" value={escalCount} color="#dc2626" />
            </div>
          </div>

          {/* ── Covenant table ──────────────────────────────────────── */}
          <div
            className="rounded-lg overflow-hidden mb-5"
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            {/* Table header */}
            <div
              className="grid text-[10px] font-semibold uppercase tracking-widest px-4 py-2.5"
              style={{
                gridTemplateColumns: '1.8fr 100px 90px 100px 70px 90px 110px 130px',
                backgroundColor: '#f8fafc',
                color: '#94a3b8',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <span>Covenant</span>
              <span>Threshold</span>
              <span>Frequency</span>
              <span>Class.</span>
              <span>Severity</span>
              <span>Clause</span>
              <span>Confidence</span>
              <span>Status</span>
            </div>

            {borrowerCovenants.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm" style={{ color: '#94a3b8' }}>
                  No covenants extracted for this borrower
                </p>
              </div>
            ) : (
              <>
                {displayedCovenants.map((cov) => {
                  const isExpanded = expandedId === cov.id;
                  const vc = VALIDATION_CONFIG[cov.validationStatus];
                  const template = templates.find((t) => t.id === cov.templateId);
                  const bothApproved =
                    cov.validationAgentA === 'Approved' && cov.validationAgentB === 'Approved';
                  const disagreement =
                    cov.validationAgentA !== cov.validationAgentB;

                  return (
                    <div key={cov.id}>
                      {/* Main row */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : cov.id)}
                        className="w-full text-left transition-colors"
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #f8fafc',
                        }}
                      >
                        <div
                          className="grid px-4 py-3 items-center"
                          style={{
                            gridTemplateColumns: '1.8fr 100px 90px 100px 70px 90px 110px 130px',
                            backgroundColor: isExpanded ? '#f8fafc' : undefined,
                          }}
                        >
                          {/* Covenant name */}
                          <span
                            className="text-xs font-medium flex items-center gap-1.5"
                            style={{ color: '#0f172a' }}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#94a3b8"
                              strokeWidth="2"
                              style={{
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.15s',
                                flexShrink: 0,
                              }}
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                            {cov.name}
                          </span>
                          {/* Threshold */}
                          <span
                            className="text-xs tabular-nums font-medium"
                            style={{ color: '#374151' }}
                          >
                            {fmtThreshold(cov.operator, cov.threshold, cov.unit)}
                          </span>
                          {/* Frequency */}
                          <span className="text-xs" style={{ color: '#64748b' }}>
                            {cov.frequency}
                          </span>
                          {/* Classification */}
                          <span>
                            <span
                              className="inline-flex items-center rounded-full text-[11px] font-medium px-2 py-0.5"
                              style={{
                                backgroundColor:
                                  cov.classification === 'Financial' ? '#eff6ff' : '#f5f3ff',
                                color:
                                  cov.classification === 'Financial' ? '#1d4ed8' : '#6d28d9',
                              }}
                            >
                              {cov.classification}
                            </span>
                          </span>
                          {/* Severity */}
                          <span>
                            <SeverityBadge severity={cov.severity} />
                          </span>
                          {/* Source clause */}
                          <span className="text-[11px]" style={{ color: '#94a3b8' }}>
                            {cov.sourceClause}
                          </span>
                          {/* Confidence */}
                          <div className="pr-2">
                            <ConfidenceBar value={cov.overallConfidence} />
                          </div>
                          {/* Status */}
                          <span>
                            <span
                              className="inline-flex items-center rounded-full text-[11px] font-medium px-2 py-0.5"
                              style={{ backgroundColor: vc?.bg, color: vc?.text }}
                            >
                              {vc?.label}
                            </span>
                          </span>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div
                          className="px-6 py-5 border-b"
                          style={{ backgroundColor: '#fafafa', borderColor: '#f1f5f9' }}
                        >
                          <div
                            className="grid gap-6"
                            style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
                          >
                            {/* Per-field confidence */}
                            <div>
                              <div
                                className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                                style={{ color: '#94a3b8' }}
                              >
                                Per-field confidence
                              </div>
                              <ConfidenceBreakdown scores={cov.confidenceScores as unknown as Record<string, number>} />
                            </div>

                            {/* Dual-agent validation */}
                            <div>
                              <div
                                className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                                style={{ color: '#94a3b8' }}
                              >
                                Dual-agent validation
                              </div>
                              <div className="flex gap-3 mb-3">
                                {/* Agent A */}
                                <div
                                  className="flex-1 rounded-lg p-3"
                                  style={{
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#fff',
                                  }}
                                >
                                  <div
                                    className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                                    style={{ color: '#94a3b8' }}
                                  >
                                    Agent A
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {AGENT_ICON[cov.validationAgentA]}
                                    <span
                                      className="text-xs font-medium"
                                      style={{
                                        color:
                                          cov.validationAgentA === 'Approved'
                                            ? '#16a34a'
                                            : '#dc2626',
                                      }}
                                    >
                                      {cov.validationAgentA}
                                    </span>
                                  </div>
                                </div>
                                {/* Agent B */}
                                <div
                                  className="flex-1 rounded-lg p-3"
                                  style={{
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#fff',
                                  }}
                                >
                                  <div
                                    className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                                    style={{ color: '#94a3b8' }}
                                  >
                                    Agent B
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {AGENT_ICON[cov.validationAgentB]}
                                    <span
                                      className="text-xs font-medium"
                                      style={{
                                        color:
                                          cov.validationAgentB === 'Approved'
                                            ? '#16a34a'
                                            : '#dc2626',
                                      }}
                                    >
                                      {cov.validationAgentB}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {/* Agreement / disagreement */}
                              {bothApproved ? (
                                <div
                                  className="text-[11px] font-medium px-2.5 py-1.5 rounded"
                                  style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}
                                >
                                  ✓ Agreement — both agents validated
                                </div>
                              ) : disagreement ? (
                                <div
                                  className="text-[11px] font-medium px-2.5 py-1.5 rounded"
                                  style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
                                >
                                  ⚠ Disagreement —{' '}
                                  <Link
                                    href="/exceptions"
                                    className="underline"
                                    style={{ color: '#dc2626' }}
                                  >
                                    routed to Exception Queue
                                  </Link>
                                </div>
                              ) : (
                                <div
                                  className="text-[11px] font-medium px-2.5 py-1.5 rounded"
                                  style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
                                >
                                  Both flagged — escalated to human
                                </div>
                              )}
                              {template && (
                                <div className="mt-2 text-[11px]" style={{ color: '#94a3b8' }}>
                                  Template:{' '}
                                  <span style={{ color: '#64748b' }}>
                                    {template.id} · {template.name}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Source + extraction info */}
                            <div>
                              <div
                                className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                                style={{ color: '#94a3b8' }}
                              >
                                Extraction source
                              </div>
                              <div
                                className="rounded-lg p-3 text-xs"
                                style={{
                                  border: '1px solid #e2e8f0',
                                  backgroundColor: '#fff',
                                  color: '#64748b',
                                  lineHeight: '1.6',
                                }}
                              >
                                Extracted from{' '}
                                <span
                                  className="font-semibold"
                                  style={{ color: '#0f172a' }}
                                >
                                  {cov.sourceClause}
                                </span>{' '}
                                of the credit agreement.
                                <div className="mt-2" style={{ color: '#94a3b8' }}>
                                  Reporting deadline: {cov.reportingDeadlineDays} days ·
                                  Grace period: {cov.gracePeriodDays} days
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Show more toggle */}
                {borrowerCovenants.length > 20 && (
                  <div
                    className="px-4 py-3 flex items-center gap-3"
                    style={{ borderTop: '1px solid #f1f5f9' }}
                  >
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="text-xs font-medium transition-colors"
                      style={{ color: '#3b82f6' }}
                    >
                      {showAll
                        ? 'Show 20'
                        : `Show all ${borrowerCovenants.length} covenants`}
                    </button>
                    <span className="text-[11px]" style={{ color: '#94a3b8' }}>
                      Showing {displayedCovenants.length} of {borrowerCovenants.length}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Agent Activity Timeline ─────────────────────────────── */}
          <div
            className="rounded-lg p-5 mb-5"
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <AgentActivityTimeline
              entries={timelineEntries}
              title="Extraction agent log"
            />
          </div>

          {/* ── Link to Validation Funnel ───────────────────────────── */}
          <div className="flex justify-end">
            <Link
              href="/validation"
              className="text-xs font-medium"
              style={{ color: '#64748b' }}
            >
              View full validation funnel →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="text-sm font-semibold tabular-nums"
        style={{ color: color ?? '#0f172a' }}
      >
        {value}
      </span>
      <span className="text-[11px]" style={{ color: '#94a3b8' }}>
        {label}
      </span>
    </div>
  );
}

function StatSep() {
  return (
    <span
      className="h-3 w-px"
      style={{ backgroundColor: '#e2e8f0', display: 'inline-block' }}
    />
  );
}
