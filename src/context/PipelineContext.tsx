'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface LiveAgentData {
  status: 'success' | 'error' | 'skipped';
  result?: unknown;
  duration_ms?: number;
  error?: string;
  note?: string;
}

export interface LivePipelineResult {
  pipeline_status: string;
  deal: { borrower_name: string; deal_date: string; logged_at: string };
  agents: {
    covenant_extractor?: LiveAgentData | null;
    validation_agent_a?: LiveAgentData | null;
    validation_agent_b?: LiveAgentData | null;
    comparison?: LiveAgentData | null;
    breach_detection?: LiveAgentData | null;
    breach_summary?: LiveAgentData | null;
  };
}

interface PipelineContextType {
  pipelineResult: LivePipelineResult | null;
  setPipelineResult: (r: LivePipelineResult | null) => void;
}

const PipelineContext = createContext<PipelineContextType>({
  pipelineResult: null,
  setPipelineResult: () => {},
});

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [pipelineResult, setPipelineResult] = useState<LivePipelineResult | null>(null);
  return (
    <PipelineContext.Provider value={{ pipelineResult, setPipelineResult }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  return useContext(PipelineContext);
}
