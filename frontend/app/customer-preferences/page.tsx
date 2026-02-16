import type { Metadata } from 'next';
import PreferencesInteractive from './components/PreferencesInteractive';

export const metadata: Metadata = {
    title: 'Set Your Preferences - Meili AI',
    description: 'Tell us about your travel interests to help us create the perfect personalized itinerary for you.',
};

export default function CustomerPreferencesPage() {
    return <PreferencesInteractive />;
}
