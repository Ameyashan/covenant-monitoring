'use client';

import { BarChart } from '@tremor/react';

interface DivisionRow {
  division: string;
  covenantCount: number;
  breachCount: number;
  complianceRate: number;
  borrowerCount: number;
}

interface DivisionBreakdownProps {
  data: DivisionRow[];
}

const DIVISION_LABELS: Record<string, string> = {
  'Investment Banking': 'Inv. Banking',
  'Asset Management': 'Asset Mgmt',
  'Wealth Management': 'Wealth Mgmt',
  'Trading': 'Trading',
};

export default function DivisionBreakdown({ data }: DivisionBreakdownProps) {
  const chartData = data.map(d => ({
    Division: DIVISION_LABELS[d.division] ?? d.division,
    Covenants: d.covenantCount,
    Breaches: d.breachCount,
    'Compliance %': d.complianceRate,
  }));

  return (
    <div
      className="rounded-lg p-5"
      style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#0f172a' }}>Division Breakdown</h2>
          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Covenants and breaches by business division</p>
        </div>
      </div>

      {/* Chart */}
      <BarChart
        data={chartData}
        index="Division"
        categories={['Covenants', 'Breaches']}
        colors={['slate', 'rose']}
        className="h-40"
        showLegend={true}
        showGridLines={false}
        showYAxis={true}
        showXAxis={true}
      />

      {/* Table */}
      <div className="mt-4">
        <div
          className="grid text-[10px] font-semibold uppercase tracking-widest px-3 py-2 rounded-t"
          style={{
            gridTemplateColumns: '1.5fr 80px 70px 90px 80px',
            backgroundColor: '#f8fafc',
            color: '#94a3b8',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <span>Division</span>
          <span className="text-right">Borrowers</span>
          <span className="text-right">Covenants</span>
          <span className="text-right">Compliance</span>
          <span className="text-right">Breaches</span>
        </div>
        {data.map((row, i) => (
          <div
            key={row.division}
            className="grid px-3 py-2.5 text-xs"
            style={{
              gridTemplateColumns: '1.5fr 80px 70px 90px 80px',
              borderBottom: i < data.length - 1 ? '1px solid #f8fafc' : 'none',
            }}
          >
            <span className="font-medium" style={{ color: '#0f172a' }}>{row.division}</span>
            <span className="text-right tabular-nums" style={{ color: '#64748b' }}>{row.borrowerCount}</span>
            <span className="text-right tabular-nums" style={{ color: '#64748b' }}>{row.covenantCount}</span>
            <span
              className="text-right tabular-nums font-semibold"
              style={{ color: row.complianceRate >= 99 ? '#16a34a' : row.complianceRate >= 95 ? '#d97706' : '#dc2626' }}
            >
              {row.complianceRate}%
            </span>
            <span
              className="text-right tabular-nums font-semibold"
              style={{ color: row.breachCount > 0 ? '#dc2626' : '#16a34a' }}
            >
              {row.breachCount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
