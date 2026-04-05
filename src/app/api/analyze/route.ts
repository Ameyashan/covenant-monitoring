import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Increase function timeout for multi-agent pipeline (Vercel/similar platforms)
export const maxDuration = 300;

const MODEL = 'claude-sonnet-4-20250514';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

function extractJSON(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Strip markdown code fences if present
    const stripped = trimmed.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    try {
      return JSON.parse(stripped);
    } catch { /* fall through */ }
    // Grab first JSON array
    const arrMatch = stripped.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { return JSON.parse(arrMatch[0]); } catch { /* fall through */ }
    }
    // Grab first JSON object
    const objMatch = stripped.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch { /* fall through */ }
    }
    throw new Error(`Could not parse JSON from agent response: ${trimmed.slice(0, 300)}`);
  }
}

function pdfBlock(data: string) {
  return {
    type: 'document' as const,
    source: {
      type: 'base64' as const,
      media_type: 'application/pdf' as const,
      data,
    },
  };
}

async function callAgent(
  client: Anthropic,
  system: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any[]
): Promise<{ result: unknown; duration_ms: number }> {
  const t0 = Date.now();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system,
    messages: [{ role: 'user', content }],
  });
  const duration_ms = Date.now() - t0;
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return { result: extractJSON(text), duration_ms };
}

// ── System prompts ────────────────────────────────────────────────────────────

const COVENANT_EXTRACTOR_PROMPT = `You are the Covenant Extractor agent for an enterprise lending operations platform. Extract ALL covenants from the provided credit agreement. For each covenant return a JSON object with: covenant_name, covenant_type (financial | informational | maintenance), threshold_value (numeric), threshold_operator (>= | <= | > | < | =), threshold_unit (x | % | $ | none), reporting_frequency (quarterly | annually | monthly), severity (hard | soft), classification (financial | informational | maintenance), confidence (0-100 score for overall extraction confidence), field_confidences (object with confidence scores for each individual field), source_clause (exact section or clause reference from the document). Return ONLY a JSON array, no markdown, no explanation.`;

const VALIDATION_A_PROMPT = `You are Validation Agent A for an enterprise lending operations platform. You independently review covenant extractions for accuracy. Given extracted covenants and a covenant template library, validate each covenant. For each covenant return: covenant_name, validation_status (approved | flagged | rejected), confidence (0-100), reasoning (brief explanation), template_match (name of matching template covenant or 'no match'). Template library for reference: Technology/Software: Interest coverage ratio >= 3.0x, Revenue growth >= 10% YoY, Minimum cash balance. Healthcare: Debt-to-EBITDA <= 4.5x, Fixed charge coverage >= 1.25x. Manufacturing: Leverage ratio <= 3.5x, Current ratio >= 1.2x, Capital expenditure limits. Real Estate: Loan-to-value <= 65%, Debt service coverage >= 1.3x. Retail: Minimum EBITDA, Inventory turnover ratio. Return ONLY a JSON array, no markdown.`;

const VALIDATION_B_PROMPT = `You are Validation Agent B for an enterprise lending operations platform. You are an independent second reviewer — you have NOT seen Validation Agent A's results. Review each extracted covenant for accuracy, completeness, and consistency with market-standard covenant structures. For each covenant return: covenant_name, validation_status (approved | flagged | rejected), confidence (0-100), reasoning (brief explanation), concerns (any issues found, or 'none'). Be thorough — look for ambiguous thresholds, missing fields, unusual structures, or potential extraction errors. Return ONLY a JSON array, no markdown.`;

const BREACH_DETECTION_PROMPT = `You are the Breach Detection Agent for an enterprise lending operations platform. Given a set of validated covenants and a borrower's financial statements, test each covenant against the actual financial data. For each covenant return: covenant_name, actual_value (extracted from financials), threshold_value, threshold_operator, status (compliant | breach_confirmed | breach_pending_review), breach_delta (how far from threshold, if applicable), confidence (0-100), reasoning (explain the calculation and your confidence in the numbers extracted). Return ONLY a JSON array, no markdown.`;

const BREACH_SUMMARY_PROMPT = `You are the Breach Summary Agent for an enterprise lending operations platform. Generate a concise executive breach summary for distribution to the deal team. Include: borrower_name (extract from the documents), breach_summary (plain language overview), breaches (array of each breach with covenant_name, actual_value, threshold, severity, recommended_action), overall_risk_assessment (low | medium | high | critical), recommended_next_steps (array of specific actions), sector_context (brief note on sector trends that may be relevant). Return ONLY a JSON object, no markdown.`;

// ── Types ─────────────────────────────────────────────────────────────────────

type ValidationItem = {
  covenant_name: string;
  validation_status: 'approved' | 'flagged' | 'rejected';
  confidence: number;
};

type ComparisonItem = {
  covenant_name: string;
  status: 'auto_validated' | 'flagged_for_review' | 'escalated';
  validation_confidence: number;
  route: 'exception_queue' | null;
};

