'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import SeverityBadge from '@/components/SeverityBadge';
import FilterBar from '@/components/FilterBar';
import type { Covenant, Borrower } from '@/lib/types';

interface Props {
  covenants: Covenant[];
  borrowers: Borrower[];
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  'Auto-Validated': { bg: '#f0fdf4', text: '#16a34a', label: 'Auto-Validated' },
  'Flagged — Reviewed': { bg: '#fffbeb', text: '#d97706', label: 'Flagged — Reviewed' },
  'Escalated to Human': { bg: '#fef2f2', text: '#dc2626', label: 'Escalated to Human' },
};

const AGENT_STATUS_CONFIG: Record<string, { text: string }> = {
  Approved: { text: '#16a34a' },
  Flagged: { text: '#dc2626' },
};

function confBucket(v: number): string {
  if (v >= 0.9) return '90–100%';
  if (v >= 0.8) return '80–90%';
  if (v >= 0.7) return '70–80%';
  return '60–70%';
}

const BUCKET_ORDER = ['60–70%', '70–80%', '80–90%', '90–100%'];
const BUCKET_COLOR: Record<string, string> = {
  '60–70%': '#ef4444',
  '70–80%': '#f59e0b',
  '80–90%': '#f59e0b',
  '90–100%': '#22c55e',
};

const STATUS_SORT: Record<string, number> = {
  'Escalated to Human': 0,
  'Flagged — Reviewed': 1,
  'Auto-Validated': 2,
};

const FILTERS = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'all', label: 'All' },
      { value: 'Auto-Validated', label: 'Auto-Validated' },
      { value: 'Flagged — Reviewed', label: 'Flagged' },
      { value: 'Escalated to Human', label: 'Escalated' },
    ],
  },
  {
    key: 'sector',
    label: 'Sector',
    options: [
      { value: 'all', label: 'All' },
      { value: 'Technology', label: 'Technology' },
      { value: 'Healthcare', label: 'Healthcare' },
      { value: 'Manufacturing', label: 'Manufacturing' },
      { value: 'Real Estate', label: 'Real Estate' },
      { value: 'Retail', label: 'Retail' },
    ],
  },
  {
    key: 'confidence',
    label: 'Confidence',
    options: [
      { value: 'all', label: 'All' },
      { value: 'high', label: '>90%' },
      { value: 'medium', label: '80–90%' },
      { value: 'low', label: '<80%' },
    ],
  },
];

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 p-6">
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-12 rounded" style={{ backgroundColor: '#f1f5f9' }} />
      ))}
    </div>
  );
}

