import type { Metadata } from 'next';
import GroupDetailsInteractive from './components/GroupDetailsInteractive';

export const metadata: Metadata = {
    title: 'Group Details - TravelAgent Hub',
    description: 'Detailed view of travel group, families, and itinerary status.',
};

export default function GroupDetailsPage() {
    return <GroupDetailsInteractive />;
}
