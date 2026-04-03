import { getCovenants, getBorrowers } from '@/lib/data';
import ValidationPageContent from './ValidationPageContent';

export default function Page() {
  const covenants = getCovenants();
  const borrowers = getBorrowers();
  return <ValidationPageContent covenants={covenants} borrowers={borrowers} />;
}
