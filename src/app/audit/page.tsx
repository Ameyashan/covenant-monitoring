'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAuditLog, getBorrowers } from '@/lib/data';
import type { AuditEntry } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import MetricCard from '@/components/MetricCard';
import RoleBanner from '@/components/RoleBanner';
import { User, ChevronDown, ChevronUp, X } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const KNOWN_AGENTS = [
  'Deal Spotter',
  'Covenant Extractor',
  'Validation Agent A',
  'Validation Agent B',
  'Financials Spotter',
  'Breach Detection Agent',
  'Breach Summary Agent',
  'Outreach Agent',
];

const AGENT_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  'Deal Spotter':           { bg: '#eff6ff', color: '#2563eb', label: 'Deal Spotter' },
  'Covenant Extractor':     { bg: '#f5f3ff', color: '#7c3aed', label: 'Covenant Extractor' },
  'Validation Agent A':     { bg: '#f0fdfa', color: '#0d9488', label: 'Val. Agent A' },
  'Validation Agent B':     { bg: '#ecfdf5', color: '#059669', label: 'Val. Agent B' },
  'Financials Spotter':     { bg: '#eef2ff', color: '#4338ca', label: 'Financials Spotter' },
  'Breach Detection Agent': { bg: '#fef2f2', color: '#dc2626', label: 'Breach Detection' },
  'Breach Summary Agent':   { bg: '#fff1f2', color: '#e11d48', label: 'Breach Summary' },
  'Outreach Agent':         { bg: '#fffbeb', color: '#d97706', label: 'Outreach Agent' },
};

