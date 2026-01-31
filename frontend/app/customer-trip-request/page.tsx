import type { Metadata } from 'next';

import CustomerProgressIndicator from '@/components/common/CustomerProgressIndicator';
import TripRequestInteractive from './components/TripRequestInteractive';

export const metadata: Metadata = {
  title: 'Create Trip Request - TripCraft',
  description: 'Create your personalized trip request with guided form-driven input for destination, dates, budget, group composition, and individual preferences.',
};

export default function CustomerTripRequestPage() {
  return (
    <div className="min-h-screen bg-background">

      <CustomerProgressIndicator currentStatus="draft" />
      <TripRequestInteractive />
    </div>
  );
}