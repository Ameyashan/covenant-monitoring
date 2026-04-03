'use client';

import Link from 'next/link';
import type { Breach } from '@/lib/types';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';

interface BreachListProps {
  breaches: Breach[];
}

function formatThreshold(breach: Breach) {
  const unit = breach.unit;
  const actual = breach.actualValue.toFixed(2);
  const thresh = breach.threshold.toFixed(2);
  if (unit === 'x') return `${actual}x vs ${breach.operator} ${thresh}x`;
  if (unit === '%') return `${actual}% vs ${breach.operator} ${thresh}%`;
  if (unit === '$M') return `$${actual}M vs ${breach.operator} $${thresh}M`;
  return `${actual} vs ${breach.operator} ${thresh}`;
}

export default function BreachList({ breaches }: BreachListProps) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#f1f5f9' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#0f172a' }}>Active Breaches</h2>
          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
            {breaches.filter(b => b.status !== 'Resolved — Waived').length} unresolved
          </p>
        </div>
        <Link
          href="/breaches"
          className="text-xs font-medium transition-colors"
          style={{ color: '#3b82f6' }}
        >
          View all →
        </Link>
      </div>

      {/* Table header */}
      <div
        className="grid px-5 py-2 text-[10px] font-semibold uppercase tracking-widest"
        style={{
          color: '#94a3b8',
          gridTemplateColumns: '1fr 1.2fr 1.1fr 72px 80px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <span>Borrower</span>
        <span>Covenant</span>
        <span>Actual vs Threshold</span>
        <span>Severity</span>
        <span>Status</span>
      </div>

      {/* Rows */}
      <div>
        {breaches.slice(0, 10).map((breach, i) => (
          <Link
            key={breach.id}
            href={`/breaches?id=${breach.id}`}
            className="grid px-5 py-3 transition-colors"
            style={{
              gridTemplateColumns: '1fr 1.2fr 1.1fr 72px 80px',
              borderBottom: i < Math.min(breaches.length, 10) - 1 ? '1px solid #f8fafc' : 'none',
              textDecoration: 'none',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fafafa'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <span className="text-xs font-semibold truncate pr-2" style={{ color: '#0f172a' }}>
              {breach.borrowerName}
            </span>
            <span className="text-xs truncate pr-2" style={{ color: '#475569' }}>
              {breach.covenantName}
            </span>
            <span className="text-xs font-mono tabular-nums pr-2" style={{ color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
              {formatThreshold(breach)}
            </span>
            <span>
              <SeverityBadge severity={breach.severity} />
            </span>
            <span>
              <StatusBadge status={breach.status} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
