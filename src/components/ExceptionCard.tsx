'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Exception } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExceptionAction = 'Approve' | 'Edit' | 'Reject' | 'Escalate';

export interface ExceptionResolution {
  action: ExceptionAction;
  rationale: string;
  actor: string;
  timestamp: string;
  escalateTo?: string;
}

interface Props {
  exception: Exception;
  onResolve: (id: string, resolution: ExceptionResolution) => void;
  currentRole?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function typeColor(type: Exception['type']): { bg: string; color: string } {
  if (type === 'Low-Confidence Extraction') return { bg: '#fff7ed', color: '#c2410c' };
  if (type === 'Dual-Agent Disagreement') return { bg: '#faf5ff', color: '#7c3aed' };
  return { bg: '#fef2f2', color: '#b91c1c' };
}

function priorityColor(priority: string): { bg: string; color: string; dot: string } {
  if (priority === 'High') return { bg: '#fef2f2', color: '#b91c1c', dot: '#dc2626' };
  return { bg: '#fffbeb', color: '#b45309', dot: '#f59e0b' };
}

// ─── Action form ─────────────────────────────────────────────────────────────

function ActionForm({
  action,
  currentRole,
  onConfirm,
  onCancel,
}: {
  action: ExceptionAction;
  currentRole: string;
  onConfirm: (rationale: string, escalateTo?: string) => void;
  onCancel: () => void;
}) {
  const [rationale, setRationale] = useState('');
  const [escalateTo, setEscalateTo] = useState('Senior Credit Officer');

  const actionConfig: Record<ExceptionAction, { label: string; btnBg: string; btnColor: string; placeholder: string }> = {
    Approve: { label: 'Approve', btnBg: '#f0fdf4', btnColor: '#16a34a', placeholder: 'Optional rationale...' },
    Edit: { label: 'Confirm Edit', btnBg: '#eff6ff', btnColor: '#2563eb', placeholder: 'Describe the correction...' },
    Reject: { label: 'Confirm Reject', btnBg: '#fef2f2', btnColor: '#b91c1c', placeholder: 'Reason for rejection...' },
    Escalate: { label: 'Escalate', btnBg: '#fffbeb', btnColor: '#b45309', placeholder: 'Reason for escalation...' },
  };
  const cfg = actionConfig[action];

  return (
    <div className="mt-3 rounded-lg p-4" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
      <div className="text-xs font-semibold mb-2" style={{ color: '#374151' }}>
        {action === 'Approve' && 'Approve — add rationale (optional):'}
        {action === 'Edit' && 'Correct the value and describe the change:'}
        {action === 'Reject' && 'Reject — provide reason:'}
        {action === 'Escalate' && 'Escalate to:'}
      </div>
      {action === 'Escalate' && (
        <select
          value={escalateTo}
          onChange={e => setEscalateTo(e.target.value)}
          className="w-full text-sm px-3 py-1.5 rounded-md mb-2"
          style={{ border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#0f172a', outline: 'none' }}
        >
          <option>Senior Credit Officer</option>
          <option>Head of Credit Risk</option>
          <option>Chief Risk Officer</option>
        </select>
      )}
      <textarea
        value={rationale}
        onChange={e => setRationale(e.target.value)}
        placeholder={cfg.placeholder}
        rows={2}
        className="w-full text-sm px-3 py-2 rounded-md resize-none"
        style={{ border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#0f172a', outline: 'none' }}
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onConfirm(rationale, escalateTo)}
          className="px-3 py-1.5 rounded-md text-xs font-semibold"
          style={{ backgroundColor: cfg.btnBg, color: cfg.btnColor, border: `1px solid ${cfg.btnBg}` }}
        >
          {cfg.label}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-xs"
          style={{ backgroundColor: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── ExceptionCard ────────────────────────────────────────────────────────────

export default function ExceptionCard({ exception, onResolve, currentRole = 'Loan Officer' }: Props) {
  const [activeAction, setActiveAction] = useState<ExceptionAction | null>(null);
  const [resolution, setResolution] = useState<ExceptionResolution | null>(null);

  const tc = typeColor(exception.type);
  const pc = priorityColor(exception.priority);
  const conf = Math.round(exception.agentConfidence * 100);

  function handleConfirm(rationale: string, escalateTo?: string) {
    const res: ExceptionResolution = {
      action: activeAction!,
      rationale,
      actor: currentRole,
      timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      escalateTo,
    };
    setResolution(res);
    setActiveAction(null);
    onResolve(exception.id, res);
  }

  // Resolved state
  if (resolution) {
    const actionColorMap: Record<ExceptionAction, { bg: string; color: string; label: string }> = {
      Approve: { bg: '#f0fdf4', color: '#16a34a', label: 'Approved' },
      Edit: { bg: '#eff6ff', color: '#2563eb', label: 'Edited' },
      Reject: { bg: '#fef2f2', color: '#b91c1c', label: 'Rejected' },
      Escalate: { bg: '#fffbeb', color: '#b45309', label: `Escalated to ${resolution.escalateTo ?? 'Senior Credit Officer'}` },
    };
    const ac = actionColorMap[resolution.action];
    return (
      <div className="rounded-lg p-5 transition-all" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', opacity: 0.85 }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: ac.bg, color: ac.color }}>
                Resolved — {ac.label}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: tc.bg, color: tc.color }}>
                {exception.type}
              </span>
            </div>
            <div className="text-sm font-semibold" style={{ color: '#374151' }}>{exception.borrowerName}</div>
            <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{exception.description}</div>
          </div>
          <div className="text-right text-xs" style={{ color: '#94a3b8' }}>
            <div>{resolution.actor}</div>
            <div>{resolution.timestamp}</div>
          </div>
        </div>
        {resolution.rationale && (
          <div className="mt-2 text-xs italic" style={{ color: '#64748b' }}>
            &ldquo;{resolution.rationale}&rdquo;
          </div>
        )}
      </div>
    );
  }

  // Parse dual-agent reasoning
  let agentAText = '';
  let agentBText = '';
  if (exception.type === 'Dual-Agent Disagreement') {
    const r = exception.agentReasoning;
    const aMatch = r.match(/Agent A (.+?)\. Agent B (.+?)\./);
    if (aMatch) {
      agentAText = `Agent A ${aMatch[1]}.`;
      agentBText = `Agent B ${aMatch[2]}.`;
    }
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
      {/* Card header */}
      <div className="flex items-center gap-3 px-5 py-3" style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full pulse-dot" style={{ backgroundColor: pc.dot }} />
          <span className="text-xs font-bold uppercase" style={{ color: pc.color }}>{exception.priority} Priority</span>
        </div>
        <div className="w-px h-4" style={{ backgroundColor: '#e2e8f0' }} />
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: tc.bg, color: tc.color }}>
          {exception.type}
        </span>
        <div className="ml-auto text-xs" style={{ color: '#94a3b8' }}>
          Routed to: <span style={{ color: '#374151', fontWeight: 500 }}>{exception.routedTo}</span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 py-4">
        {/* Borrower */}
        <div className="text-sm font-semibold mb-3" style={{ color: '#0f172a' }}>
          {exception.borrowerName}
        </div>

        {/* What happened */}
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>What Happened</div>
          <div className="text-sm" style={{ color: '#374151' }}>{exception.description}</div>
        </div>

        {/* Agent Action */}
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Agent Action</div>
          <div className="text-sm" style={{ color: '#374151' }}>{exception.agentAction}</div>
        </div>

        {/* Type-specific detail */}
        {exception.type === 'Dual-Agent Disagreement' && (
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Why Uncertain</div>
            <div className="text-sm" style={{ color: '#374151' }}>{exception.agentReasoning}</div>
          </div>
        )}

        {exception.type === 'Low-Confidence Extraction' && (
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Extraction Detail</div>
            <div className="text-sm" style={{ color: '#374151' }}>{exception.agentReasoning}</div>
          </div>
        )}

        {exception.type === 'Uncertain Breach Calculation' && (
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Calculation Concern</div>
            <div className="text-sm" style={{ color: '#374151' }}>{exception.agentReasoning}</div>
          </div>
        )}

        {/* Confidence + meta */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="text-xs" style={{ color: '#64748b' }}>Confidence:</div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold tabular-nums" style={{ color: conf >= 80 ? '#374151' : '#b45309' }}>
                {conf}%
              </span>
              <div className="w-20 h-1.5 rounded-full" style={{ backgroundColor: '#e2e8f0' }}>
                <div className="h-1.5 rounded-full" style={{
                  width: `${conf}%`,
                  backgroundColor: conf >= 85 ? '#10b981' : conf >= 75 ? '#f59e0b' : '#f87171',
                }} />
              </div>
            </div>
          </div>
          <div className="text-xs" style={{ color: '#94a3b8' }}>Source: {exception.sourceAgent}</div>
          <div className="text-xs" style={{ color: '#94a3b8' }}>Created: {fmtDate(exception.createdDate)}</div>
          {exception.type === 'Uncertain Breach Calculation' && exception.breachId && (
            <Link href="/breaches" className="text-xs font-medium" style={{ color: '#3b82f6' }}>
              View in Breach Detection →
            </Link>
          )}
          {exception.type !== 'Uncertain Breach Calculation' && (
            <Link href={`/extraction?borrower=${exception.borrowerId}`} className="text-xs font-medium" style={{ color: '#3b82f6' }}>
              View in Covenant Extraction →
            </Link>
          )}
        </div>

        {/* Action buttons */}
        {activeAction === null && (
          <div className="flex items-center gap-2 flex-wrap">
            {(['Approve', 'Edit', 'Reject', 'Escalate'] as ExceptionAction[]).map(action => {
              const colorMap: Record<ExceptionAction, { bg: string; color: string; border: string }> = {
                Approve: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
                Edit: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
                Reject: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
                Escalate: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
              };
              const c = colorMap[action];
              return (
                <button
                  key={action}
                  onClick={() => setActiveAction(action)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold"
                  style={{ backgroundColor: c.bg, color: c.color, border: `1px solid ${c.border}` }}
                >
                  {action}
                </button>
              );
            })}
          </div>
        )}

        {/* Inline action form */}
        {activeAction !== null && (
          <ActionForm
            action={activeAction}
            currentRole={currentRole}
            onConfirm={handleConfirm}
            onCancel={() => setActiveAction(null)}
          />
        )}
      </div>
    </div>
  );
}
