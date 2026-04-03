import type {
  Borrower, Deal, CovenantTemplate, Covenant, Financial,
  CovenantTest, Breach, Exception, Waiver, AuditEntry,
  Outreach, WatchListHistory, DealsPipeline,
  DashboardMetrics, AgentFunnelData,
} from './types';

import borrowersRaw from '../../data/borrowers.json';
import dealsRaw from '../../data/deals.json';
import covenantTemplatesRaw from '../../data/covenant_templates.json';
import covenantsRaw from '../../data/covenants.json';
import financialsRaw from '../../data/financials.json';
import covenantTestsRaw from '../../data/covenant_tests.json';
import breachesRaw from '../../data/breaches.json';
import exceptionsRaw from '../../data/exceptions.json';
import waiversRaw from '../../data/waivers.json';
import auditLogRaw from '../../data/audit_log.json';
import outreachRaw from '../../data/outreach.json';
import watchListHistoryRaw from '../../data/watch_list_history.json';
import dealsPipelineRaw from '../../data/deals_pipeline.json';

// ─── Typed Arrays ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cast<T>(data: unknown): T[] { return data as T[]; }

const borrowers = cast<Borrower>(borrowersRaw);
const deals = cast<Deal>(dealsRaw);
const covenantTemplates = cast<CovenantTemplate>(covenantTemplatesRaw);
const covenants = cast<Covenant>(covenantsRaw);
const financials = cast<Financial>(financialsRaw);
const covenantTests = cast<CovenantTest>(covenantTestsRaw);
const breaches = cast<Breach>(breachesRaw);
const exceptions = cast<Exception>(exceptionsRaw);
const waivers = cast<Waiver>(waiversRaw);
const auditLog = cast<AuditEntry>(auditLogRaw);
const outreach = cast<Outreach>(outreachRaw);
const watchListHistory = cast<WatchListHistory>(watchListHistoryRaw);
const dealsPipeline = cast<DealsPipeline>(dealsPipelineRaw);

// ─── Borrowers ───────────────────────────────────────────────────────────────
export function getBorrowers(): Borrower[] {
  return borrowers;
}

export function getBorrowerById(id: string): Borrower | undefined {
  return borrowers.find(b => b.id === id);
}

// ─── Deals ───────────────────────────────────────────────────────────────────
export function getDeals(): Deal[] {
  return deals;
}

export function getDealByBorrowerId(borrowerId: string): Deal | undefined {
  return deals.find(d => d.borrowerId === borrowerId);
}

// ─── Covenant Templates ───────────────────────────────────────────────────────
export function getCovenantTemplates(): CovenantTemplate[] {
  return covenantTemplates;
}

// ─── Covenants ────────────────────────────────────────────────────────────────
export function getCovenants(): Covenant[] {
  return covenants;
}

export function getCovenantsByBorrowerId(borrowerId: string): Covenant[] {
  return covenants.filter(c => c.borrowerId === borrowerId);
}

// ─── Financials ───────────────────────────────────────────────────────────────
export function getFinancials(): Financial[] {
  return financials;
}

export function getFinancialsByBorrowerId(borrowerId: string): Financial[] {
  return financials.filter(f => f.borrowerId === borrowerId);
}

// ─── Covenant Tests ───────────────────────────────────────────────────────────
export function getCovenantTests(): CovenantTest[] {
  return covenantTests;
}

export function getTestsByCovenantId(covenantId: string): CovenantTest[] {
  return covenantTests.filter(t => t.covenantId === covenantId);
}

// ─── Breaches ─────────────────────────────────────────────────────────────────
export function getBreaches(): Breach[] {
  return breaches;
}

export function getActiveBreaches(): Breach[] {
  return breaches.filter(b => b.status !== 'Resolved — Waived');
}

export function getBreachesByBorrowerId(borrowerId: string): Breach[] {
  return breaches.filter(b => b.borrowerId === borrowerId);
}

// ─── Exceptions ───────────────────────────────────────────────────────────────
export function getExceptions(): Exception[] {
  return exceptions;
}

// ─── Waivers ──────────────────────────────────────────────────────────────────
export function getWaivers(): Waiver[] {
  return waivers;
}

