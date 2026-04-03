# Covenant Monitoring Platform — Seed Data Dictionary

## Overview

13 JSON files with guaranteed referential integrity. Every ID is unique and all cross-references resolve correctly. All breach calculations are mathematically verified.

**Generated:** 2025-10-20 (simulated "now" date)
**Seed:** Deterministic (random seed 42) — re-running the generator produces identical output.

---

## Entity Relationship Map

```
borrowers ──< deals ──< covenants ──< covenant_tests ──< breaches ──< waivers
    │                       │               │                │
    │                       │               │                └──> exceptions
    │                       │               │
    │                       │               └──> financials (via borrowerId)
    │                       │
    │                       └──> covenant_templates (via templateId)
    │
    ├──< outreach
    ├──< watch_list_history
    └──< audit_log

deals_pipeline ──> deals (via dealId)
```

**Key:** `──<` = one-to-many, `──>` = references

---

## File: borrowers.json (75 records)

The master entity. Every other file references back to a borrower.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Primary key. Format: `BRW-xxxxxxxx` |
| `name` | string | Company name |
| `sector` | string | One of: Technology, Healthcare, Manufacturing, Real Estate, Retail |
| `division` | string | One of: Investment Banking, Asset Management, Wealth Management, Trading |
| `watchListStatus` | string | Green / Amber / Red — derived from breach data |
| `relationshipManager` | string | Person name |
| `loanOfficer` | string | Person name (always different from RM) |
| `onboardedDate` | date | YYYY-MM-DD |
| `riskScore` | string | Low / Medium / High / Critical |
| `riskExplanation` | string | Plain-English explanation of risk drivers |

**Distribution:**
- Sectors: Tech 16, Healthcare 14, Manufacturing 15, Real Estate 15, Retail 15
- Watch list: ~57 Green, ~12 Amber, ~6 Red
- Risk: ~48 Low, ~17 Medium, ~10 High

**Special borrowers:**
- `Apex Software Inc` — predictive risk scenario, elevated risk
- `Quantum Cloud Systems` — predictive risk, soft breach
- `NovaTech Solutions` — predictive risk, soft breach
- `Stratos AI Corp` — **no financials submitted** (predictive risk demo)

---

## File: deals.json (75 records)

One deal per borrower. Represents the credit agreement.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Primary key. Format: `DL-xxxxxxxx` |
| `borrowerId` | FK | → borrowers.id |
| `borrowerName` | string | Denormalized for display convenience |
| `dealType` | string | Revolving Credit Facility / Term Loan / Bridge Loan / Syndicated Loan / Bilateral Loan |
| `amount` | number | Loan amount |
| `amountUnit` | string | Always "$M" |
| `dealDate` | date | YYYY-MM-DD |
| `maturityDate` | date | YYYY-MM-DD |
| `division` | string | Matches borrower's division |
| `sector` | string | Matches borrower's sector |
| `relationshipManager` | string | |
| `loanOfficer` | string | |
| `lawFirm` | string | |
| `status` | string | Always "Active" |
| `sourceAgent` | string | Always "Deal Spotter" |
| `ingestionConfidence` | number | 0.91–0.99 |

---

## File: covenant_templates.json (19 records)

The firm's internal template library. Validation agents check extractions against these.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Primary key. Format: `TPL-XXX` |
| `sector` | string | Which sector this template applies to |
| `name` | string | Human-readable covenant name |
| `metric` | string | Machine-readable metric key (used in financials) |
| `operator` | string | >= or <= |
| `defaultThreshold` | number | Standard threshold for this sector |
| `unit` | string | x, %, $M |
| `frequency` | string | Quarterly / Annually |
| `classification` | string | Financial / Maintenance |
| `severity` | string | Hard / Soft |

---

## File: covenants.json (256 records)

