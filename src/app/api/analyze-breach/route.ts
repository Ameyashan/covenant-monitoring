import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 180;

const MODEL = 'claude-sonnet-4-20250514';

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

function extractJSON(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const stripped = trimmed.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    try {
      return JSON.parse(stripped);
    } catch { /* fall through */ }
    const arrMatch = stripped.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { return JSON.parse(arrMatch[0]); } catch { /* fall through */ }
    }
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
    source: { type: 'base64' as const, media_type: 'application/pdf' as const, data },
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

const BREACH_DETECTION_PROMPT = `You are the Breach Detection Agent for an enterprise lending operations platform. Given a set of validated covenants and a borrower's financial statements, test each covenant against the actual financial data. For each covenant return: covenant_name, actual_value (extracted from financials), threshold_value, threshold_operator, status (compliant | breach_confirmed | breach_pending_review), breach_delta (how far from threshold, if applicable), confidence (0-100), reasoning (explain the calculation and your confidence in the numbers extracted). Return ONLY a JSON array, no markdown.`;

const BREACH_SUMMARY_PROMPT = `You are the Breach Summary Agent for an enterprise lending operations platform. Generate a concise executive breach summary for distribution to the deal team. Include: borrower_name (extract from the documents), breach_summary (plain language overview), breaches (array of each breach with covenant_name, actual_value, threshold, severity, recommended_action), overall_risk_assessment (low | medium | high | critical), recommended_next_steps (array of specific actions), sector_context (brief note on sector trends that may be relevant). Return ONLY a JSON object, no markdown.`;

type BreachItem = { status: string };

export async function POST(request: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse form data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const covenantsRaw = formData.get('covenants') as string | null;
  const financialsFile = formData.get('financials') as File | null;

  if (!covenantsRaw || !financialsFile) {
    return new Response(JSON.stringify({ error: 'covenants (JSON) and financials (PDF) are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let covenants: unknown;
  try {
    covenants = JSON.parse(covenantsRaw);
  } catch {
    return new Response(JSON.stringify({ error: 'covenants must be valid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const finB64 = await fileToBase64(financialsFile);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(obj: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      }

      try {
        // Breach Detection
        emit({ agent: 'breach_detection', status: 'running' });
        let breachResults: BreachItem[] | null = null;
        try {
          const { result, duration_ms } = await callAgent(client, BREACH_DETECTION_PROMPT, [
            pdfBlock(finB64),
            {
              type: 'text',
              text: `Validated covenants to test against the financials:\n${JSON.stringify(covenants)}`,
            },
          ]);
          breachResults = result as BreachItem[];
          emit({ agent: 'breach_detection', status: 'complete', result, duration_ms });
        } catch (err) {
          emit({ agent: 'breach_detection', status: 'error', error: String(err) });
          emit({ agent: 'breach_summary', status: 'skipped' });
          emit({ agent: '__done__', status: 'complete', pipeline_status: 'partial' });
          controller.close();
          return;
        }

        // Breach Summary
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
          pipeline_status: 'complete',
        });
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
