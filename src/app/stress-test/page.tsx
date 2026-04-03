'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getCovenantTests, getBorrowers } from '@/lib/data';
import type { CovenantTest } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import MetricCard from '@/components/MetricCard';
import RoleBanner from '@/components/RoleBanner';
import { RotateCcw } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

// Metrics affected by EBITDA shock
const EBITDA_DENOMINATOR_METRICS = new Set(['debtToEBITDA', 'leverageRatio']);
const EBITDA_NUMERATOR_METRICS = new Set(['interestCoverageRatio', 'fixedChargeCoverage']);
const EBITDA_ABSOLUTE_METRICS = new Set(['ebitda']);
// Metrics affected by interest rate change
const RATE_SENSITIVE_METRICS = new Set(['interestCoverageRatio', 'fixedChargeCoverage']);
// Metrics affected by revenue change
const REVENUE_METRICS = new Set(['revenueGrowthYoY']);

const SECTORS = ['Technology', 'Healthcare', 'Manufacturing', 'Real Estate', 'Retail'] as const;

// ─── Data singletons ──────────────────────────────────────────────────────────

const _allTests = getCovenantTests();
const _borrowers = getBorrowers();

// Latest test per covenant (Q3 2025 preferred, then most recent)
const _latestTests: CovenantTest[] = (() => {
  // Prefer Q3 2025, fall back to most recent per covenant
  const q3Map: Record<string, CovenantTest> = {};
  const latestMap: Record<string, CovenantTest> = {};

  _allTests
    .sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime())
    .forEach(t => {
      if (t.quarter === 'Q3 2025' && !q3Map[t.covenantId]) q3Map[t.covenantId] = t;
      if (!latestMap[t.covenantId]) latestMap[t.covenantId] = t;
    });

  // Merge: prefer Q3 2025, fall back to latest
  const merged: Record<string, CovenantTest> = { ...latestMap, ...q3Map };
  return Object.values(merged);
})();

const _borrowerSectorMap = (() => {
  const m: Record<string, string> = {};
  _borrowers.forEach(b => { m[b.id] = b.sector; });
  return m;
})();

const _borrowerNameMap = (() => {
  const m: Record<string, string> = {};
  _borrowers.forEach(b => { m[b.id] = b.name; });
  return m;
})();

// Baseline breach count (from latest tests)
const BASELINE_BREACHES = _latestTests.filter(t => !t.passed).length;

// ─── Stress calculation ───────────────────────────────────────────────────────

interface StressParams {
  ebitdaShock: number;    // -0.30 to +0.10 (fraction)
  rateChangeBps: number;  // -100 to +300
  revenueChange: number;  // -0.20 to +0.10 (fraction)
}

interface StressedTest {
  test: CovenantTest;
  stressedValue: number;
  stressedPassed: boolean;
  isNewBreach: boolean;
  headroomEroded: number;
}

function applyStress(test: CovenantTest, params: StressParams): StressedTest {
  const { ebitdaShock, rateChangeBps, revenueChange } = params;
  let stressed = test.actualValue;

  // Apply EBITDA shock
  if (ebitdaShock !== 0) {
    if (EBITDA_DENOMINATOR_METRICS.has(test.metric)) {
      stressed = stressed / (1 + ebitdaShock);
    } else if (EBITDA_NUMERATOR_METRICS.has(test.metric)) {
      stressed = stressed * (1 + ebitdaShock);
    } else if (EBITDA_ABSOLUTE_METRICS.has(test.metric)) {
      stressed = stressed * (1 + ebitdaShock);
    }
  }

  // Apply interest rate change
  if (rateChangeBps !== 0 && RATE_SENSITIVE_METRICS.has(test.metric)) {
    stressed = stressed * (1 - (rateChangeBps / 100) * 0.10);
  }

  // Apply revenue change (additive in % points)
  if (revenueChange !== 0 && REVENUE_METRICS.has(test.metric)) {
    stressed = stressed + revenueChange * 100; // convert fraction to % points
  }

  // Test stressed value against threshold
  const stressedPassed = test.operator === '<='
    ? stressed <= test.threshold
    : stressed >= test.threshold;

  // Is this a NEW breach (was passing before, failing now)?
  const isNewBreach = test.passed && !stressedPassed;

  // Compute headroom erosion
  const baseHeadroom = test.operator === '>='
    ? (test.actualValue - test.threshold) / Math.abs(test.threshold)
    : (test.threshold - test.actualValue) / Math.abs(test.threshold);
  const stressedHeadroom = test.operator === '>='
    ? (stressed - test.threshold) / Math.abs(test.threshold)
    : (test.threshold - stressed) / Math.abs(test.threshold);
  const headroomEroded = baseHeadroom - stressedHeadroom;

  return { test, stressedValue: stressed, stressedPassed, isNewBreach, headroomEroded };
}

