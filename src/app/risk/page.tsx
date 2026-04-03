'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { getBorrowers, getBreachesByBorrowerId, getFinancialsByBorrowerId } from '@/lib/data';
import type { Borrower } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import MetricCard from '@/components/MetricCard';
import RoleBanner from '@/components/RoleBanner';
import { AlertTriangle, ChevronDown, ChevronUp, Plug } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function riskColor(s: string) { return s === 'Critical' ? '#7f1d1d' : s === 'High' ? '#dc2626' : s === 'Medium' ? '#d97706' : '#16a34a'; }
function riskBg(s: string) { return s === 'Critical' || s === 'High' ? '#fef2f2' : s === 'Medium' ? '#fffbeb' : '#f0fdf4'; }
function riskSort(s: string) { return s === 'Critical' ? 0 : s === 'High' ? 1 : s === 'Medium' ? 2 : 3; }

// ─── Data ────────────────────────────────────────────────────────────────────

const _allBorrowers = getBorrowers();

// Identify the 4 tech high-risk borrowers including Stratos AI Corp
const TECH_HIGH_RISK = _allBorrowers.filter(b => b.sector === 'Technology' && b.riskScore === 'High');
const STRATOS_ID = _allBorrowers.find(b => b.name.toLowerCase().includes('stratos'))?.id ?? null;

// ─── Donut chart (SVG, no Tremor dependency) ─────────────────────────────────

