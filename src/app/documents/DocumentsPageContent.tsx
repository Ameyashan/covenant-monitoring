'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import FilterBar from '@/components/FilterBar';
import AgentActivityTimeline from '@/components/AgentActivityTimeline';
import type { Financial, Outreach, Borrower } from '@/lib/types';

interface Props {
  financials: Financial[];
  outreach: Outreach[];
  borrowers: Borrower[];
}

const QUARTER_FILTERS = [
  { key: 'quarter', label: 'Quarter', options: [
    { value: 'all', label: 'All' },
    { value: 'Q3 2025', label: 'Q3 2025' },
    { value: 'Q2 2025', label: 'Q2 2025' },
    { value: 'Q1 2025', label: 'Q1 2025' },
    { value: 'Q4 2024', label: 'Q4 2024' },
  ]},
  { key: 'sector', label: 'Sector', options: [
    { value: 'all', label: 'All' },
    { value: 'Technology', label: 'Technology' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Manufacturing', label: 'Manufacturing' },
    { value: 'Real Estate', label: 'Real Estate' },
    { value: 'Retail', label: 'Retail' },
  ]},
];

const OUTREACH_FILTERS = [
  { key: 'status', label: 'Status', options: [
    { value: 'all', label: 'All' },
    { value: 'Responded', label: 'Responded' },
    { value: 'Delivered', label: 'Delivered' },
    { value: 'Overdue', label: 'Overdue' },
  ]},
  { key: 'quarter', label: 'Quarter', options: [
    { value: 'all', label: 'All' },
    { value: 'Q3 2025', label: 'Q3 2025' },
    { value: 'Q2 2025', label: 'Q2 2025' },
    { value: 'Q1 2025', label: 'Q1 2025' },
    { value: 'Q4 2024', label: 'Q4 2024' },
  ]},
];

const STATUS_OUTREACH: Record<string, { bg: string; text: string }> = {
  Responded: { bg: '#f0fdf4', text: '#16a34a' },
  Delivered: { bg: '#eff6ff', text: '#1d4ed8' },
  Overdue: { bg: '#fef2f2', text: '#dc2626' },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtDateCompact(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 p-6">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="h-10 rounded" style={{ backgroundColor: '#f1f5f9' }} />
      ))}
    </div>
  );
}

