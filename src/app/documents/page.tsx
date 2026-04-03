import { getFinancials, getOutreach, getBorrowers } from '@/lib/data';
import DocumentsPageContent from './DocumentsPageContent';

export default function Page() {
  const financials = getFinancials();
  const outreach = getOutreach();
  const borrowers = getBorrowers();
  return <DocumentsPageContent financials={financials} outreach={outreach} borrowers={borrowers} />;
}
