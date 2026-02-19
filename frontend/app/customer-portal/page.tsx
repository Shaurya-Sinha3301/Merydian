import type { Metadata } from 'next';
import EnhancedCustomerPortalInteractive from './components/EnhancedCustomerPortalInteractive';

export const metadata: Metadata = {
  title: 'Customer Portal - Voyageur',
  description: 'View your family members, travel itineraries, plan new trips, and connect with travel agents.',
};

export default function CustomerPortalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50/30">
      <EnhancedCustomerPortalInteractive />
    </div>
  );
}
