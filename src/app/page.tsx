import Link from 'next/link';
import {
  getDashboardMetrics,
  getAgentFunnelData,
  getBreaches,
  getWatchListHistory,
  getDivisionBreakdown,
} from '@/lib/data';
import MetricCard from '@/components/MetricCard';
import AgentFunnel from '@/components/AgentFunnel';
import BreachList from '@/components/BreachList';
import WatchListDonut from '@/components/WatchListDonut';
import DivisionBreakdown from '@/components/DivisionBreakdown';

export default function DashboardPage() {
  const metrics = getDashboardMetrics();
  const funnel = getAgentFunnelData();
  const allBreaches = getBreaches();
  const activeBreaches = allBreaches.filter(b => b.status !== 'Resolved — Waived');
  const watchHistory = getWatchListHistory()
    .sort((a, b) => new Date(b.changedDate).getTime() - new Date(a.changedDate).getTime());
  const divisionData = getDivisionBreakdown();

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#0f172a' }}>Executive Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Portfolio overview · as of Q3 2025
          </p>
        </div>
        <div
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-medium"
          style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
          Live · All agents operational
        </div>
      </div>

      {/* ── Section 1: Metric Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Total Active Covenants */}
        <MetricCard
          label="Total Active Covenants"
          value={metrics.totalActiveCovenants.toLocaleString()}
          subtitle={`across ${metrics.totalBorrowers} borrowers`}
        />

        {/* Compliance Rate */}
        <MetricCard
          label="Compliance Rate"
          value={`${metrics.complianceRate}%`}
          subtitle={`${metrics.compliantTests.toLocaleString()} of ${metrics.totalTests.toLocaleString()} tests passed`}
          valueColor="#16a34a"
        />

        {/* Active Breaches */}
        <MetricCard
          label="Active Breaches"
          value={metrics.activeBreaches}
          valueColor={metrics.activeBreaches > 0 ? '#dc2626' : '#16a34a'}
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}
            >
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {metrics.hardBreaches} hard
            </span>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#fffbeb', color: '#b45309' }}
            >
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              {metrics.softBreaches} soft
            </span>
          </div>
        </MetricCard>

        {/* Pending Exceptions */}
        <MetricCard
          label="Pending Exceptions"
          value={metrics.pendingExceptions}
          valueColor={metrics.pendingExceptions > 0 ? '#d97706' : '#16a34a'}
          subtitle="Awaiting human review"
        />

        {/* Watch List */}
        <MetricCard
          label="Watch List"
          value={metrics.totalBorrowers}
          subtitle="Borrowers monitored"
        >
          <div className="flex items-center gap-3 mt-1">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}
            >
              {metrics.watchListGreen} Green
            </span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#fffbeb', color: '#d97706' }}
            >
              {metrics.watchListAmber} Amber
            </span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
            >
              {metrics.watchListRed} Red
            </span>
          </div>
        </MetricCard>

        {/* Deals Ingested — clickable → /deals */}
        <Link href="/deals" className="block no-underline">
          <MetricCard
            label="Deals Ingested"
            value={funnel.dealsIngested}
            subtitle="Click to view Deal Sourcing →"
          />
        </Link>
      </div>

      {/* ── Section 2: Agent Funnel ──────────────────────────────────── */}
      <div className="mb-6">
        <AgentFunnel data={funnel} />
      </div>

      {/* ── Section 3: Breach List + Watch List ─────────────────────── */}
      <div className="grid mb-6" style={{ gridTemplateColumns: '3fr 2fr', gap: '1.5rem' }}>
        <BreachList breaches={activeBreaches} />
        <WatchListDonut
          green={metrics.watchListGreen}
          amber={metrics.watchListAmber}
          red={metrics.watchListRed}
          recentHistory={watchHistory}
        />
      </div>

      {/* ── Section 4: Division Breakdown ───────────────────────────── */}
      <div>
        <DivisionBreakdown data={divisionData} />
      </div>
    </div>
  );
}
