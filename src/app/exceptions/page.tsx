'use client';

import { useState, useMemo } from 'react';
import { getExceptions } from '@/lib/data';
import PageHeader from '@/components/PageHeader';
import MetricCard from '@/components/MetricCard';
import FilterBar from '@/components/FilterBar';
import ExceptionCard, { type ExceptionResolution } from '@/components/ExceptionCard';

export default function ExceptionsPage() {
  const allExceptions = useMemo(() => getExceptions(), []);

  const [filters, setFilters] = useState({ type: 'all', priority: 'all', status: 'pending' });
  const [resolutions, setResolutions] = useState<Record<string, ExceptionResolution>>({});

  // Metrics (from raw data — not affected by filter)
  const pending = allExceptions.filter(e => !resolutions[e.id]);
  const high = allExceptions.filter(e => e.priority === 'High');
  const medium = allExceptions.filter(e => e.priority === 'Medium');
  const creditRisk = allExceptions.filter(e => e.routedTo === 'Credit Risk / Loan Officer');
  const operations = allExceptions.filter(e => e.routedTo === 'Operations Analyst');

  // Filtered list
  const filtered = useMemo(() => {
    return allExceptions
      .filter(e => {
        const typeFilter = filters.type;
        if (typeFilter === 'Uncertain Breach' && e.type !== 'Uncertain Breach Calculation') return false;
        if (typeFilter !== 'all' && typeFilter !== 'Uncertain Breach' && e.type !== typeFilter) return false;
        if (filters.priority !== 'all' && e.priority !== filters.priority) return false;
        if (filters.status === 'pending' && resolutions[e.id]) return false;
        if (filters.status === 'resolved' && !resolutions[e.id]) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === 'High' ? -1 : 1;
        return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
      });
  }, [allExceptions, filters, resolutions]);

  function handleResolve(id: string, resolution: ExceptionResolution) {
    setResolutions(r => ({ ...r, [id]: resolution }));
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Exception Queue"
        description="Items that AI agents couldn't resolve with sufficient confidence — pending human review"
      />

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <MetricCard label="Pending Items" value={pending.length} valueColor="#b45309">
          <div className="flex items-center gap-1 text-[11px]" style={{ color: '#94a3b8' }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-dot inline-block" style={{ backgroundColor: '#f59e0b' }} />
            Requires attention
          </div>
        </MetricCard>
        <MetricCard label="High Priority" value={high.length} valueColor="#dc2626" />
        <MetricCard label="Medium Priority" value={medium.length} valueColor="#b45309" />
        <MetricCard label="Routed to Credit Risk" value={creditRisk.length} />
        <MetricCard label="Routed to Operations" value={operations.length} subtitle="~3 days avg in queue" />
      </div>

      {/* ── Filters ── */}
      <div className="mb-5">
        <FilterBar
          filters={[
            {
              key: 'type', label: 'Type',
              options: [
                { value: 'all', label: 'All' },
                { value: 'Low-Confidence Extraction', label: 'Low-Confidence' },
                { value: 'Dual-Agent Disagreement', label: 'Agent Disagreement' },
                { value: 'Uncertain Breach', label: 'Uncertain Breach' },
              ],
            },
            {
              key: 'priority', label: 'Priority',
              options: [
                { value: 'all', label: 'All' },
                { value: 'High', label: 'High' },
                { value: 'Medium', label: 'Medium' },
              ],
            },
            {
              key: 'status', label: 'Status',
              options: [
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'resolved', label: 'Resolved' },
              ],
            },
          ]}
          values={filters}
          onChange={(key, val) => setFilters(f => ({ ...f, [key]: val }))}
        />
      </div>

      {/* ── Exception cards ── */}
      {filtered.length === 0 ? (
        <div className="rounded-lg flex flex-col items-center justify-center py-16"
          style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
          <div className="text-sm font-medium mb-1" style={{ color: '#374151' }}>
            {filters.status === 'resolved' && Object.keys(resolutions).length === 0
              ? 'No exceptions resolved yet — take action on cards above'
              : 'No exceptions match these filters'}
          </div>
          <button
            onClick={() => setFilters({ type: 'all', priority: 'all', status: 'pending' })}
            className="text-xs mt-2" style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(exception => (
            <ExceptionCard
              key={exception.id}
              exception={exception}
              onResolve={handleResolve}
              currentRole="Loan Officer"
            />
          ))}
        </div>
      )}
    </div>
  );
}
