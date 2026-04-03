'use client';

import { DonutChart } from '@tremor/react';
import type { WatchListHistory } from '@/lib/types';

interface WatchListDonutProps {
  green: number;
  amber: number;
  red: number;
  recentHistory: WatchListHistory[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function directionArrow(prev: string, next: string) {
  const order = { Green: 0, Amber: 1, Red: 2 };
  const a = order[prev as keyof typeof order] ?? 0;
  const b = order[next as keyof typeof order] ?? 0;
  return b > a ? '↑' : '↓';
}

function statusDot(status: string) {
  if (status === 'Red') return '#ef4444';
  if (status === 'Amber') return '#f59e0b';
  return '#22c55e';
}

export default function WatchListDonut({ green, amber, red, recentHistory }: WatchListDonutProps) {
  const chartData = [
    { name: 'Green', value: green },
    { name: 'Amber', value: amber },
    { name: 'Red', value: red },
  ];

  const total = green + amber + red;

  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-4"
      style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
    >
      <div>
        <h2 className="text-sm font-semibold" style={{ color: '#0f172a' }}>Watch List</h2>
        <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{total} borrowers monitored</p>
      </div>

      {/* Donut */}
      <div className="flex items-center justify-center">
        <DonutChart
          data={chartData}
          category="value"
          index="name"
          colors={['emerald', 'amber', 'rose']}
          showLabel={false}
          className="h-36 w-36"
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-around">
        {[
          { label: 'Green', count: green, color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Amber', count: amber, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Red', count: red, color: '#ef4444', bg: '#fef2f2' },
        ].map(({ label, count, color, bg }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg"
            style={{ backgroundColor: bg }}
          >
            <span className="text-lg font-bold tabular-nums leading-none" style={{ color }}>{count}</span>
            <span className="text-[10px] font-medium" style={{ color }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Recent changes */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>
          Recent Watch List Changes
        </div>
        <div className="flex flex-col gap-2">
          {recentHistory.slice(0, 5).map(entry => (
            <div key={entry.id} className="flex items-start gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                style={{ backgroundColor: statusDot(entry.newStatus) }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium truncate" style={{ color: '#0f172a', maxWidth: '120px' }}>
                    {entry.borrowerName}
                  </span>
                  <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>
                    {directionArrow(entry.previousStatus, entry.newStatus)}{' '}
                    <span style={{ color: statusDot(entry.previousStatus) }}>{entry.previousStatus}</span>
                    {' → '}
                    <span style={{ color: statusDot(entry.newStatus) }}>{entry.newStatus}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] truncate" style={{ color: '#94a3b8', maxWidth: '140px' }}>
                    {entry.reason}
                  </span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: '#cbd5e1' }}>
                    {formatDate(entry.changedDate)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