function RiskDonut({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const segments = [
    { label: 'Low', count: counts.Low ?? 0, color: '#22c55e' },
    { label: 'Medium', count: counts.Medium ?? 0, color: '#f59e0b' },
    { label: 'High', count: counts.High ?? 0, color: '#dc2626' },
    { label: 'Critical', count: counts.Critical ?? 0, color: '#7f1d1d' },
  ];

  let cumAngle = -90; // start at top
  const cx = 70, cy = 70, r = 55, inner = 32;

  function polarToXY(angleDeg: number, radius: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  const paths = segments.map(seg => {
    if (seg.count === 0) return null;
    const angleDeg = (seg.count / total) * 360;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angleDeg;
    cumAngle = endAngle;

    const start = polarToXY(startAngle, r);
    const end = polarToXY(endAngle, r);
    const innerStart = polarToXY(startAngle, inner);
    const innerEnd = polarToXY(endAngle, inner);
    const large = angleDeg > 180 ? 1 : 0;

    const d = [
      `M ${start.x} ${start.y}`,
      `A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${inner} ${inner} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,
      'Z',
    ].join(' ');

    return <path key={seg.label} d={d} fill={seg.color} stroke="#fff" strokeWidth="2" />;
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {paths}
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#94a3b8">borrowers</text>
      </svg>
      <div className="space-y-2">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span style={{ color: '#374151' }}>{s.label}</span>
            <span className="ml-auto tabular-nums font-semibold" style={{ color: s.count > 0 ? riskColor(s.label) : '#94a3b8' }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Risk row ─────────────────────────────────────────────────────────────────

function RiskRow({ borrower, activeBreaches, hasFinancials }: {
  borrower: Borrower; activeBreaches: number; hasFinancials: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const truncated = borrower.riskExplanation.length > 80;
  const shortText = truncated ? borrower.riskExplanation.slice(0, 80) + '…' : borrower.riskExplanation;

  const isStratos = borrower.id === STRATOS_ID;

  return (
    <div
      className="grid items-start px-5 py-3 border-b transition-colors hover:bg-slate-50"
      style={{
        gridTemplateColumns: '2fr 1fr 0.9fr 0.9fr 0.9fr 2.5fr',
        borderColor: '#f8fafc',
        borderLeft: `3px solid ${riskColor(borrower.riskScore)}`,
        backgroundColor: isStratos ? '#fffbeb' : undefined,
      }}
    >
      {/* Borrower */}
      <div style={{ paddingLeft: '5px' }}>
        <div className="flex items-center gap-2">
          <Link href={`/portfolio?borrower=${borrower.id}`}
            className="text-sm font-medium hover:underline" style={{ color: '#0f172a' }}>
            {borrower.name}
          </Link>
          {isStratos && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1"
              style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              <AlertTriangle size={9} /> NO FINANCIALS
            </span>
          )}
        </div>
        <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
          {borrower.relationshipManager}
        </div>
      </div>

      {/* Sector */}
      <div className="text-xs" style={{ color: '#64748b' }}>{borrower.sector}</div>

      {/* Risk score */}
      <div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: riskBg(borrower.riskScore), color: riskColor(borrower.riskScore) }}>
          {borrower.riskScore}
        </span>
      </div>

      {/* Watch list */}
      <div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: borrower.watchListStatus === 'Red' ? '#fef2f2' : borrower.watchListStatus === 'Amber' ? '#fffbeb' : '#f0fdf4',
            color: borrower.watchListStatus === 'Red' ? '#dc2626' : borrower.watchListStatus === 'Amber' ? '#d97706' : '#16a34a',
          }}>
          {borrower.watchListStatus}
        </span>
      </div>

      {/* Active breaches */}
      <div className="text-sm tabular-nums">
        {activeBreaches > 0
          ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{activeBreaches}</span>
          : <span style={{ color: '#94a3b8' }}>—</span>}
      </div>

      {/* Explanation */}
      <div className="text-xs" style={{ color: '#64748b' }}>
        {expanded ? (
          <>
            {borrower.riskExplanation}
            {truncated && (
              <button onClick={() => setExpanded(false)}
                className="ml-1.5 inline-flex items-center gap-0.5 font-medium"
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                <ChevronUp size={11} /> less
              </button>
            )}
          </>
        ) : (
          <>
            {shortText}
            {truncated && (
              <button onClick={() => setExpanded(true)}
                className="ml-1.5 inline-flex items-center gap-0.5 font-medium"
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                <ChevronDown size={11} /> more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RiskPage() {
  const [sortRisk, setSortRisk] = useState<'all' | 'High' | 'Medium' | 'Low'>('all');
  const [search, setSearch] = useState('');

  const riskCounts = useMemo(() => ({
    Low: _allBorrowers.filter(b => b.riskScore === 'Low').length,
    Medium: _allBorrowers.filter(b => b.riskScore === 'Medium').length,
    High: _allBorrowers.filter(b => b.riskScore === 'High').length,
    Critical: _allBorrowers.filter(b => b.riskScore === 'Critical').length,
  }), []);

  const sectorRiskSummary = useMemo(() => {
    const sectors = ['Technology', 'Healthcare', 'Manufacturing', 'Real Estate', 'Retail'];
    return sectors.map(s => ({
      sector: s,
      highCount: _allBorrowers.filter(b => b.sector === s && (b.riskScore === 'High' || b.riskScore === 'Critical')).length,
    })).filter(s => s.highCount > 0).sort((a, b) => b.highCount - a.highCount);
  }, []);

  const borrowerBreaches = useMemo(() => {
    const m: Record<string, number> = {};
    _allBorrowers.forEach(b => {
      m[b.id] = getBreachesByBorrowerId(b.id).filter(br => br.status !== 'Resolved — Waived').length;
    });
    return m;
  }, []);

  const borrowerFinancials = useMemo(() => {
    const m: Record<string, boolean> = {};
    _allBorrowers.forEach(b => {
      m[b.id] = getFinancialsByBorrowerId(b.id).length > 0;
    });
    return m;
  }, []);

  const filtered = useMemo(() => {
    return _allBorrowers
      .filter(b => {
        if (sortRisk !== 'all' && b.riskScore !== sortRisk) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!b.name.toLowerCase().includes(q) && !b.sector.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => riskSort(a.riskScore) - riskSort(b.riskScore));
  }, [sortRisk, search]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Predictive Risk Scoring"
        description="AI-generated risk signals including predictive flags based on sector trends and peer analysis"
      />

      <RoleBanner page="risk" />

      {/* ── Top section: distribution + metric cards ── */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        {/* Donut */}
        <div className="rounded-lg p-5 col-span-1"
          style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#94a3b8' }}>Risk Distribution</div>
          <RiskDonut counts={riskCounts} />
        </div>

        {/* Right metric cards */}
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <MetricCard label="High / Critical Risk" value={riskCounts.High + riskCounts.Critical} valueColor="#dc2626"
            subtitle={`${(((riskCounts.High + riskCounts.Critical) / _allBorrowers.length) * 100).toFixed(0)}% of portfolio`} />
          <MetricCard label="Medium Risk" value={riskCounts.Medium} valueColor="#d97706"
            subtitle={`${((riskCounts.Medium / _allBorrowers.length) * 100).toFixed(0)}% of portfolio`} />
          <MetricCard label="Low Risk" value={riskCounts.Low} valueColor="#16a34a"
            subtitle="Within covenant comfort zone" />
          <MetricCard label="Elevated Risk Sectors" value={sectorRiskSummary.length}>
            <div className="flex flex-col gap-0.5 mt-1">
              {sectorRiskSummary.map(s => (
                <div key={s.sector} className="flex items-center justify-between text-[11px]">
                  <span style={{ color: '#64748b' }}>{s.sector}</span>
                  <span className="font-semibold" style={{ color: '#dc2626' }}>{s.highCount} high-risk</span>
                </div>
              ))}
            </div>
          </MetricCard>
        </div>
      </div>

      {/* ── Predictive risk insight card ── */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          backgroundColor: '#eff6ff',
          border: '2px solid #93c5fd',
          boxShadow: '0 2px 8px rgba(59,130,246,0.1)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
            style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>
            ★ Predictive Risk Insight
          </div>
        </div>

        <div className="text-base font-semibold mb-2" style={{ color: '#1e3a8a' }}>
          {TECH_HIGH_RISK.length} Technology sector borrowers flagged as HIGH RISK
        </div>

        <p className="text-sm mb-4" style={{ color: '#1e40af' }}>
          <strong>Sector driver:</strong> Revenue pressure in enterprise software — comparable names have recently
          breached interest coverage covenants. Elongated sales cycles reducing near-term cash flow visibility.
        </p>

        {/* Tech high-risk table */}
        <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #bfdbfe' }}>
          <div className="grid text-[11px] font-semibold uppercase tracking-wider px-4 py-2"
            style={{ gridTemplateColumns: '2fr 1fr 2fr', backgroundColor: '#dbeafe', color: '#1e40af' }}>
            <div>Borrower</div>
            <div>Risk</div>
            <div>Status</div>
          </div>
          {TECH_HIGH_RISK.map(b => {
            const isStratos = b.id === STRATOS_ID;
            const hasBreaches = (borrowerBreaches[b.id] ?? 0) > 0;
            return (
              <div key={b.id}
                className="grid items-center px-4 py-2.5 text-sm border-t"
                style={{
                  gridTemplateColumns: '2fr 1fr 2fr',
                  borderColor: '#bfdbfe',
                  backgroundColor: isStratos ? '#fef3c7' : '#fff',
                }}>
                <div className="font-medium" style={{ color: '#0f172a' }}>{b.name}</div>
                <div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>HIGH</span>
                </div>
                <div className="flex items-center gap-2">
                  {isStratos ? (
                    <span className="text-xs font-semibold flex items-center gap-1" style={{ color: '#92400e' }}>
                      <AlertTriangle size={13} />
                      NO FINANCIALS RECEIVED
                    </span>
                  ) : hasBreaches ? (
                    <span className="text-xs" style={{ color: '#dc2626' }}>
                      Soft breach Q3 2025
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: '#64748b' }}>Monitoring</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {STRATOS_ID && (
          <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ color: '#92400e' }}>
                  <strong>Stratos AI Corp</strong> has not submitted Q3 financials despite 3 outreach reminders.
                  Predictive model flags <strong>68% probability of covenant stress</strong> based on peer analysis
                  of comparable enterprise software names.
                </p>
                <p className="mt-2 text-xs" style={{ color: '#b45309' }}>
                  → This is predictive risk scoring: flagging problems <em>before</em> they show up in the numbers.
                  The AI evaluates sector peers, deal structure, and macro conditions to generate early warnings.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Full risk table ── */}
      <div className="rounded-lg overflow-hidden mb-6"
        style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        {/* Table header + filters */}
        <div className="flex items-center justify-between gap-4 px-5 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>All Borrowers — Risk Scores</div>
            <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Click borrower to view full profile</div>
          </div>
          <div className="flex items-center gap-3">
            {/* Risk filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Risk</span>
              <div className="flex gap-1">
                {(['all', 'High', 'Medium', 'Low'] as const).map(val => (
                  <button key={val} onClick={() => setSortRisk(val)}
                    className="text-xs px-2.5 py-1 rounded-full transition-all"
                    style={{
                      backgroundColor: sortRisk === val ? '#0f172a' : 'transparent',
                      color: sortRisk === val ? '#fff' : '#64748b',
                      border: '1px solid', borderColor: sortRisk === val ? '#0f172a' : '#e2e8f0',
                      cursor: 'pointer', fontWeight: sortRisk === val ? 500 : 400,
                    }}>
                    {val === 'all' ? 'All' : val}
                  </button>
                ))}
              </div>
            </div>
            {/* Search */}
            <input type="text" placeholder="Search borrower…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-xs rounded-md px-3 py-1.5 w-40"
              style={{ border: '1px solid #e2e8f0', color: '#374151', backgroundColor: '#fff' }} />
          </div>
        </div>

        {/* Column headers */}
        <div className="grid text-[11px] font-semibold uppercase tracking-wider px-5 py-2.5"
          style={{ gridTemplateColumns: '2fr 1fr 0.9fr 0.9fr 0.9fr 2.5fr', backgroundColor: '#fafafa', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', paddingLeft: '28px' }}>
          <div>Borrower</div>
          <div>Sector</div>
          <div>Risk Score</div>
          <div>Watch List</div>
          <div>Breaches</div>
          <div>Risk Explanation</div>
        </div>

        {filtered.map(b => (
          <RiskRow
            key={b.id}
            borrower={b}
            activeBreaches={borrowerBreaches[b.id] ?? 0}
            hasFinancials={borrowerFinancials[b.id] ?? false}
          />
        ))}

        <div className="px-5 py-3 text-xs" style={{ borderTop: '1px solid #f1f5f9', backgroundColor: '#fafafa', color: '#94a3b8' }}>
          {filtered.length} of {_allBorrowers.length} borrowers shown
        </div>
      </div>

      {/* ── Integration roadmap card ── */}
      <div className="rounded-lg p-5"
        style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div className="flex items-start gap-3">
          <Plug size={18} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div className="text-sm font-semibold mb-2" style={{ color: '#475569' }}>Production Integration Roadmap</div>
            <div className="text-xs mb-3" style={{ color: '#94a3b8' }}>
              In production, risk scores would integrate with additional data sources:
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs" style={{ color: '#64748b' }}>
              {[
                'Bloomberg terminal data feeds',
                'SEC filing analysis (10-K, 10-Q)',
                'Earnings transcript sentiment (NLP)',
                'Credit default swap spreads',
                'Industry peer benchmarking',
                'Macro economic indicators (Fed data)',
              ].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs" style={{ color: '#94a3b8' }}>
              Architecture is pluggable — these are API connection points. Current scores use covenant performance,
              sector trends, and deal structure inputs from the existing data pipeline.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
