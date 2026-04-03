'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getBorrowers, getDeals, getCovenants, getCovenantsByBorrowerId, getCovenantTests,
  getBreachesByBorrowerId, getFinancialsByBorrowerId, getAuditLogByBorrowerId,
} from '@/lib/data';
import type { Borrower } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import MetricCard from '@/components/MetricCard';
import RoleBanner from '@/components/RoleBanner';
import HeadroomGauge from '@/components/HeadroomGauge';
import BreachHistoryTimeline from '@/components/BreachHistoryTimeline';
import { ChevronDown, ChevronUp } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function watchColor(s: string) { return s === 'Red' ? '#dc2626' : s === 'Amber' ? '#d97706' : '#16a34a'; }
function watchBg(s: string) { return s === 'Red' ? '#fef2f2' : s === 'Amber' ? '#fffbeb' : '#f0fdf4'; }
function riskColor(s: string) { return s === 'Critical' ? '#7f1d1d' : s === 'High' ? '#dc2626' : s === 'Medium' ? '#d97706' : '#16a34a'; }
function riskBg(s: string) { return s === 'Critical' || s === 'High' ? '#fef2f2' : s === 'Medium' ? '#fffbeb' : '#f0fdf4'; }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function fmtAmount(amount: number, unit: string) { return unit === '$M' ? (amount >= 1000 ? `$${(amount / 1000).toFixed(1)}B` : `$${amount}M`) : `${amount}${unit}`; }
function watchSort(s: string) { return s === 'Red' ? 0 : s === 'Amber' ? 1 : 2; }
function riskSort(s: string) { return s === 'Critical' ? 0 : s === 'High' ? 1 : s === 'Medium' ? 2 : 3; }

// ─── Module-level data singletons (called once at module load for perf) ───────

const _allBorrowers = getBorrowers();
const _allDeals = getDeals();
const _allCovenants = getCovenants();
const _allTests = getCovenantTests();

// ─── Borrower Profile Tabs ────────────────────────────────────────────────────

const TABS = ['Covenants', 'Headroom', 'Breach History', 'Financials', 'Audit Trail'] as const;
type Tab = typeof TABS[number];

