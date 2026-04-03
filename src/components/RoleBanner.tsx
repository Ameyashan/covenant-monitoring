'use client';

import { useRole } from '@/context/RoleContext';
import { User } from 'lucide-react';

const BANNERS: Record<string, Record<string, string>> = {
  dashboard: {
    'Senior Management': 'Portfolio overview with compliance, watch list, and breach summary.',
    'Loan Officer': 'Your borrowers — active breaches and pending waiver actions highlighted.',
    'Relationship Manager': 'Client outreach and watch list changes prioritized for your review.',
    'Compliance Officer': 'Exceptions and audit trail entries emphasized for compliance review.',
    'Operations Analyst': 'Agent activity funnel and confidence metrics highlighted.',
  },
  breaches: {
    'Senior Management': 'All active covenant breaches across the portfolio.',
    'Loan Officer': 'Breaches linked to your borrowers — review and initiate waivers as needed.',
    'Relationship Manager': 'Client-level breach alerts — coordinate with borrowers on remediation.',
    'Compliance Officer': 'Severity classification and audit trail are primary compliance signals.',
    'Operations Analyst': 'Agent confidence scores and detection pipeline metrics highlighted.',
  },
  exceptions: {
    'Senior Management': 'Items flagged for human review by AI agents.',
    'Loan Officer': 'Action required — review and resolve exceptions for your borrowers.',
    'Relationship Manager': 'Exceptions are handled by credit and operations teams.',
    'Compliance Officer': 'All unresolved exceptions require sign-off before escalation.',
    'Operations Analyst': 'Exception routing and agent confidence breakdown highlighted.',
  },
  waivers: {
    'Senior Management': 'Active waivers and new waiver requests across the portfolio.',
    'Loan Officer': 'Your pending waiver approvals — review and submit decisions.',
    'Relationship Manager': 'Waivers are read-only for relationship management view.',
    'Compliance Officer': 'Full waiver audit trail and approval chain visible for compliance.',
    'Operations Analyst': 'Waiver workflow is managed by loan officers and credit risk.',
  },
  audit: {
    'Senior Management': 'Complete audit trail across all agents and human approvers.',
    'Loan Officer': 'Activity log filtered to show actions related to your borrowers.',
    'Relationship Manager': 'Client activity history — use search to find specific borrower entries.',
    'Compliance Officer': 'Primary compliance view — full log of all AI and human decisions.',
    'Operations Analyst': 'Agent action log with confidence scores and entity breakdown.',
  },
  portfolio: {
    'Senior Management': 'Full portfolio view with watch list status and risk distribution.',
    'Loan Officer': 'Your assigned borrowers — compliance status and active breaches.',
    'Relationship Manager': 'Client profiles with covenant health, headroom, and outreach history.',
    'Compliance Officer': 'Covenant compliance rates and breach history per borrower.',
    'Operations Analyst': 'Coverage metrics, financial submissions, and data quality indicators.',
  },
  'stress-test': {
    'Senior Management': 'Scenario analysis showing portfolio sensitivity to macro shocks.',
    'Loan Officer': 'Stress impacts on your borrowers — plan proactive outreach for at-risk names.',
    'Relationship Manager': 'Client vulnerability under stressed scenarios — early warning signals.',
    'Compliance Officer': 'Stressed breach counts inform reserve and remediation planning.',
    'Operations Analyst': 'Stress calculation methodology and covenant test recalibration.',
  },
  risk: {
    'Senior Management': 'AI-generated risk scores highlighting emerging credit vulnerabilities.',
    'Loan Officer': 'Risk signals for your borrowers — flag for early relationship intervention.',
    'Relationship Manager': 'Borrower risk profiles — use insights to guide client conversations.',
    'Compliance Officer': 'Risk scores complement covenant compliance as an early warning layer.',
    'Operations Analyst': 'Predictive model inputs and score methodology highlighted.',
  },
};

interface Props {
  page: keyof typeof BANNERS;
}

export default function RoleBanner({ page }: Props) {
  const { role } = useRole();
  const message = BANNERS[page]?.[role];
  if (!message || role === 'Senior Management') return null;

  const roleColors: Record<string, { bg: string; border: string; color: string; dot: string }> = {
    'Loan Officer': { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', dot: '#3b82f6' },
    'Relationship Manager': { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', dot: '#22c55e' },
    'Compliance Officer': { bg: '#fefce8', border: '#fde68a', color: '#92400e', dot: '#f59e0b' },
    'Operations Analyst': { bg: '#f5f3ff', border: '#ddd6fe', color: '#5b21b6', dot: '#8b5cf6' },
  };

  const colors = roleColors[role] ?? { bg: '#f8fafc', border: '#e2e8f0', color: '#475569', dot: '#94a3b8' };

  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg mb-5 text-sm"
      style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}
    >
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.dot }} />
        <User size={13} />
        <span className="font-semibold">{role}</span>
      </div>
      <span style={{ color: colors.color, opacity: 0.85 }}>— {message}</span>
    </div>
  );
}
