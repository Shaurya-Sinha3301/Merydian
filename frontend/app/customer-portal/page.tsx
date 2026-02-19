import type { Metadata } from 'next';
import CustomerPortalInteractive from './components/CustomerPortalInteractive';

export const metadata: Metadata = {
  title: 'Customer Portal - Voyageur',
  description: 'View your family members, travel itineraries, plan new trips, and connect with travel agents.',
};

export default function CustomerPortalPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFF]">
      <CustomerPortalInteractive />
    </div>
  );
}