const ENTITY_STYLE: Record<string, { bg: string; color: string }> = {
  Deal:       { bg: '#eff6ff', color: '#2563eb' },
  Covenant:   { bg: '#f5f3ff', color: '#7c3aed' },
  Financial:  { bg: '#eef2ff', color: '#4338ca' },
  Breach:     { bg: '#fef2f2', color: '#dc2626' },
  WatchList:  { bg: '#fffbeb', color: '#d97706' },
  Waiver:     { bg: '#f0fdf4', color: '#16a34a' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAgent(actor: string): boolean {
  return KNOWN_AGENTS.includes(actor);
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function applyDateFilter(entries: AuditEntry[], range: string): AuditEntry[] {
  if (range === 'all') return entries;
  const now = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return entries.filter(e => new Date(e.timestamp) >= cutoff);
}

// ─── Audit Entry Row ─────────────────────────────────────────────────────────

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const agent = isAgent(entry.actor);
  const style = agent ? AGENT_STYLE[entry.actor] : null;
  const entityStyle = ENTITY_STYLE[entry.entityType] ?? { bg: '#f8fafc', color: '#64748b' };
  const conf = entry.confidence !== null ? Math.round(entry.confidence * 100) : null;

  return (
    <div
      className="px-5 py-3.5 border-b transition-colors hover:bg-slate-50/60"
      style={{ borderColor: '#f1f5f9' }}
    >
      <div className="flex items-start gap-4">
        {/* Timestamp */}
        <div className="w-44 flex-shrink-0 text-xs tabular-nums mt-0.5" style={{ color: '#94a3b8' }}>
          {fmtTimestamp(entry.timestamp)}
        </div>

        {/* Actor pill */}
        <div className="w-36 flex-shrink-0">
          {agent && style ? (
            <span
              className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: style.bg, color: style.color }}
            >
              {style.label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#475569' }}>
              <User size={11} className="flex-shrink-0" />
              {entry.actor}
            </span>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm" style={{ color: '#0f172a' }}>{entry.action}</div>

          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
            {/* Entity type */}
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
              style={{ backgroundColor: entityStyle.bg, color: entityStyle.color }}
            >
              {entry.entityType}
            </span>

            {/* Borrower link */}
            <Link
              href={`/portfolio?borrower=${entry.borrowerId}`}
              className="text-xs font-medium hover:underline transition-colors"
              style={{ color: '#2563eb' }}
              onClick={e => e.stopPropagation()}
            >
              {entry.borrowerName}
            </Link>

            {/* Confidence bar (agents only) */}
            {agent && conf !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] tabular-nums" style={{ color: '#64748b' }}>{conf}%</span>
                <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: '#e2e8f0' }}>
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${conf}%`,
                      backgroundColor: conf >= 90 ? '#10b981' : conf >= 80 ? '#f59e0b' : '#f87171',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {entry.notes && (
            <div className="mt-1.5">
              {expanded ? (
                <div className="text-xs" style={{ color: '#64748b' }}>
                  {entry.notes}
                  <button
                    onClick={() => setExpanded(false)}
                    className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium"
                    style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <ChevronUp size={11} /> less
                  </button>
                </div>
              ) : (
                <div className="text-xs flex items-center gap-1" style={{ color: '#64748b' }}>
                  <span className="line-clamp-1 flex-1">
                    {entry.notes.length > 100 ? entry.notes.slice(0, 100) + '…' : entry.notes}
                  </span>
                  {entry.notes.length > 100 && (
                    <button
                      onClick={() => setExpanded(true)}
                      className="inline-flex items-center gap-0.5 text-[11px] font-medium flex-shrink-0"
                      style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <ChevronDown size={11} /> more
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Inner page (needs searchParams) ─────────────────────────────────────────

function AuditPageInner() {
  const searchParams = useSearchParams();
  const borrowerIdParam = searchParams.get('borrower');

  const allAudit = useMemo(() => getAuditLog(), []);
  const borrowers = useMemo(() => getBorrowers(), []);
  const borrowerMap = useMemo(() => {
    const m: Record<string, string> = {};
    borrowers.forEach(b => { m[b.id] = b.name; });
    return m;
  }, [borrowers]);

  const [filters, setFilters] = useState({
    actorType: 'all',
    agent: 'all',
    entityType: 'all',
    dateRange: 'all',
    search: '',
  });
  const [page, setPage] = useState(1);

  // Metrics
  const totalAgentActions = useMemo(() => allAudit.filter(e => isAgent(e.actor)).length, [allAudit]);
  const totalHumanActions = useMemo(() => allAudit.filter(e => !isAgent(e.actor)).length, [allAudit]);
  const entityTypes = useMemo(() => {
    return [...new Set(allAudit.map(e => e.entityType))];
  }, [allAudit]);

  // Agent action breakdown
  const agentBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    allAudit.forEach(e => {
      if (isAgent(e.actor)) counts[e.actor] = (counts[e.actor] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allAudit]);

  const filtered = useMemo(() => {
    let list = borrowerIdParam
      ? allAudit.filter(e => e.borrowerId === borrowerIdParam)
      : allAudit;

    list = applyDateFilter(list, filters.dateRange);

    return list
      .filter(e => {
        if (filters.actorType === 'agent' && !isAgent(e.actor)) return false;
        if (filters.actorType === 'human' && isAgent(e.actor)) return false;
        if (filters.agent !== 'all' && e.actor !== filters.agent) return false;
        if (filters.entityType !== 'all' && e.entityType !== filters.entityType) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const matchAction = e.action.toLowerCase().includes(q);
          const matchBorrower = e.borrowerName.toLowerCase().includes(q);
          const matchNotes = e.notes?.toLowerCase().includes(q) ?? false;
          if (!matchAction && !matchBorrower && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allAudit, filters, borrowerIdParam]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const borrowerName = borrowerIdParam ? borrowerMap[borrowerIdParam] : null;

  function setFilter(key: string, value: string) {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  }

  // Date range of full dataset
  const dates = allAudit.map(e => new Date(e.timestamp).getTime()).sort((a, b) => a - b);
  const dateRangeLabel = dates.length >= 2
    ? `${new Date(dates[0]).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} — ${new Date(dates[dates.length - 1]).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    : '—';

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Audit Trail"
        description="Complete chronological log of all AI agent and human actions"
      />

      <RoleBanner page="audit" />

      {/* Borrower filter banner */}
      {borrowerName && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg mb-5 text-sm"
          style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}
        >
          <span>Showing audit trail for <strong>{borrowerName}</strong></span>
          <Link
            href="/audit"
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: '#2563eb' }}
          >
            <X size={12} /> Clear filter
          </Link>
        </div>
      )}

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <MetricCard label="Total Logged" value={allAudit.length.toLocaleString()} />
        <MetricCard label="Agent Actions" value={totalAgentActions.toLocaleString()} subtitle="AI pipeline">
          <div className="flex flex-col gap-1 mt-1">
            {agentBreakdown.slice(0, 3).map(([actor, count]) => {
              const style = AGENT_STYLE[actor];
              const pct = Math.round((count / totalAgentActions) * 100);
              return (
                <div key={actor} className="flex items-center gap-2 text-[11px]">
                  <span style={{ color: style?.color ?? '#64748b' }} className="font-medium truncate flex-1">{actor.replace(' Agent', '')}</span>
                  <span className="tabular-nums" style={{ color: '#94a3b8' }}>{count}</span>
                  <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#e2e8f0' }}>
                    <div className="h-1 rounded-full" style={{ width: `${pct}%`, backgroundColor: style?.color ?? '#64748b' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </MetricCard>
        <MetricCard label="Human Actions" value={totalHumanActions} subtitle="Waivers, overrides" />
        <MetricCard label="Date Range" value={dateRangeLabel} subtitle="Full history" />
        <MetricCard label="Entity Types" value={entityTypes.length} subtitle="Deal, Covenant, Breach…" />
      </div>

      {/* ── Filter bar ── */}
      <div
        className="rounded-lg px-5 py-4 mb-4"
        style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      >
        <div className="flex flex-wrap items-center gap-5">
          {/* Actor type */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest flex-shrink-0" style={{ color: '#94a3b8' }}>Type</span>
            <div className="flex gap-1">
              {[['all', 'All'], ['agent', 'AI Agents'], ['human', 'Human']].map(([val, label]) => (
                <button key={val} onClick={() => setFilter('actorType', val)}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={{
                    backgroundColor: filters.actorType === val ? '#0f172a' : 'transparent',
                    color: filters.actorType === val ? '#fff' : '#64748b',
                    border: '1px solid',
                    borderColor: filters.actorType === val ? '#0f172a' : '#e2e8f0',
                    cursor: 'pointer',
                    fontWeight: filters.actorType === val ? 500 : 400,
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Agent */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest flex-shrink-0" style={{ color: '#94a3b8' }}>Agent</span>
            <select
              value={filters.agent}
              onChange={e => setFilter('agent', e.target.value)}
              className="text-xs rounded-md px-2 py-1"
              style={{ border: '1px solid #e2e8f0', color: '#374151', backgroundColor: '#fff', cursor: 'pointer' }}
            >
              <option value="all">All agents</option>
              {KNOWN_AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Entity type */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest flex-shrink-0" style={{ color: '#94a3b8' }}>Entity</span>
            <div className="flex gap-1">
              {(['all', 'Deal', 'Covenant', 'Financial', 'Breach', 'WatchList', 'Waiver'] as const).map(val => (
                <button key={val} onClick={() => setFilter('entityType', val)}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={{
                    backgroundColor: filters.entityType === val ? '#0f172a' : 'transparent',
                    color: filters.entityType === val ? '#fff' : '#64748b',
                    border: '1px solid',
                    borderColor: filters.entityType === val ? '#0f172a' : '#e2e8f0',
                    cursor: 'pointer',
                    fontWeight: filters.entityType === val ? 500 : 400,
                  }}>
                  {val === 'all' ? 'All' : val}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest flex-shrink-0" style={{ color: '#94a3b8' }}>Period</span>
            <div className="flex gap-1">
              {[['all', 'All time'], ['90d', 'Last 90d'], ['30d', 'Last 30d'], ['7d', 'Last 7d']].map(([val, label]) => (
                <button key={val} onClick={() => setFilter('dateRange', val)}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={{
                    backgroundColor: filters.dateRange === val ? '#0f172a' : 'transparent',
                    color: filters.dateRange === val ? '#fff' : '#64748b',
                    border: '1px solid',
                    borderColor: filters.dateRange === val ? '#0f172a' : '#e2e8f0',
                    cursor: 'pointer',
                    fontWeight: filters.dateRange === val ? 500 : 400,
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-48">
            <input
              type="text"
              placeholder="Search action, borrower, notes…"
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              className="w-full text-xs rounded-md px-3 py-1.5"
              style={{ border: '1px solid #e2e8f0', color: '#374151', backgroundColor: '#fff' }}
            />
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div
        className="rounded-lg overflow-hidden mb-4"
        style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
          style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #f1f5f9', color: '#94a3b8' }}
        >
          <div className="w-44 flex-shrink-0">Timestamp</div>
          <div className="w-36 flex-shrink-0">Actor</div>
          <div className="flex-1">Action / Entity / Notes</div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-sm font-medium mb-1" style={{ color: '#374151' }}>No entries match these filters</div>
            <button
              onClick={() => { setFilters({ actorType: 'all', agent: 'all', entityType: 'all', dateRange: 'all', search: '' }); setPage(1); }}
              className="text-xs mt-2"
              style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            {visible.map(entry => (
              <AuditRow key={entry.id} entry={entry} />
            ))}

            {/* Result count + load more */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderTop: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}
            >
              <span className="text-xs" style={{ color: '#94a3b8' }}>
                Showing {visible.length.toLocaleString()} of {filtered.length.toLocaleString()} entries
              </span>
              {visible.length < filtered.length && (
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="text-xs px-4 py-1.5 rounded-md font-medium transition-colors"
                  style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Load {Math.min(PAGE_SIZE, filtered.length - visible.length)} more
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page export (Suspense wrapper for useSearchParams) ───────────────────────

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-400">Loading audit trail…</div>}>
      <AuditPageInner />
    </Suspense>
  );
}
