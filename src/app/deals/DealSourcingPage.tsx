'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import ConfidenceBar from '@/components/ConfidenceBar';
import AgentActivityTimeline from '@/components/AgentActivityTimeline';
import type { TimelineEntry } from '@/components/AgentActivityTimeline';
import type { DealsPipeline, Deal, Borrower } from '@/lib/types';

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

export default function DealSourcingPage({ pipeline, deals, borrowers }: Props) {
  const [selectedId, setSelectedId] = useState<string>(pipeline[0]?.id ?? '');
  const [isLoading, setIsLoading] = useState(true);

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

  // Stats
  const avgConf = pipeline.reduce((s, p) => s + p.detectionConfidence, 0) / pipeline.length;
  const mostRecent = pipeline.reduce(
    (best, p) => (p.emailDate > best ? p.emailDate : best),
    pipeline[0]?.emailDate ?? ''
  );
  const divisionCounts = deals.reduce<Record<string, number>>((acc, d) => {
    acc[d.division] = (acc[d.division] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Deal Sourcing"
        description="Incoming credit agreement detection · Deal Spotter agent"
      />

      {isLoading ? (
        <div
          className="rounded-lg p-8"
          style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
        >
          <Skeleton />
        </div>
      ) : (
        <>
          {/* ── Two-panel layout ──────────────────────────────────── */}
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
              {/* Inbox header */}
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

              {/* Email cards */}
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
                      {/* From + date */}
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
                      {/* Subject */}
                      <div
                        className="text-xs font-medium mb-1 line-clamp-1"
                        style={{ color: '#0f172a' }}
                      >
                        {item.emailSubject}
                      </div>
                      {/* Snippet */}
                      <div
                        className="text-[11px] mb-2 line-clamp-2 leading-relaxed"
                        style={{ color: '#94a3b8' }}
                      >
                        {item.emailSnippet}
                      </div>
                      {/* Attachment + status */}
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
                  {/* Agent activity card */}
                  <div
                    className="rounded-lg p-5"
                    style={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Header row */}
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

                    {/* Detection confidence */}
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

                  {/* Deal summary card */}
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
                        <Field
                          label="Deal Date"
                          value={fmtDate(selectedDeal.dealDate)}
                        />
                        <Field
                          label="Maturity Date"
                          value={fmtDate(selectedDeal.maturityDate)}
                        />
                        <Field label="Law Firm" value={selectedDeal.lawFirm} />
                        <Field label="Status" value={selectedDeal.status} />
                      </div>
                      <div
                        className="mt-4 pt-4"
                        style={{ borderTop: '1px solid #f1f5f9' }}
                      >
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

          {/* ── Ingestion summary ─────────────────────────────────── */}
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