function computeStressResults(params: StressParams): StressedTest[] {
  return _latestTests.map(t => applyStress(t, params));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtVal(value: number, unit: string): string {
  const r = Math.round(value * 100) / 100;
  if (unit === '$M') return `$${r}M`;
  if (unit === '%') return `${r.toFixed(1)}%`;
  return `${r}x`;
}

function pct(n: number): string { return `${n.toFixed(1)}%`; }

// ─── Animated number ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const duration = 300;
    const start = performance.now();
    function step(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    prevRef.current = to;
  }, [value]);

  return <span className={className} style={style}>{display}</span>;
}

// ─── Slider component ─────────────────────────────────────────────────────────

function StressSlider({
  label, value, min, max, step, format, onChange, color,
}: {
  label: string; value: number; min: number; max: number;
  step: number; format: (v: number) => string;
  onChange: (v: number) => void; color: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium" style={{ color: '#0f172a' }}>{label}</div>
        <div
          className="text-2xl font-semibold tabular-nums"
          style={{ color: value < 0 ? '#dc2626' : value > 0 ? '#16a34a' : '#64748b' }}
        >
          {format(value)}
        </div>
      </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`,
            outline: 'none',
          }}
        />
      </div>

      <div className="flex items-center justify-between mt-1 text-[11px]" style={{ color: '#94a3b8' }}>
        <span>{format(min)}</span>
        <span>0 (baseline)</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StressTestPage() {
  const [ebitdaShock, setEbitdaShock] = useState(0);
  const [rateChangeBps, setRateChangeBps] = useState(0);
  const [revenueChange, setRevenueChange] = useState(0);

  // Debounce slider inputs
  const [debouncedParams, setDebouncedParams] = useState<StressParams>({ ebitdaShock: 0, rateChangeBps: 0, revenueChange: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback((params: StressParams) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedParams(params), 50);
  }, []);

  function handleEbitda(v: number) {
    setEbitdaShock(v);
    updateParams({ ebitdaShock: v / 100, rateChangeBps, revenueChange: revenueChange / 100 });
  }
  function handleRate(v: number) {
    setRateChangeBps(v);
    updateParams({ ebitdaShock: ebitdaShock / 100, rateChangeBps: v, revenueChange: revenueChange / 100 });
  }
  function handleRevenue(v: number) {
    setRevenueChange(v);
    updateParams({ ebitdaShock: ebitdaShock / 100, rateChangeBps, revenueChange: v / 100 });
  }
  function resetAll() {
    setEbitdaShock(0);
    setRateChangeBps(0);
    setRevenueChange(0);
    setDebouncedParams({ ebitdaShock: 0, rateChangeBps: 0, revenueChange: 0 });
  }

  const isBaseline = debouncedParams.ebitdaShock === 0 && debouncedParams.rateChangeBps === 0 && debouncedParams.revenueChange === 0;

  // Compute stressed results
  const stressedResults = useMemo(() => computeStressResults(debouncedParams), [debouncedParams]);

  const stressedBreachCount = useMemo(() => stressedResults.filter(r => !r.stressedPassed).length, [stressedResults]);
  const newBreaches = useMemo(() => stressedResults.filter(r => r.isNewBreach), [stressedResults]);
  const borrowersAffected = useMemo(() => new Set(newBreaches.map(r => r.test.borrowerId)).size, [newBreaches]);

  const totalTests = _latestTests.length;
  const baselineCompliance = ((totalTests - BASELINE_BREACHES) / totalTests * 100);
  const stressedCompliance = ((totalTests - stressedBreachCount) / totalTests * 100);

  // Sector impact data
  const sectorData = useMemo(() => {
    return SECTORS.map(sector => {
      const sectorTests = stressedResults.filter(r => _borrowerSectorMap[r.test.borrowerId] === sector);
      const baseline = sectorTests.filter(r => !r.test.passed).length;
      const stressed = sectorTests.filter(r => !r.stressedPassed).length;
      return { sector, baseline, stressed, newBreaches: stressed - baseline };
    });
  }, [stressedResults]);

  const sectorMax = Math.max(...sectorData.map(d => d.stressed), 1);

  // Newly breaching borrowers table (sorted by headroom eroded)
  const newBreachRows = useMemo(() => {
    return newBreaches
      .sort((a, b) => b.headroomEroded - a.headroomEroded)
      .slice(0, 20);
  }, [newBreaches]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Stress Testing"
        description="Scenario analysis — adjust macro variables and see portfolio impact in real time"
        actions={
          !isBaseline && (
            <button onClick={resetAll}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
              style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
              <RotateCcw size={13} /> Reset to baseline
            </button>
          )
        }
      />

      <RoleBanner page="stress-test" />

      {/* ── Sliders ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StressSlider
          label="EBITDA Decline"
          value={ebitdaShock}
          min={-30} max={10} step={1}
          format={v => v === 0 ? '0%' : v > 0 ? `+${v}%` : `${v}%`}
          onChange={handleEbitda}
          color="#dc2626"
        />
        <StressSlider
          label="Interest Rate Shift"
          value={rateChangeBps}
          min={-100} max={300} step={25}
          format={v => v === 0 ? '0 bps' : v > 0 ? `+${v} bps` : `${v} bps`}
          onChange={handleRate}
          color="#f59e0b"
        />
        <StressSlider
          label="Revenue Adjustment"
          value={revenueChange}
          min={-20} max={10} step={1}
          format={v => v === 0 ? '0%' : v > 0 ? `+${v}%` : `${v}%`}
          onChange={handleRevenue}
          color="#8b5cf6"
        />
      </div>

      {/* ── Impact summary ── */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <MetricCard label="Baseline Breaches" value={BASELINE_BREACHES} subtitle="Before stress" />
        <MetricCard
          label="Stressed Breaches"
          value={stressedBreachCount}
          valueColor={stressedBreachCount > BASELINE_BREACHES ? '#dc2626' : '#374151'}
          subtitle={isBaseline ? 'Same as baseline' : undefined}
        >
          {!isBaseline && (
            <AnimatedNumber
              value={stressedBreachCount}
              className="text-3xl font-semibold tabular-nums"
              style={{ color: stressedBreachCount > BASELINE_BREACHES ? '#dc2626' : '#374151' }}
            />
          )}
        </MetricCard>
        <MetricCard
          label="New Breaches"
          value={isBaseline ? '—' : `+${newBreaches.length}`}
          valueColor={newBreaches.length > 0 ? '#dc2626' : '#374151'}
          subtitle={isBaseline ? 'Apply stress to see impact' : `${newBreaches.length} new failures`}
        />
        <MetricCard
          label="Borrowers Affected"
          value={isBaseline ? '—' : borrowersAffected}
          valueColor={borrowersAffected > 0 ? '#d97706' : '#374151'}
          subtitle={isBaseline ? undefined : 'with ≥1 new breach'}
        />
        <MetricCard
          label="Compliance Rate"
          value={`${baselineCompliance.toFixed(1)}%`}
          subtitle={!isBaseline ? `→ ${stressedCompliance.toFixed(1)}% stressed` : 'Baseline'}
          valueColor="#374151"
        />
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* ── Sector impact chart ── */}
        <div className="rounded-lg p-5"
          style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>Sector Impact</div>
              <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Baseline vs stressed breaches by sector</div>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: '#64748b' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#e2e8f0' }} /> Baseline
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#dc2626' }} /> Stressed
              </div>
            </div>
          </div>
          <div className="flex items-end gap-6 h-40">
            {sectorData.map(d => {
              const baseH = sectorMax > 0 ? Math.round((d.baseline / sectorMax) * 120) : 0;
              const stressH = sectorMax > 0 ? Math.round((d.stressed / sectorMax) * 120) : 0;
              return (
                <div key={d.sector} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[11px] tabular-nums font-semibold" style={{ color: '#475569' }}>
                    {d.stressed > d.baseline ? <span style={{ color: '#dc2626' }}>+{d.newBreaches}</span> : d.stressed}
                  </div>
                  <div className="w-full flex flex-col items-stretch justify-end gap-0.5" style={{ height: '120px' }}>
                    <div className="flex items-end gap-1 h-full">
                      {/* Baseline bar */}
                      <div className="flex-1 flex flex-col justify-end">
                        <div style={{ height: `${baseH}px`, backgroundColor: '#e2e8f0', borderRadius: '2px 2px 0 0', transition: 'height 0.3s ease' }} />
                      </div>
                      {/* Stressed bar */}
                      <div className="flex-1 flex flex-col justify-end">
                        <div style={{ height: `${stressH}px`, backgroundColor: '#dc2626', borderRadius: '2px 2px 0 0', transition: 'height 0.3s ease', opacity: isBaseline ? 0.3 : 1 }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-center" style={{ color: '#94a3b8' }}>
                    {d.sector.replace(' ', '\u00A0')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── How the math works ── */}
        <div className="rounded-lg p-5"
          style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div className="text-sm font-semibold mb-3" style={{ color: '#0f172a' }}>Stress Model</div>
          <div className="space-y-3 text-xs" style={{ color: '#64748b' }}>
            <div>
              <div className="font-semibold text-[11px] uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>EBITDA Shock</div>
              <div>Affects: Debt/EBITDA, Leverage Ratio, Interest Coverage, Fixed Charge Coverage, EBITDA absolute</div>
              <div className="mt-1 font-mono text-[11px] rounded px-2 py-1" style={{ backgroundColor: '#f8fafc', color: '#475569' }}>
                Leverage ratios: actual × 1/(1 + shock)<br/>
                Coverage ratios: actual × (1 + shock)
              </div>
            </div>
            <div>
              <div className="font-semibold text-[11px] uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Interest Rate Change</div>
              <div>Affects: Interest Coverage Ratio, Fixed Charge Coverage</div>
              <div className="mt-1 font-mono text-[11px] rounded px-2 py-1" style={{ backgroundColor: '#f8fafc', color: '#475569' }}>
                actual × (1 − bps/100 × 0.10)
              </div>
            </div>
            <div>
              <div className="font-semibold text-[11px] uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Revenue Change</div>
              <div>Affects: Revenue Growth YoY (additive in % points)</div>
              <div className="mt-1 font-mono text-[11px] rounded px-2 py-1" style={{ backgroundColor: '#f8fafc', color: '#475569' }}>
                actual + revenue_adjustment
              </div>
            </div>
            <div className="pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
              <span style={{ color: '#94a3b8' }}>Recalculating </span>
              <span className="font-semibold" style={{ color: '#374151' }}>{_latestTests.length}</span>
              <span style={{ color: '#94a3b8' }}> covenant tests across </span>
              <span className="font-semibold" style={{ color: '#374151' }}>{_borrowers.length}</span>
              <span style={{ color: '#94a3b8' }}> borrowers in real time.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Newly breaching borrowers ── */}
      {!isBaseline && (
        <div className="rounded-lg overflow-hidden"
          style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>
              Newly Breaching Borrowers
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
              {newBreachRows.length === 0
                ? 'No new breaches under current stress scenario'
                : `${newBreaches.length} covenant${newBreaches.length !== 1 ? 's' : ''} would newly breach — sorted by largest headroom erosion`}
            </div>
          </div>

          {newBreachRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-2xl mb-2">✓</div>
              <div className="text-sm font-medium" style={{ color: '#374151' }}>No new breaches under this scenario</div>
              <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                Try increasing the stress levels with the sliders above
              </div>
            </div>
          ) : (
            <>
              <div className="grid text-[11px] font-semibold uppercase tracking-wider px-5 py-2.5"
                style={{ gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr 1fr 1.2fr', backgroundColor: '#fafafa', borderBottom: '1px solid #f1f5f9', color: '#94a3b8' }}>
                <div>Borrower</div>
                <div>Sector</div>
                <div>Covenant</div>
                <div>Current</div>
                <div>Stressed</div>
                <div>Threshold</div>
                <div>Headroom Eroded</div>
              </div>

              {newBreachRows.map((r, i) => {
                const borrowerName = _borrowerNameMap[r.test.borrowerId] ?? r.test.borrowerId;
                const sector = _borrowerSectorMap[r.test.borrowerId] ?? '—';
                const erodedPct = Math.round(r.headroomEroded * 1000) / 10;

                return (
                  <div key={i} className="grid items-center px-5 py-3 border-b text-sm hover:bg-slate-50"
                    style={{ gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr 1fr 1.2fr', borderColor: '#f8fafc', borderLeft: '3px solid #dc2626' }}>
                    <div>
                      <Link href={`/portfolio?borrower=${r.test.borrowerId}`}
                        className="font-medium hover:underline" style={{ color: '#0f172a' }}>
                        {borrowerName}
                      </Link>
                    </div>
                    <div className="text-xs" style={{ color: '#64748b' }}>{sector}</div>
                    <div className="text-xs" style={{ color: '#374151' }}>{r.test.covenantName}</div>
                    <div className="text-xs tabular-nums" style={{ color: '#374151' }}>
                      {fmtVal(r.test.actualValue, r.test.unit)}
                    </div>
                    <div className="text-xs tabular-nums font-semibold" style={{ color: '#dc2626' }}>
                      {fmtVal(r.stressedValue, r.test.unit)}
                    </div>
                    <div className="text-xs tabular-nums" style={{ color: '#64748b' }}>
                      {r.test.operator === '<=' ? '≤' : '≥'} {fmtVal(r.test.threshold, r.test.unit)}
                    </div>
                    <div className="text-xs font-semibold tabular-nums" style={{ color: '#dc2626' }}>
                      −{pct(erodedPct)}
                    </div>
                  </div>
                );
              })}

              {newBreaches.length > 20 && (
                <div className="px-5 py-3 text-xs" style={{ color: '#94a3b8', borderTop: '1px solid #f1f5f9' }}>
                  Showing top 20 of {newBreaches.length} newly breaching covenants
                </div>
              )}
            </>
          )}
        </div>
      )}

      {isBaseline && (
        <div className="rounded-lg p-8 text-center"
          style={{ backgroundColor: '#fff', border: '1px dashed #e2e8f0' }}>
          <div className="text-sm font-medium mb-1" style={{ color: '#374151' }}>No stress applied</div>
          <div className="text-xs" style={{ color: '#94a3b8' }}>
            Adjust the sliders above to model portfolio impact under different macro scenarios
          </div>
        </div>
      )}
    </div>
  );
}
