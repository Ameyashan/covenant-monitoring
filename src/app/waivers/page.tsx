'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getWaivers, getBreaches, getBorrowerById, getDealByBorrowerId } from '@/lib/data';
import type { Breach, Waiver } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import SeverityBadge from '@/components/SeverityBadge';
import BreachValueDisplay from '@/components/BreachValueDisplay';
import BreachHistoryTimeline from '@/components/BreachHistoryTimeline';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number, unit: string): string {
  const r = Math.round(value * 100) / 100;
  if (unit === '$M') return `$${r}M`;
  if (unit === '%') return `${r}%`;
  return `${r}x`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function defaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().split('T')[0];
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Active Waivers Tab ───────────────────────────────────────────────────────

function ActiveWaiversTab({ waivers }: { waivers: Waiver[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const allBreaches = useMemo(() => getBreaches(), []);

  return (
    <div className="rounded-lg overflow-hidden"
      style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>

      {/* Header */}
      <div className="grid text-[11px] font-semibold uppercase tracking-wider px-5 py-3"
        style={{
          color: '#94a3b8', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafafa',
          gridTemplateColumns: '1.5fr 1.5fr 0.8fr 1fr 0.8fr 0.9fr 0.6fr',
        }}>
        <div>Borrower</div>
        <div>Covenant</div>
        <div>Type</div>
        <div>Approved by</div>
        <div>Date</div>
        <div>Expiry</div>
        <div>Status</div>
      </div>

      {waivers.map(waiver => {
        const isExpanded = expandedId === waiver.id;
        const breach = allBreaches.find(b => b.id === waiver.breachId);
        const isPermanent = waiver.waiverType === 'Permanent';
        const days = waiver.expiryDate ? daysUntil(waiver.expiryDate) : null;
        const isExpired = days !== null && days < 0;

        return (
          <div key={waiver.id}>
            <div
              className="grid items-center px-5 py-3 cursor-pointer transition-colors hover:bg-slate-50"
              style={{
                gridTemplateColumns: '1.5fr 1.5fr 0.8fr 1fr 0.8fr 0.9fr 0.6fr',
                borderBottom: isExpanded ? 'none' : '1px solid #f8fafc',
                backgroundColor: isExpanded ? '#fafafa' : undefined,
              }}
              onClick={() => setExpandedId(isExpanded ? null : waiver.id)}
            >
              <div className="text-sm font-medium" style={{ color: '#0f172a' }}>{waiver.borrowerName}</div>
              <div className="text-sm" style={{ color: '#374151' }}>{waiver.covenantName}</div>
              <div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isPermanent ? '#eff6ff' : '#fff7ed',
                    color: isPermanent ? '#1d4ed8' : '#c2410c',
                  }}>
                  {waiver.waiverType}
                </span>
              </div>
              <div className="text-sm" style={{ color: '#374151' }}>{waiver.approver}</div>
              <div className="text-xs" style={{ color: '#64748b' }}>{fmtDate(waiver.waiverDate)}</div>
              <div>
                {waiver.expiryDate ? (
                  <div>
                    <div className="text-xs" style={{ color: isExpired ? '#dc2626' : '#374151' }}>
                      {fmtDate(waiver.expiryDate)}
                    </div>
                    {!isExpired && days !== null && (
                      <div className="text-[11px]" style={{ color: '#94a3b8' }}>Expires in {days}d</div>
                    )}
                    {isExpired && (
                      <div className="text-[11px]" style={{ color: '#dc2626' }}>Expired</div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs" style={{ color: '#94a3b8' }}>—</div>
                )}
              </div>
              <div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  Active
                </span>
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-5 py-4" style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
                      Rationale
                    </div>
                    <div className="text-sm" style={{ color: '#374151' }}>{waiver.rationale}</div>
                    {breach && (
                      <div className="mt-4">
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
                          Original Breach
                        </div>
                        <div className="flex items-center gap-3">
                          <BreachValueDisplay
                            actual={breach.actualValue}
                            operator={breach.operator}
                            threshold={breach.threshold}
                            unit={breach.unit}
                            size="sm"
                          />
                          <SeverityBadge severity={breach.severity} />
                          <span className="text-xs" style={{ color: '#64748b' }}>{breach.quarter}</span>
                        </div>
                        <div className="text-xs mt-1.5" style={{ color: '#94a3b8' }}>
                          Detected {fmtDate(breach.detectedDate)} · Confidence: {Math.round(breach.agentConfidence * 100)}%
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
                      Borrower History
                    </div>
                    <BreachHistoryTimeline borrowerId={waiver.borrowerId} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── New Waiver Form ──────────────────────────────────────────────────────────

interface GrantedWaiver {
  breachId: string;
  borrowerName: string;
  covenantName: string;
  waiverType: 'Permanent' | 'Time-Limited';
  expiryDate: string | null;
  approver: string;
  rationale: string;
  notes: string;
  timestamp: string;
}

function NewWaiverTab({ initialBreachId }: { initialBreachId: string | null }) {
  const allBreaches = useMemo(() => getBreaches(), []);
  const existingWaivers = useMemo(() => getWaivers(), []);

  // Breaches eligible for waiver: confirmed, not already waived
  const waivedBreachIds = new Set(existingWaivers.map(w => w.breachId));
  const eligible = useMemo(() =>
    allBreaches.filter(b => b.status === 'Breach — Confirmed' && !waivedBreachIds.has(b.id)),
    [allBreaches, existingWaivers]
  );

  const [selectedBreachId, setSelectedBreachId] = useState<string>(
    initialBreachId ?? eligible[0]?.id ?? ''
  );

  useEffect(() => {
    if (initialBreachId) setSelectedBreachId(initialBreachId);
  }, [initialBreachId]);

  const breach = useMemo(() => eligible.find(b => b.id === selectedBreachId) ?? allBreaches.find(b => b.id === selectedBreachId), [eligible, allBreaches, selectedBreachId]);
  const borrower = useMemo(() => breach ? getBorrowerById(breach.borrowerId) : undefined, [breach]);
  const deal = useMemo(() => breach ? getDealByBorrowerId(breach.borrowerId) : undefined, [breach]);

  // Form state
  const [waiverType, setWaiverType] = useState<'Permanent' | 'Time-Limited'>('Time-Limited');
  const [expiryDate, setExpiryDate] = useState(defaultExpiry());
  const [approver, setApprover] = useState('');
  const [rationale, setRationale] = useState('');
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [granted, setGranted] = useState<GrantedWaiver | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill approver from borrower's loan officer
  useEffect(() => {
    if (borrower) setApprover(borrower.loanOfficer);
  }, [borrower]);

  const loanOfficers = useMemo(() => {
    const set = new Set<string>();
    allBreaches.forEach(b => {
      const bor = getBorrowerById(b.borrowerId);
      if (bor?.loanOfficer) set.add(bor.loanOfficer);
    });
    return Array.from(set).sort();
  }, [allBreaches]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!rationale.trim()) errs.rationale = 'Rationale is required';
    if (waiverType === 'Time-Limited' && expiryDate <= todayString()) {
      errs.expiryDate = 'Expiry date must be in the future';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmitClick() {
    if (validate()) setShowConfirm(true);
  }

  function handleConfirm() {
    setGranted({
      breachId: breach!.id,
      borrowerName: breach!.borrowerName,
      covenantName: breach!.covenantName,
      waiverType,
      expiryDate: waiverType === 'Time-Limited' ? expiryDate : null,
      approver,
      rationale,
      notes,
      timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    });
    setShowConfirm(false);
  }

  // Success state
  if (granted) {
    return (
      <div className="rounded-lg p-8" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10l4 4 8-8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-semibold" style={{ color: '#0f172a' }}>Waiver Recorded</div>
            <div className="text-sm" style={{ color: '#64748b' }}>The audit trail has been updated</div>
          </div>
        </div>

        {/* Waiver detail card */}
        <div className="rounded-lg p-5 mb-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold mb-0.5" style={{ color: '#16a34a' }}>Borrower</div>
              <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>{granted.borrowerName}</div>
            </div>
            <div>
              <div className="text-xs font-semibold mb-0.5" style={{ color: '#16a34a' }}>Covenant</div>
              <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>{granted.covenantName}</div>
            </div>
            <div>
              <div className="text-xs font-semibold mb-0.5" style={{ color: '#16a34a' }}>Waiver Type</div>
              <div className="text-sm" style={{ color: '#374151' }}>{granted.waiverType}</div>
            </div>
            {granted.expiryDate && (
              <div>
                <div className="text-xs font-semibold mb-0.5" style={{ color: '#16a34a' }}>Expires</div>
                <div className="text-sm" style={{ color: '#374151' }}>{fmtDate(granted.expiryDate)}</div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold mb-0.5" style={{ color: '#16a34a' }}>Approved by</div>
              <div className="text-sm" style={{ color: '#374151' }}>{granted.approver}</div>
            </div>
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid #bbf7d0' }}>
            <div className="text-xs font-semibold mb-0.5" style={{ color: '#16a34a' }}>Rationale</div>
            <div className="text-sm" style={{ color: '#374151' }}>{granted.rationale}</div>
          </div>
        </div>

        {/* Simulated audit trail entry */}
        <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
            Audit Trail Entry
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#16a34a' }} />
            <div>
              <div className="text-sm" style={{ color: '#374151' }}>
                <span className="font-medium">{granted.approver}</span> granted a{' '}
                <span className="font-medium">{granted.waiverType}</span> waiver for{' '}
                <span className="font-medium">{granted.borrowerName}</span> —{' '}
                <span className="font-medium">{granted.covenantName}</span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{granted.timestamp}</div>
              <div className="text-xs mt-0.5 italic" style={{ color: '#64748b' }}>&ldquo;{granted.rationale}&rdquo;</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/waivers"
            onClick={() => setGranted(null)}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
            View all waivers →
          </Link>
          <Link href="/breaches"
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
            ← Back to breach detection
          </Link>
          <Link href="/"
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
            View executive dashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left: form */}
      <div className="flex flex-col gap-5">
        {/* Step 1: Select breach */}
        <div className="rounded-lg p-5" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>
            Step 1 — Select Breach
          </div>
          <select
            value={selectedBreachId}
            onChange={e => setSelectedBreachId(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-md"
            style={{ border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#0f172a', outline: 'none' }}
          >
            {eligible.map(b => (
              <option key={b.id} value={b.id}>
                {b.borrowerName} — {b.covenantName} ({fmt(b.actualValue, b.unit)} vs {b.operator === '<=' ? '≤' : '≥'} {fmt(b.threshold, b.unit)}) · {b.severity}
              </option>
            ))}
          </select>
        </div>

        {/* Step 3: Waiver form */}
        <div className="rounded-lg p-5" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: '#94a3b8' }}>
            Step 2 — Waiver Details
          </div>

          {/* Waiver type */}
          <div className="mb-4">
            <div className="text-xs font-semibold mb-2" style={{ color: '#374151' }}>Waiver Type</div>
            <div className="flex gap-3">
              {(['Permanent', 'Time-Limited'] as const).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="waiverType"
                    value={t}
                    checked={waiverType === t}
                    onChange={() => setWaiverType(t)}
                    style={{ accentColor: '#3b82f6' }}
                  />
                  <span className="text-sm" style={{ color: '#374151' }}>{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Expiry date (Time-Limited only) */}
          {waiverType === 'Time-Limited' && (
            <div className="mb-4">
              <label className="text-xs font-semibold block mb-1" style={{ color: '#374151' }}>
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                min={todayString()}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md"
                style={{ border: `1px solid ${errors.expiryDate ? '#f87171' : '#e2e8f0'}`, backgroundColor: '#fff', color: '#0f172a', outline: 'none' }}
              />
              {errors.expiryDate && (
                <div className="text-xs mt-1" style={{ color: '#dc2626' }}>{errors.expiryDate}</div>
              )}
            </div>
          )}

          {/* Approver */}
          <div className="mb-4">
            <label className="text-xs font-semibold block mb-1" style={{ color: '#374151' }}>Approver</label>
            <select
              value={approver}
              onChange={e => setApprover(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-md"
              style={{ border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#0f172a', outline: 'none' }}
            >
              {loanOfficers.map(lo => <option key={lo}>{lo}</option>)}
            </select>
          </div>

          {/* Rationale */}
          <div className="mb-4">
            <label className="text-xs font-semibold block mb-1" style={{ color: '#374151' }}>
              Rationale <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={rationale}
              onChange={e => { setRationale(e.target.value); setErrors(v => ({ ...v, rationale: '' })); }}
              placeholder="Describe the justification for this waiver..."
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-md resize-none"
              style={{ border: `1px solid ${errors.rationale ? '#f87171' : '#e2e8f0'}`, backgroundColor: '#fff', color: '#0f172a', outline: 'none' }}
            />
            {errors.rationale && (
              <div className="text-xs mt-1" style={{ color: '#dc2626' }}>{errors.rationale}</div>
            )}
          </div>

          {/* Additional notes */}
          <div className="mb-5">
            <label className="text-xs font-semibold block mb-1" style={{ color: '#374151' }}>
              Additional Notes <span style={{ color: '#94a3b8' }}>(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional context..."
              rows={2}
              className="w-full text-sm px-3 py-2 rounded-md resize-none"
              style={{ border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#0f172a', outline: 'none' }}
            />
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmitClick}
            className="w-full py-2.5 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Grant waiver
          </button>
        </div>
      </div>

      {/* Right: breach preview */}
      {breach && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg p-5" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>
              Breach Details (Read-only)
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-base font-semibold" style={{ color: '#0f172a' }}>{breach.borrowerName}</div>
              <SeverityBadge severity={breach.severity} />
            </div>
            {borrower && (
              <div className="text-sm mb-3" style={{ color: '#64748b' }}>
                {borrower.sector} · {borrower.division}
              </div>
            )}
            <BreachValueDisplay
              actual={breach.actualValue}
              operator={breach.operator}
              threshold={breach.threshold}
              unit={breach.unit}
              size="lg"
            />
            <div className="mt-3 text-xs" style={{ color: '#94a3b8' }}>
              {breach.covenantName} · {breach.quarter} · Confidence: {Math.round(breach.agentConfidence * 100)}%
            </div>
            {deal && (
              <div className="mt-2 text-xs" style={{ color: '#94a3b8' }}>
                Deal: ${deal.amount}{deal.amountUnit} {deal.dealType}
              </div>
            )}
            <div className="mt-4">
              <div className="text-xs font-semibold mb-1" style={{ color: '#94a3b8' }}>Agent Reasoning</div>
              <div className="text-xs p-3 rounded-md" style={{ backgroundColor: '#f8fafc', color: '#374151' }}>
                {breach.agentReasoning}
              </div>
            </div>
          </div>

          {/* Borrower history */}
          <div className="rounded-lg p-5" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>
              Borrower History
            </div>
            <BreachHistoryTimeline borrowerId={breach.borrowerId} />
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {showConfirm && breach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-xl p-6 w-full max-w-md mx-4"
            style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
            <div className="text-base font-semibold mb-2" style={{ color: '#0f172a' }}>Confirm Waiver</div>
            <div className="text-sm mb-4" style={{ color: '#64748b' }}>
              This will record a <strong>{waiverType}</strong> waiver for{' '}
              <strong>{breach.borrowerName}</strong> — <strong>{breach.covenantName}</strong>.
              This action will be logged in the audit trail.
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Confirm — Grant waiver
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2.5 rounded-lg text-sm"
                style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function WaiversContent() {
  const searchParams = useSearchParams();
  const paramBreachId = searchParams.get('breach');

  const [activeTab, setActiveTab] = useState<'active' | 'new'>(paramBreachId ? 'new' : 'active');
  const waivers = useMemo(() => getWaivers(), []);

  useEffect(() => {
    if (paramBreachId) setActiveTab('new');
  }, [paramBreachId]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Waiver Workflow"
        description="Manage active waivers and grant new ones to close the breach lifecycle"
      />

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 mb-6" style={{ borderBottom: '1px solid #e2e8f0' }}>
        {([
          { key: 'active', label: `Active Waivers (${waivers.length})` },
          { key: 'new', label: 'Grant New Waiver' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab.key ? '#0f172a' : '#64748b',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-1px',
              padding: '0 16px 10px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'active' ? (
        <ActiveWaiversTab waivers={waivers} />
      ) : (
        <NewWaiverTab initialBreachId={paramBreachId} />
      )}
    </div>
  );
}

export default function WaiversPage() {
  return (
    <Suspense fallback={null}>
      <WaiversContent />
    </Suspense>
  );
}
