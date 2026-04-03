'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { getBreaches, getBorrowers } from '@/lib/data';
import type { Breach } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import MetricCard from '@/components/MetricCard';
import FilterBar from '@/components/FilterBar';
import SeverityBadge from '@/components/SeverityBadge';
import BreachValueDisplay from '@/components/BreachValueDisplay';
import BreachReasoningPanel from '@/components/BreachReasoningPanel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortOrder(b: Breach): number {
  if (b.status === 'Breach — Pending Review') return 0;
  if (b.status === 'Breach — Confirmed' && b.severity === 'Hard') return 1;
  if (b.status === 'Breach — Confirmed' && b.severity === 'Soft') return 2;
  return 3;
}

function rowBorderColor(breach: Breach): string {
  if (breach.status === 'Resolved — Waived') return '#86efac';
  if (breach.status === 'Breach — Pending Review') return '#f59e0b';
  if (breach.severity === 'Hard') return '#dc2626';
  return '#f59e0b';
}

function statusChip(breach: Breach) {
  if (breach.status === 'Resolved — Waived') return { text: 'Waived', bg: '#f0fdf4', color: '#16a34a' };
  if (breach.status === 'Breach — Pending Review') return { text: 'Pending', bg: '#fff7ed', color: '#c2410c' };
  return { text: 'Confirmed', bg: '#fef2f2', color: '#b91c1c' };
}

// ─── Trend chart ─────────────────────────────────────────────────────────────

