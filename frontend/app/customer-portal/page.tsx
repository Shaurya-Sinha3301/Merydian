import type { Metadata } from 'next';
import EnhancedCustomerPortalInteractive from './components/EnhancedCustomerPortalInteractive';

export const metadata: Metadata = {
  title: 'Customer Portal - Voyageur',
  description: 'View your family members, travel itineraries, plan new trips, and connect with travel agents.',
};

export default function CustomerPortalPage() {
  return <EnhancedCustomerPortalInteractive />;
}