function BorrowerProfile({ borrower }: { borrower: Borrower }) {
  const [tab, setTab] = useState<Tab>('Covenants');

  const deal = useMemo(() => _allDeals.find(d => d.borrowerId === borrower.id), [borrower.id]);
  const covenants = useMemo(() => getCovenantsByBorrowerId(borrower.id), [borrower.id]);
  const financials = useMemo(() => getFinancialsByBorrowerId(borrower.id), [borrower.id]);
  const auditLog = useMemo(() => getAuditLogByBorrowerId(borrower.id), [borrower.id]);

  const latestTests = useMemo(() => {
    const map: Record<string, typeof _allTests[0]> = {};
    _allTests
      .filter(t => t.borrowerId === borrower.id)
      .sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime())
      .forEach(t => { if (!map[t.covenantId]) map[t.covenantId] = t; });
    return Object.values(map);
  }, [borrower.id]);

  return (
    <div className="pt-4 pb-2">
      {/* Profile header */}
      <div className="rounded-lg p-5 mb-4" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: '#94a3b8' }}>Borrower</div>
            <div className="text-base font-semibold" style={{ color: '#0f172a' }}>{borrower.name}</div>
            <div className="text-sm mt-0.5" style={{ color: '#64748b' }}>{borrower.sector} · {borrower.division}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: watchBg(borrower.watchListStatus), color: watchColor(borrower.watchListStatus) }}>
                {borrower.watchListStatus} Watch
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: riskBg(borrower.riskScore), color: riskColor(borrower.riskScore) }}>
                {borrower.riskScore} Risk
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: '#94a3b8' }}>Coverage</div>
            <div className="text-sm space-y-1" style={{ color: '#374151' }}>
              <div><span style={{ color: '#94a3b8' }}>RM: </span>{borrower.relationshipManager}</div>
              <div><span style={{ color: '#94a3b8' }}>Loan Officer: </span>{borrower.loanOfficer}</div>
              <div><span style={{ color: '#94a3b8' }}>Onboarded: </span>{fmtDate(borrower.onboardedDate)}</div>
            </div>
          </div>
          {deal ? (
            <div>
              <div className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: '#94a3b8' }}>Deal</div>
              <div className="text-sm space-y-1" style={{ color: '#374151' }}>
                <div className="font-semibold" style={{ color: '#0f172a' }}>{fmtAmount(deal.amount, deal.amountUnit)} {deal.dealType}</div>
                <div><span style={{ color: '#94a3b8' }}>Originated: </span>{fmtDate(deal.dealDate)}</div>
                <div><span style={{ color: '#94a3b8' }}>Maturity: </span>{fmtDate(deal.maturityDate)}</div>
                <div><span style={{ color: '#94a3b8' }}>Law Firm: </span>{deal.lawFirm}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm" style={{ color: '#94a3b8' }}>No active deal found</div>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-0 border-b mb-4" style={{ borderColor: '#e2e8f0' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="text-xs font-medium px-4 py-2 transition-colors"
            style={{
              color: tab === t ? '#0f172a' : '#64748b',
              borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
              background: 'none', cursor: 'pointer', marginBottom: '-1px',
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-48">

        {/* ── Covenants ── */}
        {tab === 'Covenants' && (
          covenants.length === 0 ? (
            <div className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>No covenants found</div>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
              <div className="grid text-[11px] font-semibold uppercase tracking-wider px-4 py-2.5"
                style={{ gridTemplateColumns: '2fr 0.8fr 0.9fr 1fr 1fr 1.2fr', backgroundColor: '#fafafa', borderBottom: '1px solid #f1f5f9', color: '#94a3b8' }}>
                <div>Covenant</div><div>Type</div><div>Threshold</div><div>Latest</div><div>Status</div><div>Confidence</div>
              </div>
              {covenants.map(cov => {
                const test = latestTests.find(t => t.covenantId === cov.id);
                const passed = test?.passed ?? null;
                return (
                  <div key={cov.id} className="grid items-center px-4 py-3 text-sm border-b"
                    style={{ gridTemplateColumns: '2fr 0.8fr 0.9fr 1fr 1fr 1.2fr', borderColor: '#f8fafc' }}>
                    <div className="font-medium" style={{ color: '#0f172a' }}>{cov.name}</div>
                    <div className="text-xs" style={{ color: '#64748b' }}>{cov.severity}</div>
                    <div className="text-xs tabular-nums" style={{ color: '#374151' }}>{cov.operator === '<=' ? '≤' : '≥'} {cov.threshold}{cov.unit}</div>
                    <div className="text-xs tabular-nums" style={{ color: passed === false ? '#dc2626' : '#374151' }}>
                      {test ? `${Math.round(test.actualValue * 100) / 100}${cov.unit}` : '—'}
                    </div>
                    <div>
                      {passed === null ? <span className="text-xs" style={{ color: '#94a3b8' }}>—</span>
                        : passed ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>Compliant</span>
                          : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>Breach</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {test && (
                        <>
                          <span className="text-[11px] tabular-nums" style={{ color: '#64748b' }}>{Math.round(test.agentConfidence * 100)}%</span>
                          <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: '#e2e8f0' }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.round(test.agentConfidence * 100)}%`, backgroundColor: '#10b981' }} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Headroom ── */}
        {tab === 'Headroom' && (
          latestTests.length === 0 ? (
            <div className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>No test results found</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {latestTests.map(test => (
                <HeadroomGauge key={test.id}
                  covenantName={test.covenantName}
                  operator={test.operator}
                  threshold={test.threshold}
                  unit={test.unit}
                  actualValue={test.actualValue}
                />
              ))}
            </div>
          )
        )}

        {/* ── Breach History ── */}
        {tab === 'Breach History' && (
          <div>
            <BreachHistoryTimeline borrowerId={borrower.id} />
            <div className="mt-4">
              <Link href={`/audit?borrower=${borrower.id}`} className="text-xs font-medium" style={{ color: '#2563eb' }}>
                View full audit trail →
              </Link>
            </div>
          </div>
        )}

        {/* ── Financials ── */}
        {tab === 'Financials' && (
          financials.length === 0 ? (
            <div className="rounded-lg text-sm text-center py-8" style={{ color: '#92400e', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
              ⚠ No financial submissions on record for this borrower
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
              <div className="grid text-[11px] font-semibold uppercase tracking-wider px-4 py-2.5"
                style={{ gridTemplateColumns: '0.7fr 1.3fr 2fr 1fr', backgroundColor: '#fafafa', borderBottom: '1px solid #f1f5f9', color: '#94a3b8' }}>
                <div>Quarter</div><div>Submitted</div><div>Documents</div><div>Confidence</div>
              </div>
              {[...financials].sort((a, b) => b.quarter.localeCompare(a.quarter)).map(fin => (
                <div key={fin.id} className="grid items-center px-4 py-3 text-sm border-b"
                  style={{ gridTemplateColumns: '0.7fr 1.3fr 2fr 1fr', borderColor: '#f8fafc' }}>
                  <div className="font-medium" style={{ color: '#0f172a' }}>{fin.quarter}</div>
                  <div className="text-xs" style={{ color: '#64748b' }}>{fmtDate(fin.submittedDate)}</div>
                  <div className="text-xs" style={{ color: '#64748b' }}>{fin.documents.join(', ')}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] tabular-nums" style={{ color: '#64748b' }}>{Math.round(fin.extractionConfidence * 100)}%</span>
                    <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: '#e2e8f0' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.round(fin.extractionConfidence * 100)}%`, backgroundColor: '#10b981' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Audit Trail ── */}
        {tab === 'Audit Trail' && (
          <div>
            {auditLog.length === 0 ? (
              <div className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>No audit entries found</div>
            ) : (
              <div className="space-y-2">
                {[...auditLog]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 20)
                  .map(entry => (
                    <div key={entry.id} className="flex items-start gap-3 text-xs py-1">
                      <span className="tabular-nums flex-shrink-0" style={{ color: '#94a3b8', width: '140px' }}>
                        {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="font-medium flex-shrink-0" style={{ color: '#374151', width: '140px' }}>{entry.actor}</span>
                      <span style={{ color: '#64748b' }}>{entry.action}</span>
                    </div>
                  ))}
                <div className="pt-3 mt-1" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <Link href={`/audit?borrower=${borrower.id}`} className="text-xs font-medium" style={{ color: '#2563eb' }}>
                    View full audit trail ({auditLog.length} entries) →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Portfolio Table Row ──────────────────────────────────────────────────────

function PortfolioRow({
  borrower, covenantCount, complianceRate, breachCount, isExpanded, onToggle,
}: {
  borrower: Borrower; covenantCount: number; complianceRate: number;
  breachCount: number; isExpanded: boolean; onToggle: () => void;
}) {
  const compColor = complianceRate >= 95 ? '#16a34a' : complianceRate >= 80 ? '#d97706' : '#dc2626';
  const compBg = complianceRate >= 95 ? '#f0fdf4' : complianceRate >= 80 ? '#fffbeb' : '#fef2f2';

  return (
    <>
      <div
        className="grid items-center px-5 py-3 cursor-pointer transition-colors hover:bg-slate-50"
        style={{
          gridTemplateColumns: '2.5fr 1fr 1.3fr 0.9fr 0.9fr 0.9fr 0.9fr 0.9fr 1.6fr',
          borderBottom: isExpanded ? 'none' : '1px solid #f8fafc',
          backgroundColor: isExpanded ? '#f8fafc' : undefined,
          borderLeft: `3px solid ${watchColor(borrower.watchListStatus)}`,
        }}
        onClick={onToggle}
      >
        <div style={{ paddingLeft: '5px' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{borrower.name}</span>
            {isExpanded ? <ChevronUp size={13} style={{ color: '#94a3b8' }} /> : <ChevronDown size={13} style={{ color: '#94a3b8' }} />}
          </div>
        </div>
        <div className="text-xs" style={{ color: '#64748b' }}>{borrower.sector}</div>
        <div className="text-xs" style={{ color: '#64748b' }}>{borrower.division.replace('Investment Banking', 'Inv. Banking').replace(' Management', ' Mgmt')}</div>
        <div className="text-sm tabular-nums" style={{ color: '#374151' }}>{covenantCount}</div>
        <div>
          <span className="text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded"
            style={{ backgroundColor: compBg, color: compColor }}>
            {complianceRate.toFixed(0)}%
          </span>
        </div>
        <div>
          {breachCount > 0
            ? <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>{breachCount} active</span>
            : <span className="text-xs" style={{ color: '#94a3b8' }}>—</span>}
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: watchBg(borrower.watchListStatus), color: watchColor(borrower.watchListStatus) }}>
          {borrower.watchListStatus}
        </span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: riskBg(borrower.riskScore), color: riskColor(borrower.riskScore) }}>
          {borrower.riskScore}
        </span>
        <div className="text-xs" style={{ color: '#94a3b8' }}>{borrower.relationshipManager}</div>
      </div>

      {isExpanded && (
        <div className="px-5"
          style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderLeft: `3px solid ${watchColor(borrower.watchListStatus)}` }}>
          <BorrowerProfile borrower={borrower} />
        </div>
      )}
    </>
  );
}

// ─── Inner page ───────────────────────────────────────────────────────────────

function PortfolioPageInner() {
  const searchParams = useSearchParams();
  const borrowerParam = searchParams.get('borrower');
  const watchListParam = searchParams.get('watchList');

  const [expandedId, setExpandedId] = useState<string | null>(borrowerParam);
  const [filters, setFilters] = useState({
    sector: 'all', division: 'all',
    watchList: watchListParam ?? 'all',
    risk: 'all', breach: 'all', search: '',
  });

  function setFilter(key: string, value: string) {
    setFilters(f => ({ ...f, [key]: value }));
  }

  const borrowerMetrics = useMemo(() => {
    const map: Record<string, { covenantCount: number; complianceRate: number; breachCount: number }> = {};
    _allBorrowers.forEach(b => {
      const bCovenants = _allCovenants.filter(c => c.borrowerId === b.id);
      const bTests = _allTests.filter(t => t.borrowerId === b.id);
      const bBreaches = getBreachesByBorrowerId(b.id).filter(br => br.status !== 'Resolved — Waived');
      const passed = bTests.filter(t => t.passed).length;
      map[b.id] = {
        covenantCount: bCovenants.length,
        complianceRate: bTests.length > 0 ? (passed / bTests.length) * 100 : 100,
        breachCount: bBreaches.length,
      };
    });
    return map;
  }, []);

  const totalExposure = useMemo(() => _allDeals.reduce((sum, d) => sum + (d.amountUnit === '$M' ? d.amount : 0), 0), []);
  const avgCompliance = useMemo(() => {
    const rates = Object.values(borrowerMetrics).map(m => m.complianceRate);
    return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 100;
  }, [borrowerMetrics]);

  const watchCounts = useMemo(() => ({
    Green: _allBorrowers.filter(b => b.watchListStatus === 'Green').length,
    Amber: _allBorrowers.filter(b => b.watchListStatus === 'Amber').length,
    Red: _allBorrowers.filter(b => b.watchListStatus === 'Red').length,
  }), []);

  const riskCounts = useMemo(() => ({
    Low: _allBorrowers.filter(b => b.riskScore === 'Low').length,
    Medium: _allBorrowers.filter(b => b.riskScore === 'Medium').length,
    High: _allBorrowers.filter(b => b.riskScore === 'High').length,
  }), []);

  const filtered = useMemo(() => {
    return _allBorrowers
      .filter(b => {
        if (filters.sector !== 'all' && b.sector !== filters.sector) return false;
        if (filters.division !== 'all' && b.division !== filters.division) return false;
        if (filters.watchList !== 'all' && b.watchListStatus !== filters.watchList) return false;
        if (filters.risk !== 'all' && b.riskScore !== filters.risk) return false;
        if (filters.breach === 'active' && (borrowerMetrics[b.id]?.breachCount ?? 0) === 0) return false;
        if (filters.breach === 'none' && (borrowerMetrics[b.id]?.breachCount ?? 0) > 0) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          if (!b.name.toLowerCase().includes(q) && !b.relationshipManager.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const w = watchSort(a.watchListStatus) - watchSort(b.watchListStatus);
        return w !== 0 ? w : riskSort(a.riskScore) - riskSort(b.riskScore);
      });
  }, [filters, borrowerMetrics]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Portfolio"
        description={`${_allBorrowers.length} borrowers across 5 sectors and 4 divisions`}
        actions={
          <Link href="/stress-test" className="text-xs px-3 py-1.5 rounded-md font-medium"
            style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
            Run stress test →
          </Link>
        }
      />

      <RoleBanner page="portfolio" />

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <MetricCard label="Total Borrowers" value={_allBorrowers.length} />
        <MetricCard label="Total Exposure"
          value={totalExposure >= 1000 ? `$${(totalExposure / 1000).toFixed(1)}B` : `$${totalExposure}M`}
          subtitle="Active deals" />
        <MetricCard label="Avg Compliance" value={`${avgCompliance.toFixed(1)}%`}
          valueColor={avgCompliance >= 95 ? '#16a34a' : avgCompliance >= 80 ? '#d97706' : '#dc2626'} />
        <MetricCard label="Watch List" value="">
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {(['Green', 'Amber', 'Red'] as const).map(w => (
              <span key={w} className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: watchBg(w), color: watchColor(w) }}>
                {w} {watchCounts[w]}
              </span>
            ))}
          </div>
        </MetricCard>
        <MetricCard label="Risk Distribution" value="">
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs" style={{ color: '#16a34a' }}>Low {riskCounts.Low}</span>
            <span className="text-xs" style={{ color: '#d97706' }}>Med {riskCounts.Medium}</span>
            <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>High {riskCounts.High}</span>
          </div>
        </MetricCard>
      </div>

      {/* ── Filters ── */}
      <div className="rounded-lg px-5 py-4 mb-4"
        style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div className="flex flex-wrap items-center gap-5">

          {/* Sector toggles */}
          {[
            { key: 'sector', label: 'Sector', opts: ['all', 'Technology', 'Healthcare', 'Manufacturing', 'Real Estate', 'Retail'] },
            { key: 'watchList', label: 'Watch', opts: ['all', 'Green', 'Amber', 'Red'] },
            { key: 'risk', label: 'Risk', opts: ['all', 'Low', 'Medium', 'High'] },
            { key: 'breach', label: 'Breach', opts: ['all', 'active', 'none'] },
          ].map(({ key, label, opts }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>{label}</span>
              <div className="flex gap-1">
                {opts.map(val => (
                  <button key={val} onClick={() => setFilter(key, val)}
                    className="text-xs px-2.5 py-1 rounded-full transition-all capitalize"
                    style={{
                      backgroundColor: (filters as Record<string, string>)[key] === val ? '#0f172a' : 'transparent',
                      color: (filters as Record<string, string>)[key] === val ? '#fff' : '#64748b',
                      border: '1px solid',
                      borderColor: (filters as Record<string, string>)[key] === val ? '#0f172a' : '#e2e8f0',
                      cursor: 'pointer',
                      fontWeight: (filters as Record<string, string>)[key] === val ? 500 : 400,
                    }}>
                    {val === 'all' ? 'All' : val}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex-1 min-w-40">
            <input type="text" placeholder="Search borrower or RM…"
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              className="w-full text-xs rounded-md px-3 py-1.5"
              style={{ border: '1px solid #e2e8f0', color: '#374151', backgroundColor: '#fff' }} />
          </div>
        </div>
      </div>

      {/* ── Portfolio table ── */}
      <div className="rounded-lg overflow-hidden"
        style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div className="grid text-[11px] font-semibold uppercase tracking-wider px-5 py-3"
          style={{
            gridTemplateColumns: '2.5fr 1fr 1.3fr 0.9fr 0.9fr 0.9fr 0.9fr 0.9fr 1.6fr',
            backgroundColor: '#fafafa', borderBottom: '1px solid #f1f5f9', color: '#94a3b8',
            paddingLeft: '28px',
          }}>
          <div>Borrower</div>
          <div>Sector</div>
          <div>Division</div>
          <div>Covenants</div>
          <div>Compliance</div>
          <div>Breaches</div>
          <div>Watch</div>
          <div>Risk</div>
          <div>RM</div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-sm font-medium" style={{ color: '#374151' }}>No borrowers match these filters</div>
            <button onClick={() => setFilters({ sector: 'all', division: 'all', watchList: 'all', risk: 'all', breach: 'all', search: '' })}
              className="text-xs mt-2" style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear filters
            </button>
          </div>
        ) : (
          filtered.map(borrower => {
            const m = borrowerMetrics[borrower.id] ?? { covenantCount: 0, complianceRate: 100, breachCount: 0 };
            return (
              <PortfolioRow
                key={borrower.id}
                borrower={borrower}
                covenantCount={m.covenantCount}
                complianceRate={m.complianceRate}
                breachCount={m.breachCount}
                isExpanded={expandedId === borrower.id}
                onToggle={() => setExpandedId(expandedId === borrower.id ? null : borrower.id)}
              />
            );
          })
        )}

        <div className="px-5 py-3 text-xs" style={{ borderTop: '1px solid #f1f5f9', backgroundColor: '#fafafa', color: '#94a3b8' }}>
          {filtered.length} of {_allBorrowers.length} borrowers shown
        </div>
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-400">Loading portfolio…</div>}>
      <PortfolioPageInner />
    </Suspense>
  );
}
