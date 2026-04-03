import { getDealsPipeline, getDeals, getBorrowers } from '@/lib/data';
import DealSourcingPage from './DealSourcingPage';

export default function Page() {
  const pipeline = getDealsPipeline();
  const deals = getDeals();
  const borrowers = getBorrowers();

  return <DealSourcingPage pipeline={pipeline} deals={deals} borrowers={borrowers} />;
}
