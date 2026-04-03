import { Suspense } from 'react';
import { getBorrowers, getCovenants, getCovenantTemplates } from '@/lib/data';
import ExtractionPageContent from './ExtractionPageContent';

function LoadingFallback() {
  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: '#0f172a' }}>
          Covenant Extraction
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          AI-extracted covenants with per-field confidence scores
        </p>
      </div>
      <div
        className="rounded-lg animate-pulse"
        style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', height: '400px' }}
      />
    </div>
  );
}

export default function Page() {
  const borrowers = getBorrowers();
  const covenants = getCovenants();
  const templates = getCovenantTemplates();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ExtractionPageContent borrowers={borrowers} covenants={covenants} templates={templates} />
    </Suspense>
  );
}