export default function ValidationPageContent({ covenants, borrowers }: Props) {
  const [filters, setFilters] = useState({ status: 'all', sector: 'all', confidence: 'all' });
  const [showAll, setShowAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  // Build borrower sector lookup
  const borrowerSector = useMemo(() => {
    const map = new Map<string, string>();
    borrowers.forEach((b) => map.set(b.id, b.sector));
    return map;
  }, [borrowers]);

  // Funnel counts (real data)
  const total = covenants.length;
  const autoValidated = covenants.filter((c) => c.validationStatus === 'Auto-Validated').length;
  const flagged = covenants.filter((c) => c.validationStatus === 'Flagged — Reviewed').length;
  const escalated = covenants.filter((c) => c.validationStatus === 'Escalated to Human').length;

  // Agent matrix
  const aaApproved = covenants.filter(
    (c) => c.validationAgentA === 'Approved' && c.validationAgentB === 'Approved'
  ).length;
  const aFlagB = covenants.filter(
    (c) => c.validationAgentA === 'Approved' && c.validationAgentB === 'Flagged'
  ).length;
  const aFlagBApproved = covenants.filter(
    (c) => c.validationAgentA === 'Flagged' && c.validationAgentB === 'Approved'
  ).length;
  const bothFlagged = covenants.filter(
    (c) => c.validationAgentA === 'Flagged' && c.validationAgentB === 'Flagged'
  ).length;

  // Confidence distribution
  const buckets = useMemo(() => {
    const counts: Record<string, number> = {
      '60–70%': 0,
      '70–80%': 0,
      '80–90%': 0,
      '90–100%': 0,
    };
    covenants.forEach((c) => {
      const b = confBucket(c.overallConfidence);
      counts[b] = (counts[b] ?? 0) + 1;
    });
    return counts;
  }, [covenants]);
  const maxBucketCount = Math.max(...Object.values(buckets), 1);

  // Filtered + sorted table
  const filteredCovenants = useMemo(() => {
    let result = covenants.filter((c) => {
      if (filters.status !== 'all' && c.validationStatus !== filters.status) return false;
      if (filters.sector !== 'all') {
        const sector = borrowerSector.get(c.borrowerId);
        if (sector !== filters.sector) return false;
      }
      if (filters.confidence === 'high' && c.overallConfidence < 0.9) return false;
      if (filters.confidence === 'medium' && (c.overallConfidence < 0.8 || c.overallConfidence >= 0.9)) return false;
      if (filters.confidence === 'low' && c.overallConfidence >= 0.8) return false;
      return true;
    });
    result = [...result].sort(
      (a, b) => STATUS_SORT[a.validationStatus] - STATUS_SORT[b.validationStatus]
    );
    return result;
  }, [covenants, filters, borrowerSector]);

  const displayed = showAll ? filteredCovenants : filteredCovenants.slice(0, 20);

  const handleFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setShowAll(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Validation Funnel"
        description="Dual-agent validation pipeline across all borrowers · autonomous vs. human review"
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
          {/* ── Hero: Funnel visualization ──────────────────────────── */}
          <div
            className="rounded-lg p-6 mb-6"
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-2xl font-semibold tabular-nums" style={{ color: '#0f172a' }}>
                {total}
              </span>
              <span className="text-sm" style={{ color: '#64748b' }}>
                covenants extracted · validation pipeline
              </span>
            </div>

            {/* Segmented bar */}
            <div
              className="flex rounded-full overflow-hidden mb-4"
              style={{ height: '14px', gap: '2px', backgroundColor: '#f1f5f9' }}
            >
              <div
                style={{
                  width: `${(autoValidated / total) * 100}%`,
                  backgroundColor: '#22c55e',
                  transition: 'width 0.5s ease',
                }}
              />
              <div
                style={{
                  width: `${(flagged / total) * 100}%`,
                  backgroundColor: '#f59e0b',
                  transition: 'width 0.5s ease',
                }}
              />
              <div
                style={{
                  width: `${(escalated / total) * 100}%`,
                  backgroundColor: '#ef4444',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>

            {/* Legend rows */}
            <div className="flex flex-col gap-4">
              <FunnelRow
                color="#22c55e"
                bgColor="#f0fdf4"
                label="Auto-Validated"
                count={autoValidated}
                total={total}
                detail="Both agents approved — fully autonomous"
              />
              <FunnelRow
                color="#f59e0b"
                bgColor="#fffbeb"
                label="Flagged — Reviewed"
                count={flagged}
                total={total}
                detail="One or both agents flagged — resolved after human review"
              />
              <FunnelRow
                color="#ef4444"
                bgColor="#fef2f2"
                label="Escalated to Human"
                count={escalated}
                total={total}
                detail="Routed to Exception Queue for human resolution"
              />
            </div>

            {/* Autonomy rate callout */}
            <div
              className="mt-5 px-4 py-3 rounded-lg flex items-center gap-3"
              style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <span className="text-xl font-bold tabular-nums" style={{ color: '#16a34a' }}>
                {Math.round((autoValidated / total) * 100)}%
              </span>
              <div>
                <div className="text-sm font-medium" style={{ color: '#15803d' }}>
                  Fully autonomous — no human review required
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#16a34a' }}>
                  {autoValidated} of {total} covenants validated end-to-end by the AI pipeline
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom row: Table + matrix + histogram ──────────────── */}
          <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '1fr 240px' }}>
            {/* Left: Table */}
            <div
              className="rounded-lg overflow-hidden"
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
                <FilterBar filters={FILTERS} values={filters} onChange={handleFilter} />
              </div>

              {/* Table header */}
              <div
                className="grid text-[10px] font-semibold uppercase tracking-widest px-4 py-2.5"
                style={{
                  gridTemplateColumns: '1.4fr 1fr 80px 80px 80px 80px',
                  backgroundColor: '#f8fafc',
                  color: '#94a3b8',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <span>Borrower · Covenant</span>
                <span>Confidence</span>
                <span>Agent A</span>
                <span>Agent B</span>
                <span>Agreement</span>
                <span>Status</span>
              </div>

              {filteredCovenants.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm" style={{ color: '#94a3b8' }}>
                    No covenants match the selected filters
                  </p>
                </div>
              ) : (
                <>
                  {displayed.map((cov) => {
                    const vc = STATUS_CONFIG[cov.validationStatus];
                    const pct = Math.round(cov.overallConfidence * 100);
                    const confColor =
                      pct >= 90 ? '#22c55e' : pct >= 80 ? '#f59e0b' : '#ef4444';
                    const agree = cov.validationAgentA === cov.validationAgentB;

                    return (
                      <Link
                        key={cov.id}
                        href={`/extraction?borrower=${cov.borrowerId}`}
                        className="block"
                      >
                        <div
                          className="grid px-4 py-2.5 items-center transition-colors"
                          style={{
                            gridTemplateColumns: '1.4fr 1fr 80px 80px 80px 80px',
                            borderBottom: '1px solid #f8fafc',
                          }}
                        >
                          <div>
                            <div className="text-xs font-medium" style={{ color: '#0f172a' }}>
                              {cov.borrowerName}
                            </div>
                            <div className="text-[11px]" style={{ color: '#94a3b8' }}>
                              {cov.name}
                            </div>
                          </div>
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
                          <span
                            className="text-xs font-medium"
                            style={{ color: AGENT_STATUS_CONFIG[cov.validationAgentA]?.text }}
                          >
                            {cov.validationAgentA}
                          </span>
                          <span
                            className="text-xs font-medium"
                            style={{ color: AGENT_STATUS_CONFIG[cov.validationAgentB]?.text }}
                          >
                            {cov.validationAgentB}
                          </span>
                          <span
                            className="text-[11px] font-medium"
                            style={{ color: agree ? '#16a34a' : '#dc2626' }}
                          >
                            {agree ? '✓ Agree' : '✗ Disagree'}
                          </span>
                          <span>
                            <span
                              className="inline-flex items-center rounded-full text-[11px] font-medium px-2 py-0.5"
                              style={{ backgroundColor: vc?.bg, color: vc?.text }}
                            >
                              {vc?.label}
                            </span>
                          </span>
                        </div>
                      </Link>
                    );
                  })}

                  {filteredCovenants.length > 20 && (
                    <div
                      className="px-4 py-3 flex items-center gap-3"
                      style={{ borderTop: '1px solid #f1f5f9' }}
                    >
                      <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-xs font-medium"
                        style={{ color: '#3b82f6' }}
                      >
                        {showAll
                          ? 'Show 20'
                          : `Show all ${filteredCovenants.length} covenants`}
                      </button>
                      <span className="text-[11px]" style={{ color: '#94a3b8' }}>
                        Showing {displayed.length} of {filteredCovenants.length}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right column: matrix + histogram */}
            <div className="flex flex-col gap-4">
              {/* Agent agreement matrix */}
              <div
                className="rounded-lg p-4"
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
                  Agent Agreement Matrix
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <MatrixCell
                    label="A ✓ · B ✓"
                    count={aaApproved}
                    bg="#f0fdf4"
                    text="#16a34a"
                  />
                  <MatrixCell
                    label="A ✓ · B ✗"
                    count={aFlagB}
                    bg="#fffbeb"
                    text="#d97706"
                  />
                  <MatrixCell
                    label="A ✗ · B ✓"
                    count={aFlagBApproved}
                    bg="#fffbeb"
                    text="#d97706"
                  />
                  <MatrixCell
                    label="A ✗ · B ✗"
                    count={bothFlagged}
                    bg="#fef2f2"
                    text="#dc2626"
                  />
                </div>
              </div>

              {/* Confidence histogram */}
              <div
                className="rounded-lg p-4 flex-1"
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
                  Confidence Distribution
                </div>
                <div className="flex flex-col gap-3">
                  {BUCKET_ORDER.map((bucket) => {
                    const count = buckets[bucket] ?? 0;
                    const barWidth = (count / maxBucketCount) * 100;
                    const color = BUCKET_COLOR[bucket];
                    return (
                      <div key={bucket}>
                        <div
                          className="flex items-center justify-between mb-1"
                          style={{ fontSize: '11px', color: '#64748b' }}
                        >
                          <span>{bucket}</span>
                          <span className="tabular-nums font-medium">{count}</span>
                        </div>
                        <div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: '#f1f5f9' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${barWidth}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FunnelRow({
  color,
  bgColor,
  label,
  count,
  total,
  detail,
}: {
  color: string;
  bgColor: string;
  label: string;
  count: number;
  total: number;
  detail: string;
}) {
  const pct = Math.round((count / total) * 100);
  const barWidth = (count / total) * 100;
  return (
    <div className="flex items-center gap-4">
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1.5">
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color, minWidth: '28px' }}
          >
            {pct}%
          </span>
          <span className="text-sm font-medium" style={{ color: '#0f172a' }}>
            {count.toLocaleString()}
          </span>
          <span
            className="inline-flex items-center rounded-full text-[11px] font-medium px-2 py-0.5"
            style={{ backgroundColor: bgColor, color }}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 rounded-full"
            style={{ width: `${barWidth}%`, backgroundColor: color, opacity: 0.6 }}
          />
          <span className="text-[11px]" style={{ color: '#94a3b8' }}>
            {detail}
          </span>
        </div>
      </div>
    </div>
  );
}

function MatrixCell({
  label,
  count,
  bg,
  text,
}: {
  label: string;
  count: number;
  bg: string;
  text: string;
}) {
  return (
    <div
      className="rounded-lg p-2.5 text-center"
      style={{ backgroundColor: bg }}
    >
      <div className="text-lg font-bold tabular-nums" style={{ color: text }}>
        {count}
      </div>
      <div className="text-[10px] font-medium mt-0.5" style={{ color: text, opacity: 0.8 }}>
        {label}
      </div>
    </div>
  );
}