export default function DocumentsPageContent({ financials, outreach, borrowers }: Props) {
  const [activeTab, setActiveTab] = useState<'submissions' | 'outreach'>('submissions');
  const [finFilters, setFinFilters] = useState({ quarter: 'all', sector: 'all' });
  const [outFilters, setOutFilters] = useState({ status: 'all', quarter: 'all' });
  const [finSearch, setFinSearch] = useState('');
  const [finShowAll, setFinShowAll] = useState(false);
  const [outShowAll, setOutShowAll] = useState(false);
  const [expandedFinId, setExpandedFinId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  // Build borrower sector lookup
  const borrowerSector = useMemo(() => {
    const m = new Map<string, string>();
    borrowers.forEach((b) => m.set(b.id, b.sector));
    return m;
  }, [borrowers]);

  // Stats
  const totalSubmissions = financials.length;
  const q3Submissions = financials.filter((f) => f.quarter === 'Q3 2025').length;
  const avgConf =
    financials.reduce((s, f) => s + f.extractionConfidence, 0) / financials.length;
  const overdueCount = outreach.filter((o) => o.status === 'Overdue').length;
  const totalOutreach = outreach.length;

  // Filtered financials (most recent first)
  const sortedFinancials = useMemo(
    () => [...financials].sort((a, b) => b.submittedDate.localeCompare(a.submittedDate)),
    [financials]
  );

  const filteredFinancials = useMemo(() => {
    return sortedFinancials.filter((f) => {
      if (finFilters.quarter !== 'all' && f.quarter !== finFilters.quarter) return false;
      if (finFilters.sector !== 'all') {
        if (borrowerSector.get(f.borrowerId) !== finFilters.sector) return false;
      }
      if (finSearch && !f.borrowerName.toLowerCase().includes(finSearch.toLowerCase())) return false;
      return true;
    });
  }, [sortedFinancials, finFilters, finSearch, borrowerSector]);

  const displayedFin = finShowAll ? filteredFinancials : filteredFinancials.slice(0, 20);

  // Filtered outreach (overdue first)
  const sortedOutreach = useMemo(() => {
    const STATUS_SORT: Record<string, number> = { Overdue: 0, Delivered: 1, Responded: 2 };
    return [...outreach].sort(
      (a, b) => (STATUS_SORT[a.status] ?? 3) - (STATUS_SORT[b.status] ?? 3)
    );
  }, [outreach]);

  const filteredOutreach = useMemo(() => {
    return sortedOutreach.filter((o) => {
      if (outFilters.status !== 'all' && o.status !== outFilters.status) return false;
      if (outFilters.quarter !== 'all' && o.quarter !== outFilters.quarter) return false;
      return true;
    });
  }, [sortedOutreach, outFilters]);

  const displayedOut = outShowAll ? filteredOutreach : filteredOutreach.slice(0, 20);

  // Outreach timeline entries
  const outreachTimeline = useMemo(() => {
    const respondedCount = outreach.filter((o) => o.status === 'Responded').length;
    const deliveredCount = outreach.filter((o) => o.status === 'Delivered').length;
    const base = new Date('2025-10-01T09:00:00Z').getTime();
    return [
      {
        timestamp: new Date(base + 900000).toISOString(),
        agent: 'Outreach Agent',
        action: `Stratos AI Corp: escalated to RM after 3 failed reminders — no financials received`,
      },
      {
        timestamp: new Date(base + 600000).toISOString(),
        agent: 'Outreach Agent',
        action: `${respondedCount} responded, ${deliveredCount} delivered, ${overdueCount} overdue`,
      },
      {
        timestamp: new Date(base).toISOString(),
        agent: 'Outreach Agent',
        action: `${totalOutreach} borrowers contacted for Q3 2025 financial submissions`,
        confidence: 0.96,
      },
    ];
  }, [outreach, overdueCount, totalOutreach]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Document Portal"
        description="Financial submission tracking · outreach & document receipt pipeline"
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
          {/* ── Metric cards ──────────────────────────────────────────── */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <MetricCard
              label="Total submissions"
              value={totalSubmissions.toLocaleString()}
              subtitle="Financial documents received"
            />
            <MetricCard
              label="Q3 2025"
              value={q3Submissions}
              subtitle="This quarter"
            />
            <MetricCard
              label="Avg confidence"
              value={`${Math.round(avgConf * 100)}%`}
              subtitle="Extraction accuracy"
              valueColor={avgConf >= 0.9 ? '#16a34a' : '#d97706'}
            />
            <MetricCard
              label="Overdue"
              value={overdueCount}
              subtitle="No financials received"
              valueColor={overdueCount > 0 ? '#dc2626' : '#16a34a'}
            />
            <MetricCard
              label="Outreach sent"
              value={totalOutreach.toLocaleString()}
              subtitle="Messages dispatched"
            />
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────── */}
          <div
            className="flex gap-0.5 mb-5"
            style={{ borderBottom: '1px solid #e2e8f0' }}
          >
            {(
              [
                { key: 'submissions', label: 'Financial Submissions' },
                { key: 'outreach', label: 'Outreach Activity' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === tab.key ? '#0f172a' : '#94a3b8',
                  borderBottom: `2px solid ${activeTab === tab.key ? '#0f172a' : 'transparent'}`,
                  marginBottom: '-1px',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Financial Submissions tab ─────────────────────────────── */}
          {activeTab === 'submissions' && (
            <>
              {/* Filters + search */}
              <div
                className="rounded-lg overflow-hidden"
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  className="px-4 py-3 flex items-center gap-4 flex-wrap"
                  style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}
                >
                  <FilterBar
                    filters={QUARTER_FILTERS}
                    values={finFilters}
                    onChange={(k, v) => {
                      setFinFilters((p) => ({ ...p, [k]: v }));
                      setFinShowAll(false);
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search borrower…"
                    value={finSearch}
                    onChange={(e) => {
                      setFinSearch(e.target.value);
                      setFinShowAll(false);
                    }}
                    className="text-xs px-3 py-1.5 rounded-md ml-auto"
                    style={{
                      border: '1px solid #e2e8f0',
                      color: '#0f172a',
                      outline: 'none',
                      minWidth: '160px',
                    }}
                  />
                </div>

                {/* Table header */}
                <div
                  className="grid text-[10px] font-semibold uppercase tracking-widest px-4 py-2.5"
                  style={{
                    gridTemplateColumns: '1.6fr 90px 100px 80px 100px 90px',
                    backgroundColor: '#f8fafc',
                    color: '#94a3b8',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <span>Borrower</span>
                  <span>Quarter</span>
                  <span>Submitted</span>
                  <span>Documents</span>
                  <span>Confidence</span>
                  <span>Status</span>
                </div>

                {filteredFinancials.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm" style={{ color: '#94a3b8' }}>
                      No submissions match the selected filters
                    </p>
                  </div>
                ) : (
                  <>
                    {displayedFin.map((fin) => {
                      const isExpanded = expandedFinId === fin.id;
                      const pct = Math.round(fin.extractionConfidence * 100);
                      const confColor = pct >= 90 ? '#22c55e' : pct >= 80 ? '#f59e0b' : '#ef4444';

                      return (
                        <div key={fin.id}>
                          <button
                            onClick={() => setExpandedFinId(isExpanded ? null : fin.id)}
                            className="w-full text-left"
                            style={{ borderBottom: '1px solid #f8fafc' }}
                          >
                            <div
                              className="grid px-4 py-2.5 items-center"
                              style={{
                                gridTemplateColumns: '1.6fr 90px 100px 80px 100px 90px',
                                backgroundColor: isExpanded ? '#f8fafc' : undefined,
                              }}
                            >
                              <div className="flex items-center gap-1.5">
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
                                <Link
                                  href={`/extraction?borrower=${fin.borrowerId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs font-medium hover:underline"
                                  style={{ color: '#0f172a' }}
                                >
                                  {fin.borrowerName}
                                </Link>
                              </div>
                              <span className="text-xs" style={{ color: '#64748b' }}>
                                {fin.quarter}
                              </span>
                              <span className="text-xs" style={{ color: '#64748b' }}>
                                {fmtDate(fin.submittedDate)}
                              </span>
                              <span className="flex items-center gap-1 text-xs" style={{ color: '#64748b' }}>
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                                {fin.documents.length}
                              </span>
                              <div className="flex items-center gap-2 pr-2">
                                <div
                                  className="flex-1 h-1 rounded-full overflow-hidden"
                                  style={{ backgroundColor: '#e2e8f0' }}
                                >
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${pct}%`, backgroundColor: confColor }}
                                  />
                                </div>
                                <span
                                  className="text-[11px] tabular-nums font-medium flex-shrink-0"
                                  style={{ color: confColor }}
                                >
                                  {pct}%
                                </span>
                              </div>
                              <span>
                                <span
                                  className="inline-flex items-center rounded-full text-[11px] font-medium px-2 py-0.5"
                                  style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}
                                >
                                  ✓ {fin.status}
                                </span>
                              </span>
                            </div>
                          </button>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div
                              className="px-6 py-4 border-b"
                              style={{ backgroundColor: '#fafafa', borderColor: '#f1f5f9' }}
                            >
                              <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                {/* Documents */}
                                <div>
                                  <div
                                    className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                                    style={{ color: '#94a3b8' }}
                                  >
                                    Documents received
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    {fin.documents.map((doc, i) => (
                                      <div
                                        key={i}
                                        className="flex items-center gap-2 text-xs"
                                        style={{ color: '#64748b' }}
                                      >
                                        <svg
                                          width="12"
                                          height="12"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="#94a3b8"
                                          strokeWidth="2"
                                        >
                                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                          <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                        {doc}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Extracted metrics */}
                                <div>
                                  <div
                                    className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                                    style={{ color: '#94a3b8' }}
                                  >
                                    Extracted metrics
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    {Object.entries(fin.metrics).map(([key, val]) => (
                                      <div
                                        key={key}
                                        className="flex items-center justify-between text-xs"
                                      >
                                        <span style={{ color: '#64748b' }}>
                                          {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </span>
                                        <span
                                          className="tabular-nums font-medium"
                                          style={{ color: '#0f172a' }}
                                        >
                                          {typeof val === 'number' ? val.toFixed(2) : val}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Agent note */}
                              <div
                                className="mt-4 text-[11px] px-3 py-2 rounded"
                                style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                              >
                                Financials Spotter identified submission from {fin.borrowerName},
                                extracted {fin.documents.length} document{fin.documents.length !== 1 ? 's' : ''}{' '}
                                for {fin.quarter} with {Math.round(fin.extractionConfidence * 100)}% extraction confidence.
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredFinancials.length > 20 && (
                      <div
                        className="px-4 py-3 flex items-center gap-3"
                        style={{ borderTop: '1px solid #f1f5f9' }}
                      >
                        <button
                          onClick={() => setFinShowAll(!finShowAll)}
                          className="text-xs font-medium"
                          style={{ color: '#3b82f6' }}
                        >
                          {finShowAll
                            ? 'Show 20'
                            : `Show all ${filteredFinancials.length} submissions`}
                        </button>
                        <span className="text-[11px]" style={{ color: '#94a3b8' }}>
                          Showing {displayedFin.length} of {filteredFinancials.length}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* ── Outreach Activity tab ─────────────────────────────────── */}
          {activeTab === 'outreach' && (
            <>
              <div
                className="rounded-lg overflow-hidden mb-5"
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                {/* Filters */}
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}
                >
                  <FilterBar
                    filters={OUTREACH_FILTERS}
                    values={outFilters}
                    onChange={(k, v) => {
                      setOutFilters((p) => ({ ...p, [k]: v }));
                      setOutShowAll(false);
                    }}
                  />
                </div>

                {/* Table header */}
                <div
                  className="grid text-[10px] font-semibold uppercase tracking-widest px-4 py-2.5"
                  style={{
                    gridTemplateColumns: '1.4fr 90px 100px 100px 90px 70px 80px',
                    backgroundColor: '#f8fafc',
                    color: '#94a3b8',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <span>Borrower</span>
                  <span>Quarter</span>
                  <span>Sent</span>
                  <span>Deadline</span>
                  <span>Status</span>
                  <span className="text-right">Reminders</span>
                  <span>Escalated</span>
                </div>

                {filteredOutreach.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm" style={{ color: '#94a3b8' }}>
                      No outreach records match the selected filters
                    </p>
                  </div>
                ) : (
                  <>
                    {displayedOut.map((out) => {
                      const sc = STATUS_OUTREACH[out.status] ?? { bg: '#f1f5f9', text: '#64748b' };
                      const isOverdue = out.status === 'Overdue';

                      return (
                        <div
                          key={out.id}
                          className="grid px-4 py-2.5 items-start text-xs"
                          style={{
                            gridTemplateColumns: '1.4fr 90px 100px 100px 90px 70px 80px',
                            borderBottom: '1px solid #f8fafc',
                            backgroundColor: isOverdue ? '#fef2f2' : undefined,
                          }}
                        >
                          <div>
                            <Link
                              href={`/extraction?borrower=${out.borrowerId}`}
                              className="font-medium hover:underline"
                              style={{ color: isOverdue ? '#dc2626' : '#0f172a' }}
                            >
                              {out.borrowerName}
                            </Link>
                            {isOverdue && (
                              <div
                                className="text-[11px] mt-0.5 font-medium"
                                style={{ color: '#dc2626' }}
                              >
                                3 reminders sent · Escalated to RM Oct 16
                              </div>
                            )}
                          </div>
                          <span style={{ color: '#64748b' }}>{out.quarter}</span>
                          <span style={{ color: '#64748b' }}>{fmtDateCompact(out.sentDate)}</span>
                          <span style={{ color: '#64748b' }}>{fmtDateCompact(out.deadline)}</span>
                          <span>
                            <span
                              className="inline-flex items-center rounded-full text-[11px] font-medium px-2 py-0.5"
                              style={{ backgroundColor: sc.bg, color: sc.text }}
                            >
                              {out.status}
                            </span>
                          </span>
                          <span className="text-right tabular-nums" style={{ color: '#64748b' }}>
                            {out.remindersSent}
                          </span>
                          <span>
                            {out.escalatedToRM ? (
                              <span
                                className="text-[11px] font-medium"
                                style={{ color: '#d97706' }}
                              >
                                Escalated to RM
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </span>
                        </div>
                      );
                    })}

                    {filteredOutreach.length > 20 && (
                      <div
                        className="px-4 py-3 flex items-center gap-3"
                        style={{ borderTop: '1px solid #f1f5f9' }}
                      >
                        <button
                          onClick={() => setOutShowAll(!outShowAll)}
                          className="text-xs font-medium"
                          style={{ color: '#3b82f6' }}
                        >
                          {outShowAll
                            ? 'Show 20'
                            : `Show all ${filteredOutreach.length} records`}
                        </button>
                        <span className="text-[11px]" style={{ color: '#94a3b8' }}>
                          Showing {displayedOut.length} of {filteredOutreach.length}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Agent activity */}
              <div
                className="rounded-lg p-5"
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <AgentActivityTimeline
                  entries={outreachTimeline}
                  title="Outreach agent log"
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  valueColor,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  valueColor?: string;
}) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-1"
      style={{
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: '#94a3b8' }}
      >
        {label}
      </div>
      <div
        className="text-2xl font-semibold tabular-nums leading-none"
        style={{ color: valueColor ?? '#0f172a' }}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-[11px]" style={{ color: '#94a3b8' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