Individual covenants extracted from each deal. 3-4 per borrower.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Primary key. Format: `COV-xxxxxxxx` |
| `dealId` | FK | → deals.id |
| `borrowerId` | FK | → borrowers.id |
| `borrowerName` | string | |
| `templateId` | FK | → covenant_templates.id |
| `name` | string | Covenant name |
| `metric` | string | Metric key (matches financials.metrics keys) |
| `operator` | string | >= or <= |
| `threshold` | number | The covenant threshold (varies slightly from template) |
| `unit` | string | x, %, $M |
| `frequency` | string | Quarterly / Annually |
| `reportingDeadlineDays` | number | Days after quarter-end |
| `gracePeriodDays` | number | Grace period in days |
| `classification` | string | Financial / Maintenance |
| `severity` | string | Hard / Soft |
| `confidenceScores` | object | Per-field: { name, threshold, frequency, classification, severity } |
| `overallConfidence` | number | Average of per-field scores |
| `validationStatus` | string | Auto-Validated / Flagged — Reviewed / Escalated to Human |
| `validationAgentA` | string | Approved / Flagged |
| `validationAgentB` | string | Approved / Flagged |
| `sourceClause` | string | e.g. "Section 7.3(b)" |
| `status` | string | Always "Active" |

**Distribution:**
- ~217 auto-validated, ~20 flagged/reviewed, ~19 escalated to human

---

## File: financials.json (296 records)

Quarterly financial submissions. 4 quarters per borrower (except Stratos AI Corp which has none).

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Primary key. Format: `FIN-xxxxxxxx` |
| `borrowerId` | FK | → borrowers.id |
| `borrowerName` | string | |
| `quarter` | string | "Q4 2024", "Q1 2025", "Q2 2025", "Q3 2025" |
| `quarterEnd` | date | YYYY-MM-DD |
| `submittedDate` | date | YYYY-MM-DD |
| `receivedDate` | datetime | ISO 8601 |
| `documents` | array[string] | Filenames of submitted documents |
| `metrics` | object | Key-value pairs matching covenant metric keys |
| `extractionConfidence` | number | 0.85–0.98 |
| `status` | string | Always "Processed" |
| `sourceAgent` | string | Always "Financials Spotter" |

**Important:** `metrics` keys match `covenants.metric` — this is how covenant testing works. Example: `{ "interestCoverageRatio": 3.45, "revenueGrowthYoY": 12.3 }`

---

## File: covenant_tests.json (1008 records)

Every covenant tested against every quarterly financial submission.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Primary key. Format: `TST-xxxxxxxx` |
| `covenantId` | FK | → covenants.id |
| `borrowerId` | FK | → borrowers.id |
| `financialId` | FK | → financials.id |
| `quarter` | string | |
| `covenantName` | string | |
| `metric` | string | |
| `operator` | string | >= or <= |
| `threshold` | number | |
| `unit` | string | |
| `actualValue` | number | From the financial submission |
| `passed` | boolean | Whether the test passed |
| `status` | string | Compliant / Breach — Confirmed / Breach — Pending Review |
| `severity` | string | Hard / Soft |
| `agentConfidence` | number | |
| `agentReasoning` | string | Plain-English explanation |
| `testedDate` | datetime | |
| `sourceAgent` | string | Always "Breach Detection Agent" |

**All breach math is verified:** every record where `passed=false` has been checked to confirm `actualValue` truly violates `operator threshold`.

---

## File: breaches.json (24 records)

Subset of covenant_tests where the test failed.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Primary key. Format: `BRC-xxxxxxxx` |
| `covenantTestId` | FK | → covenant_tests.id |
| `covenantId` | FK | → covenants.id |
| `borrowerId` | FK | → borrowers.id |
| `dealId` | FK | → deals.id |
| `quarter` | string | |
| `covenantName` | string | |
| `metric`, `operator`, `threshold`, `actualValue`, `unit` | | Same as test |
| `severity` | string | Hard / Soft |
| `status` | string | Breach — Confirmed / Breach — Pending Review / Resolved — Waived |
| `agentConfidence` | number | |
| `agentReasoning` | string | |
| `recommendedAction` | string | e.g. "Escalate to Credit Committee" |
| `sectorContext` | string | Analysis of sector-wide trends |
| `detectedDate` | datetime | |
| `resolvedDate` | date/null | Set when waiver is granted |
| `resolution` | string/null | "Waived" or null |
| `sourceAgent` | string | "Breach Detection Agent" |
| `summaryAgent` | string | "Breach Summary Agent" |

**Distribution:** ~12 hard, ~12 soft, ~8 resolved via waiver, ~16 active

---

## File: exceptions.json (8 records)

