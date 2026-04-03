// ─── Borrower ──────────────────────────────────────────────────────────────
export interface Borrower {
  id: string;
  name: string;
  sector: 'Technology' | 'Healthcare' | 'Manufacturing' | 'Real Estate' | 'Retail';
  division: 'Investment Banking' | 'Asset Management' | 'Wealth Management' | 'Trading';
  watchListStatus: 'Green' | 'Amber' | 'Red';
  relationshipManager: string;
  loanOfficer: string;
  onboardedDate: string;
  riskScore: 'Low' | 'Medium' | 'High' | 'Critical';
  riskExplanation: string;
}

// ─── Deal ───────────────────────────────────────────────────────────────────
export interface Deal {
  id: string;
  borrowerId: string;
  borrowerName: string;
  dealType: 'Revolving Credit Facility' | 'Term Loan' | 'Bridge Loan' | 'Syndicated Loan' | 'Bilateral Loan';
  amount: number;
  amountUnit: string;
  dealDate: string;
  maturityDate: string;
  division: string;
  sector: string;
  relationshipManager: string;
  loanOfficer: string;
  lawFirm: string;
  status: 'Active';
  sourceAgent: string;
  ingestionConfidence: number;
}

// ─── Covenant Template ──────────────────────────────────────────────────────
export interface CovenantTemplate {
  id: string;
  sector: string;
  name: string;
  metric: string;
  operator: '>=' | '<=';
  defaultThreshold: number;
  unit: 'x' | '%' | '$M';
  frequency: 'Quarterly' | 'Annually';
  classification: 'Financial' | 'Maintenance';
  severity: 'Hard' | 'Soft';
}

// ─── Covenant ───────────────────────────────────────────────────────────────
export interface ConfidenceScores {
  name: number;
  threshold: number;
  frequency: number;
  classification: number;
  severity: number;
}

export interface Covenant {
  id: string;
  dealId: string;
  borrowerId: string;
  borrowerName: string;
  templateId: string;
  name: string;
  metric: string;
  operator: '>=' | '<=';
  threshold: number;
  unit: 'x' | '%' | '$M';
  frequency: 'Quarterly' | 'Annually';
  reportingDeadlineDays: number;
  gracePeriodDays: number;
  classification: 'Financial' | 'Maintenance';
  severity: 'Hard' | 'Soft';
  confidenceScores: ConfidenceScores;
  overallConfidence: number;
  validationStatus: 'Auto-Validated' | 'Flagged — Reviewed' | 'Escalated to Human';
  validationAgentA: 'Approved' | 'Flagged';
  validationAgentB: 'Approved' | 'Flagged';
  sourceClause: string;
  status: 'Active';
}

// ─── Financial ──────────────────────────────────────────────────────────────
export interface Financial {
  id: string;
  borrowerId: string;
  borrowerName: string;
  quarter: string;
  quarterEnd: string;
  submittedDate: string;
  receivedDate: string;
  documents: string[];
  metrics: Record<string, number>;
  extractionConfidence: number;
  status: 'Processed';
  sourceAgent: string;
}

// ─── Covenant Test ──────────────────────────────────────────────────────────
export interface CovenantTest {
  id: string;
  covenantId: string;
  borrowerId: string;
  financialId: string;
  quarter: string;
  covenantName: string;
  metric: string;
  operator: '>=' | '<=';
  threshold: number;
  unit: string;
  actualValue: number;
  passed: boolean;
  status: 'Compliant' | 'Breach — Confirmed' | 'Breach — Pending Review';
  severity: 'Hard' | 'Soft';
  agentConfidence: number;
  agentReasoning: string;
  testedDate: string;
  sourceAgent: string;
}

// ─── Breach ─────────────────────────────────────────────────────────────────
export interface Breach {
  id: string;
  covenantTestId: string;
  covenantId: string;
  borrowerId: string;
  borrowerName: string;
  dealId: string;
  quarter: string;
  covenantName: string;
  metric: string;
  operator: '>=' | '<=';
  threshold: number;
  actualValue: number;
  unit: string;
  severity: 'Hard' | 'Soft';
  status: 'Breach — Confirmed' | 'Breach — Pending Review' | 'Resolved — Waived';
  agentConfidence: number;
  agentReasoning: string;
  recommendedAction: string;
  sectorContext: string;
  detectedDate: string;
  resolvedDate: string | null;
  resolution: 'Waived' | null;
  sourceAgent: string;
  summaryAgent: string;
}

// ─── Exception ──────────────────────────────────────────────────────────────
export interface Exception {
  id: string;
  type: 'Low-Confidence Extraction' | 'Dual-Agent Disagreement' | 'Uncertain Breach Calculation';
  covenantId: string;
  borrowerId: string;
  borrowerName: string;
  breachId: string | null;
  description: string;
  agentAction: string;
  agentReasoning: string;
  agentConfidence: number;
  routedTo: string;
  status: 'Pending';
  priority: 'Medium' | 'High';
  createdDate: string;
  sourceAgent: string;
}

// ─── Waiver ─────────────────────────────────────────────────────────────────
export interface Waiver {
  id: string;
  breachId: string;
  covenantId: string;
  borrowerId: string;
  borrowerName: string;
  covenantName: string;
  waiverDate: string;
  waiverType: 'Permanent' | 'Time-Limited';
  expiryDate: string | null;
  approver: string;
  rationale: string;
  status: 'Active';
}

// ─── Audit Log ──────────────────────────────────────────────────────────────
export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: 'Deal' | 'Covenant' | 'Financial' | 'Breach' | 'WatchList' | 'Waiver';
  entityId: string;
  borrowerId: string;
  borrowerName: string;
  confidence: number | null;
  notes: string | null;
}

// ─── Outreach ────────────────────────────────────────────────────────────────
export interface Outreach {
  id: string;
  borrowerId: string;
  borrowerName: string;
  quarter: string;
  sentDate: string;
  deadline: string;
  status: 'Delivered' | 'Responded' | 'Overdue';
  remindersSent: number;
  lastReminderDate: string | null;
  escalatedToRM: boolean;
  escalatedDate: string | null;
  sourceAgent: string;
}

// ─── Watch List History ──────────────────────────────────────────────────────
export interface WatchListHistory {
  id: string;
  borrowerId: string;
  borrowerName: string;
  previousStatus: 'Green' | 'Amber';
  newStatus: 'Amber' | 'Red';
  reason: string;
  changedDate: string;
  changedBy: string;
  automatic: boolean;
}

// ─── Deals Pipeline ──────────────────────────────────────────────────────────
export interface DealsPipeline {
  id: string;
  dealId: string;
  borrowerId: string;
  borrowerName: string;
  emailSubject: string;
  emailFrom: string;
  emailDate: string;
  emailSnippet: string;
  attachments: string[];
  detectedBy: string;
  detectionConfidence: number;
  status: 'Ingested';
}

// ─── Dashboard Metrics ───────────────────────────────────────────────────────
export interface DashboardMetrics {
  totalActiveCovenants: number;
  totalBorrowers: number;
  complianceRate: number;
  totalTests: number;
  compliantTests: number;
  activeBreaches: number;
  hardBreaches: number;
  softBreaches: number;
  pendingExceptions: number;
  watchListGreen: number;
  watchListAmber: number;
  watchListRed: number;
  covenantsThisMonth: number;
}

export interface AgentFunnelData {
  dealsIngested: number;
  covenantsExtracted: number;
  autoValidated: number;
  flaggedReviewed: number;
  escalatedToHuman: number;
  financialsReceived: number;
  testsRun: number;
  breachesDetected: number;
  alertsSent: number;
  waiversGranted: number;
}
