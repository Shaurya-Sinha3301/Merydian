import type { Metadata } from 'next';
import CustomerNavigation from '@/components/common/CustomerNavigation';
import CustomerProgressIndicator from '@/components/common/CustomerProgressIndicator';
import CustomerItineraryInteractive from './components/CustomerItineraryInteractive';

export const metadata: Metadata = {
  title: 'My Itinerary - TripCraft',
  description: 'Review your AI-generated travel itinerary, request real-time modifications, and approve your final trip plan with instant cost and time calculations.',
};

export default function CustomerItineraryViewPage() {
  return (
    <>
      <CustomerNavigation />
      <CustomerProgressIndicator currentStatus="in-review" />
      <CustomerItineraryInteractive />
    </>
  );
}