const TREND_DATA = [
  { quarter: 'Q4 2024', Hard: 2, Soft: 4 },
  { quarter: 'Q1 2025', Hard: 3, Soft: 5 },
  { quarter: 'Q2 2025', Hard: 6, Soft: 2 },
  { quarter: 'Q3 2025', Hard: 6, Soft: 12 },
];
const TREND_MAX = Math.max(...TREND_DATA.map(d => d.Hard + d.Soft));

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BreachesPage() {
  const allBreaches = useMemo(() => getBreaches(), []);
  const borrowers = useMemo(() => getBorrowers(), []);

  const sectorByBorrowerId = useMemo(() => {
    const map: Record<string, string> = {};
    borrowers.forEach(b => { map[b.id] = b.sector; });
    return map;
  }, [borrowers]);

  const [filters, setFilters] = useState({ status: 'all', severity: 'all', sector: 'all' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Aggregate metrics
  const active = allBreaches.filter(b => b.status !== 'Resolved — Waived');
  const hard = allBreaches.filter(b => b.severity === 'Hard');
  const soft = allBreaches.filter(b => b.severity === 'Soft');
  const pending = allBreaches.filter(b => b.status === 'Breach — Pending Review');
  const resolved = allBreaches.filter(b => b.status === 'Resolved — Waived');
  const sectorsAffected = new Set(allBreaches.map(b => sectorByBorrowerId[b.borrowerId]).filter(Boolean));

  // Filtered + sorted list
  const filtered = useMemo(() => {
    return allBreaches
      .filter(b => {
        if (filters.status === 'confirmed' && b.status !== 'Breach — Confirmed') return false;
        if (filters.status === 'pending' && b.status !== 'Breach — Pending Review') return false;
        if (filters.status === 'resolved' && b.status !== 'Resolved — Waived') return false;
        if (filters.severity === 'hard' && b.severity !== 'Hard') return false;
        if (filters.severity === 'soft' && b.severity !== 'Soft') return false;
        if (filters.sector !== 'all' && sectorByBorrowerId[b.borrowerId] !== filters.sector) return false;
        return true;
      })
      .sort((a, b) => {
        const ord = sortOrder(a) - sortOrder(b);
        if (ord !== 0) return ord;
        return new Date(b.detectedDate).getTime() - new Date(a.detectedDate).getTime();
      });
  }, [allBreaches, filters, sectorByBorrowerId]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Breach Detection"
        description="All covenant breaches detected by the Breach Detection Agent"
      />

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <MetricCard label="Active Breaches" value={active.length} valueColor="#dc2626" />
        <MetricCard label="Hard Covenant" value={hard.length}>
          <span className="inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>Hard</span>
        </MetricCard>
        <MetricCard label="Soft Covenant" value={soft.length}>
          <span className="inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>Soft</span>
        </MetricCard>
        <MetricCard label="Pending Review" value={pending.length} valueColor="#b45309">
          <div className="flex items-center gap-1 text-[11px]" style={{ color: '#94a3b8' }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-dot inline-block" style={{ backgroundColor: '#f59e0b' }} />
            Needs human review
          </div>
        </MetricCard>
        <MetricCard label="Resolved (Waived)" value={resolved.length} valueColor="#16a34a" />
        <MetricCard label="Sectors Affected" value={`${sectorsAffected.size} of 5`} />
      </div>

      {/* ── Filters ── */}
      <div className="mb-4">
        <FilterBar
          filters={[
            {
              key: 'status', label: 'Status',
              options: [
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending Review' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'resolved', label: 'Resolved' },
              ],
            },
            {
              key: 'severity', label: 'Severity',
              options: [
                { value: 'all', label: 'All' },
                { value: 'hard', label: 'Hard' },
                { value: 'soft', label: 'Soft' },
              ],
            },
            {
              key: 'sector', label: 'Sector',
              options: [
                { value: 'all', label: 'All' },
                { value: 'Technology', label: 'Technology' },
                { value: 'Healthcare', label: 'Healthcare' },
                { value: 'Manufacturing', label: 'Manufacturing' },
                { value: 'Real Estate', label: 'Real Estate' },
                { value: 'Retail', label: 'Retail' },
              ],
            },
          ]}
          values={filters}
          onChange={(key, val) => { setFilters(f => ({ ...f, [key]: val })); setExpandedId(null); }}
        />
      </div>

      {/* ── Breach table ── */}
      <div className="rounded-lg overflow-hidden mb-6"
        style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-sm font-medium mb-1" style={{ color: '#374151' }}>No breaches match these filters</div>
            <button
              onClick={() => setFilters({ status: 'all', severity: 'all', sector: 'all' })}
              className="text-xs mt-2" style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid text-[11px] font-semibold uppercase tracking-wider px-5 py-3"
              style={{
                color: '#94a3b8', borderBottom: '1px solid #f1f5f9',
                gridTemplateColumns: '2.2fr 1.4fr 1.6fr 0.7fr 0.8fr 0.65fr 1fr',
                backgroundColor: '#fafafa',
              }}>
              <div style={{ paddingLeft: '8px' }}>Borrower</div>
              <div>Covenant</div>
              <div>Actual vs Threshold</div>
              <div>Severity</div>
              <div>Confidence</div>
              <div>Quarter</div>
              <div>Actions</div>
            </div>

            {/* Rows */}
            {filtered.map(breach => {
              const isExpanded = expandedId === breach.id;
              const borderColor = rowBorderColor(breach);
              const chip = statusChip(breach);
              const conf = Math.round(breach.agentConfidence * 100);

              return (
                <div key={breach.id}>
                  <div
                    className="grid items-center px-5 py-3 cursor-pointer transition-colors hover:bg-slate-50"
                    style={{
                      gridTemplateColumns: '2.2fr 1.4fr 1.6fr 0.7fr 0.8fr 0.65fr 1fr',
                      borderLeft: `3px solid ${borderColor}`,
                      borderBottom: isExpanded ? 'none' : '1px solid #f8fafc',
                      backgroundColor: isExpanded ? '#fafafa' : undefined,
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : breach.id)}
                  >
                    {/* Borrower */}
                    <div style={{ paddingLeft: '5px' }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: '#0f172a' }}>
                          {breach.borrowerName}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: chip.bg, color: chip.color }}>
                          {chip.text}
                        </span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                        {sectorByBorrowerId[breach.borrowerId] ?? '—'}
                      </div>
                    </div>

                    {/* Covenant */}
                    <div className="text-sm" style={{ color: '#374151' }}>
                      {breach.covenantName}
                    </div>

                    {/* Actual vs Threshold */}
                    <BreachValueDisplay
                      actual={breach.actualValue}
                      operator={breach.operator}
                      threshold={breach.threshold}
                      unit={breach.unit}
                      size="sm"
                    />

                    {/* Severity */}
                    <SeverityBadge severity={breach.severity} />

                    {/* Confidence */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs tabular-nums font-medium" style={{ color: '#374151' }}>{conf}%</span>
                      <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#e2e8f0' }}>
                        <div className="h-1 rounded-full" style={{
                          width: `${conf}%`,
                          backgroundColor: conf >= 90 ? '#10b981' : conf >= 80 ? '#f59e0b' : '#f87171',
                        }} />
                      </div>
                    </div>

                    {/* Quarter */}
                    <div className="text-xs" style={{ color: '#64748b' }}>{breach.quarter}</div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <Link href={`/breach-summary?breach=${breach.id}`}
                        className="text-xs px-2 py-1 rounded whitespace-nowrap"
                        style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                        View
                      </Link>
                      {breach.status === 'Breach — Confirmed' && (
                        <Link href={`/waivers?breach=${breach.id}`}
                          className="text-xs px-2 py-1 rounded whitespace-nowrap"
                          style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                          Waiver
                        </Link>
                      )}
                      {breach.status === 'Breach — Pending Review' && (
                        <Link href="/exceptions"
                          className="text-xs px-2 py-1 rounded whitespace-nowrap"
                          style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                          Review
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Expanded reasoning panel */}
                  {isExpanded && (
                    <div className="px-5 py-4"
                      style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0', borderLeft: `3px solid ${borderColor}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                          Agent Reasoning
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/breach-summary?breach=${breach.id}`}
                            className="text-xs px-3 py-1.5 rounded-md font-medium"
                            style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                            View full summary →
                          </Link>
                          {breach.status === 'Breach — Confirmed' && (
                            <Link href={`/waivers?breach=${breach.id}`}
                              className="text-xs px-3 py-1.5 rounded-md font-medium"
                              style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                              Grant waiver →
                            </Link>
                          )}
                        </div>
                      </div>
                      <BreachReasoningPanel breach={breach} />
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ── Breach trend chart ── */}
      <div className="rounded-lg p-5"
        style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>Breach Trend</div>
            <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Breach count by quarter, stacked by severity</div>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: '#64748b' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#dc2626' }} />Hard
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />Soft
            </div>
          </div>
        </div>
        <div className="flex items-end gap-5 h-36">
          {TREND_DATA.map(d => {
            const total = d.Hard + d.Soft;
            const hardH = TREND_MAX > 0 ? Math.round((d.Hard / TREND_MAX) * 96) : 0;
            const softH = TREND_MAX > 0 ? Math.round((d.Soft / TREND_MAX) * 96) : 0;
            return (
              <div key={d.quarter} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs tabular-nums font-semibold" style={{ color: '#475569' }}>{total}</div>
                <div className="w-full flex flex-col justify-end overflow-hidden rounded-t-sm" style={{ height: '100px' }}>
                  <div style={{ height: `${softH}px`, backgroundColor: '#fbbf24' }} />
                  <div style={{ height: `${hardH}px`, backgroundColor: '#dc2626' }} />
                </div>
                <div className="text-[11px]" style={{ color: '#94a3b8' }}>{d.quarter}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