type BreachItem = { status: string };

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to your environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse multipart form data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const creditFile = formData.get('creditAgreement') as File | null;
  const financialsFile = formData.get('financials') as File | null;

  if (!creditFile) {
    return new Response(JSON.stringify({ error: 'creditAgreement PDF is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Convert PDFs to base64 before streaming starts
  const creditB64 = await fileToBase64(creditFile);
  const finB64 = financialsFile ? await fileToBase64(financialsFile) : null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(obj: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      }

      try {
        // Step 0: Deal Logged (instant)
        emit({ agent: 'deal_logged', status: 'complete' });

        // ── Agent 1: Covenant Extractor ─────────────────────────────────────
        let extractedCovenants: unknown = null;
        emit({ agent: 'covenant_extractor', status: 'running' });
        try {
          const { result, duration_ms } = await callAgent(client, COVENANT_EXTRACTOR_PROMPT, [
            pdfBlock(creditB64),
            { type: 'text', text: 'Extract all covenants from this credit agreement.' },
          ]);
          extractedCovenants = result;
          emit({ agent: 'covenant_extractor', status: 'complete', result, duration_ms });
        } catch (err) {
          emit({ agent: 'covenant_extractor', status: 'error', error: String(err) });
        }

        // ── Agent 2: Validation Agent A ─────────────────────────────────────
        let validationA: ValidationItem[] | null = null;
        if (extractedCovenants) {
          emit({ agent: 'validation_agent_a', status: 'running' });
          try {
            const { result, duration_ms } = await callAgent(client, VALIDATION_A_PROMPT, [
              { type: 'text', text: JSON.stringify(extractedCovenants) },
            ]);
            validationA = result as ValidationItem[];
            emit({ agent: 'validation_agent_a', status: 'complete', result, duration_ms });
          } catch (err) {
            emit({ agent: 'validation_agent_a', status: 'error', error: String(err) });
          }
        } else {
          emit({ agent: 'validation_agent_a', status: 'skipped' });
        }

        // ── Agent 3: Validation Agent B ─────────────────────────────────────
        let validationB: ValidationItem[] | null = null;
        if (extractedCovenants) {
          emit({ agent: 'validation_agent_b', status: 'running' });
          try {
            const { result, duration_ms } = await callAgent(client, VALIDATION_B_PROMPT, [
              { type: 'text', text: JSON.stringify(extractedCovenants) },
            ]);
            validationB = result as ValidationItem[];
            emit({ agent: 'validation_agent_b', status: 'complete', result, duration_ms });
          } catch (err) {
            emit({ agent: 'validation_agent_b', status: 'error', error: String(err) });
          }
        } else {
          emit({ agent: 'validation_agent_b', status: 'skipped' });
        }

        // ── Agent 4: Comparison & Routing (code-only) ───────────────────────
        if (validationA && validationB) {
          const comparison: ComparisonItem[] = validationA.map((a) => {
            const b: ValidationItem = validationB!.find((r) => r.covenant_name === a.covenant_name) ?? {
              covenant_name: a.covenant_name,
              validation_status: 'flagged',
              confidence: 0,
            };

            let status: ComparisonItem['status'];
            let route: ComparisonItem['route'] = null;

            if (a.validation_status === 'rejected' || b.validation_status === 'rejected') {
              status = 'escalated';
              route = 'exception_queue';
            } else if (
              a.validation_status === 'flagged' ||
              b.validation_status === 'flagged' ||
              a.validation_status !== b.validation_status
            ) {
              status = 'flagged_for_review';
              route = 'exception_queue';
            } else {
              status = 'auto_validated';
            }

            return {
              covenant_name: a.covenant_name,
              status,
              validation_confidence: Math.round((a.confidence + b.confidence) / 2),
              route,
            };
          });
          emit({ agent: 'comparison', status: 'complete', result: comparison });
        } else {
          emit({ agent: 'comparison', status: 'skipped' });
        }

        // ── Agent 5: Breach Detection (only if financials uploaded) ─────────
        let breachResults: BreachItem[] | null = null;
        if (finB64 && extractedCovenants) {
          emit({ agent: 'breach_detection', status: 'running' });
          try {
            const { result, duration_ms } = await callAgent(client, BREACH_DETECTION_PROMPT, [
              pdfBlock(finB64),
              {
                type: 'text',
                text: `Validated covenants to test against the financials:\n${JSON.stringify(extractedCovenants)}`,
              },
            ]);
            breachResults = result as BreachItem[];
            emit({ agent: 'breach_detection', status: 'complete', result, duration_ms });
          } catch (err) {
            emit({ agent: 'breach_detection', status: 'error', error: String(err) });
          }
        } else {
          emit({ agent: 'breach_detection', status: 'skipped' });
          emit({ agent: 'breach_summary', status: 'skipped' });
        }

        // ── Agent 6: Breach Summary (only if breaches found) ────────────────
        if (breachResults !== null) {
          const hasBreaches = breachResults.some((b) => b.status !== 'compliant');
          let borrowerName = 'Unknown';

          if (hasBreaches) {
            emit({ agent: 'breach_summary', status: 'running' });
            try {
              const { result, duration_ms } = await callAgent(client, BREACH_SUMMARY_PROMPT, [
                { type: 'text', text: JSON.stringify(breachResults) },
              ]);
              const summaryObj = result as { borrower_name?: string };
              if (summaryObj?.borrower_name) borrowerName = summaryObj.borrower_name;
              emit({ agent: 'breach_summary', status: 'complete', result, duration_ms });
            } catch (err) {
              emit({ agent: 'breach_summary', status: 'error', error: String(err) });
            }
          } else {
            emit({ agent: 'breach_summary', status: 'skipped' });
          }

          emit({
            agent: '__done__',
            status: 'complete',
            borrower_name: borrowerName,
            deal_date: new Date().toISOString().split('T')[0],
            logged_at: new Date().toISOString(),
            pipeline_status: 'complete',
          });
        } else {
          emit({
            agent: '__done__',
            status: 'complete',
            borrower_name: 'Unknown',
            deal_date: new Date().toISOString().split('T')[0],
            logged_at: new Date().toISOString(),
            pipeline_status: 'complete',
          });
        }

        controller.close();
      } catch (err) {
        emit({ agent: '__error__', status: 'error', error: String(err) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