Items in the human review queue.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Primary key. Format: `EXC-xxxxxxxx` |
| `type` | string | Low-Confidence Extraction / Dual-Agent Disagreement / Uncertain Breach Calculation |
| `covenantId` | FK | → covenants.id |
| `borrowerId` | FK | → borrowers.id |
| `breachId` | FK/null | → breaches.id (only for breach-type exceptions) |
| `description` | string | What happened |
| `agentAction` | string | What the agent did |
| `agentReasoning` | string | Why the agent was uncertain |
| `agentConfidence` | number | |
| `routedTo` | string | "Operations Analyst" or "Credit Risk / Loan Officer" |
| `status` | string | Always "Pending" |
| `priority` | string | Medium / High |
| `createdDate` | datetime | |
| `sourceAgent` | string | |

---

## File: waivers.json (8 records)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Primary key. Format: `WVR-xxxxxxxx` |
| `breachId` | FK | → breaches.id |
| `covenantId` | FK | → covenants.id |
| `borrowerId` | FK | → borrowers.id |
| `borrowerName` | string | |
| `covenantName` | string | |
| `waiverDate` | date | |
| `waiverType` | string | Permanent / Time-Limited |
| `expiryDate` | date/null | Only for time-limited waivers |
| `approver` | string | Person name (the loan officer) |
| `rationale` | string | |
| `status` | string | Always "Active" |

---

## File: audit_log.json (~1150 records)

Chronological log of every agent and human action.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Format: `AUD-xxxxxxxx` |
| `timestamp` | datetime | ISO 8601, sorted ascending |
| `actor` | string | Agent name or person name |
| `action` | string | What was done |
| `entityType` | string | Deal / Covenant / Financial / Breach / WatchList / Waiver |
| `entityId` | FK | → the relevant entity's id |
| `borrowerId` | FK | → borrowers.id |
| `borrowerName` | string | |
| `confidence` | number/null | For agent actions |
| `notes` | string/null | Details or rationale |

---

## File: outreach.json (297 records)

Borrower outreach tracking by the Outreach Agent.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Format: `OUT-xxxxxxxx` |
| `borrowerId` | FK | → borrowers.id |
| `quarter` | string | |
| `sentDate` | datetime | |
| `deadline` | date | |
| `status` | string | Delivered / Responded / Overdue |
| `remindersSent` | number | |
| `escalatedToRM` | boolean | |
| `sourceAgent` | string | Always "Outreach Agent" |

**Note:** Stratos AI Corp has an "Overdue" outreach record (no financials submitted).

---

## File: watch_list_history.json (24 records)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Format: `WLH-xxxxxxxx` |
| `borrowerId` | FK | → borrowers.id |
| `previousStatus` | string | Green / Amber |
| `newStatus` | string | Amber / Red |
| `reason` | string | |
| `changedDate` | datetime | |
| `changedBy` | string | Agent or person |
| `automatic` | boolean | |

---

## File: deals_pipeline.json (8 records)

Simulated email triggers for the Deal Sourcing screen.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Format: `PIP-xxxxxxxx` |
| `dealId` | FK | → deals.id |
| `borrowerId` | FK | → borrowers.id |
| `emailSubject` | string | |
| `emailFrom` | string | |
| `emailDate` | datetime | |
| `emailSnippet` | string | |
| `attachments` | array[string] | |
| `detectedBy` | string | Always "Deal Spotter" |
| `detectionConfidence` | number | |
| `status` | string | Always "Ingested" |

---

## Dashboard Aggregate Metrics

For convenience, here are the numbers the Executive Dashboard should display:

| Metric | Value |
|--------|-------|
| Total active covenants | 256 |
| Covenants due this month | ~47 (quarterly frequency) |
| Compliance rate | ~97.6% (984 compliant / 1008 tests) |
| Active breaches | 16 |
| Pending exceptions | 8 |
| Watch list: Green | 57 |
| Watch list: Amber | 12 |
| Watch list: Red | 6 |

## Agent Activity Funnel Numbers

| Stage | Volume |
|-------|--------|
| Deals ingested | 75 |
| Covenants extracted | 256 |
| Auto-validated | 217 |
| Flagged / reviewed | 20 |
| Escalated to human | 19 |
| Financials received | 296 |
| Covenant tests run | 1,008 |
| Breaches detected | 24 |
| Alerts sent | 24 |
| Waivers granted | 8 |