export function getWaiversByBorrowerId(borrowerId: string): Waiver[] {
  return waivers.filter(w => w.borrowerId === borrowerId);
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
export function getAuditLog(): AuditEntry[] {
  return auditLog;
}

export function getAuditLogByBorrowerId(borrowerId: string): AuditEntry[] {
  return auditLog.filter(a => a.borrowerId === borrowerId);
}

// ─── Outreach ─────────────────────────────────────────────────────────────────
export function getOutreach(): Outreach[] {
  return outreach;
}

// ─── Watch List History ───────────────────────────────────────────────────────
export function getWatchListHistory(): WatchListHistory[] {
  return watchListHistory;
}

// ─── Deals Pipeline ───────────────────────────────────────────────────────────
export function getDealsPipeline(): DealsPipeline[] {
  return dealsPipeline;
}

// ─── Covenant Templates (extended) ────────────────────────────────────────────
export function getCovenantTemplateById(id: string): CovenantTemplate | undefined {
  return covenantTemplates.find(t => t.id === id);
}

// ─── Outreach (extended) ──────────────────────────────────────────────────────
export function getOutreachByBorrowerId(borrowerId: string): Outreach[] {
  return outreach.filter(o => o.borrowerId === borrowerId);
}

// ─── Aggregates ───────────────────────────────────────────────────────────────
export function getDashboardMetrics(): DashboardMetrics {
  const activeBreachesList = getActiveBreaches();
  const pendingExceptions = exceptions.filter(e => e.status === 'Pending');
  const compliantTests = covenantTests.filter(t => t.passed);
  const hardBreaches = activeBreachesList.filter(b => b.severity === 'Hard');
  const softBreaches = activeBreachesList.filter(b => b.severity === 'Soft');

  const greenBorrowers = borrowers.filter(b => b.watchListStatus === 'Green');
  const amberBorrowers = borrowers.filter(b => b.watchListStatus === 'Amber');
  const redBorrowers = borrowers.filter(b => b.watchListStatus === 'Red');

  // Quarterly covenants — approximately quarterly tests per 3-month period
  const quarterlyCovenants = covenants.filter(c => c.frequency === 'Quarterly');

  return {
    totalActiveCovenants: covenants.length,
    totalBorrowers: borrowers.length,
    complianceRate: Math.round((compliantTests.length / covenantTests.length) * 1000) / 10,
    totalTests: covenantTests.length,
    compliantTests: compliantTests.length,
    activeBreaches: activeBreachesList.length,
    hardBreaches: hardBreaches.length,
    softBreaches: softBreaches.length,
    pendingExceptions: pendingExceptions.length,
    watchListGreen: greenBorrowers.length,
    watchListAmber: amberBorrowers.length,
    watchListRed: redBorrowers.length,
    covenantsThisMonth: quarterlyCovenants.length,
  };
}

export function getAgentFunnelData(): AgentFunnelData {
  const autoValidated = covenants.filter(c => c.validationStatus === 'Auto-Validated').length;
  const flaggedReviewed = covenants.filter(c => c.validationStatus === 'Flagged — Reviewed').length;
  const escalatedToHuman = covenants.filter(c => c.validationStatus === 'Escalated to Human').length;

  return {
    dealsIngested: deals.length,
    covenantsExtracted: covenants.length,
    autoValidated,
    flaggedReviewed,
    escalatedToHuman,
    financialsReceived: financials.length,
    testsRun: covenantTests.length,
    breachesDetected: breaches.length,
    alertsSent: breaches.length,
    waiversGranted: waivers.length,
  };
}

export function getDivisionBreakdown() {
  const divisions = ['Investment Banking', 'Asset Management', 'Wealth Management', 'Trading'] as const;

  return divisions.map(division => {
    const divisionBorrowers = borrowers.filter(b => b.division === division);
    const borrowerIds = new Set(divisionBorrowers.map(b => b.id));
    const divisionCovenants = covenants.filter(c => borrowerIds.has(c.borrowerId));
    const divisionTests = covenantTests.filter(t => borrowerIds.has(t.borrowerId));
    const divisionBreaches = getActiveBreaches().filter(b => borrowerIds.has(b.borrowerId));
    const compliant = divisionTests.filter(t => t.passed).length;
    const complianceRate = divisionTests.length > 0
      ? Math.round((compliant / divisionTests.length) * 1000) / 10
      : 100;

    return {
      division,
      covenantCount: divisionCovenants.length,
      breachCount: divisionBreaches.length,
      complianceRate,
      borrowerCount: divisionBorrowers.length,
    };
  });
}
