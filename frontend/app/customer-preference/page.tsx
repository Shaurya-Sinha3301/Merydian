import type { Metadata } from 'next';
import PreferenceBuilderInteractive from './components/PreferenceBuilderInteractive';

export const metadata: Metadata = {
    title: 'Interest Calibration — Voyageur',
    description: 'Select your key experience vectors to personalise your itinerary recommendations.',
};

export default function CustomerPreferencePage() {
    return (
        <div className="min-h-screen">
            <PreferenceBuilderInteractive />
        </div>
    );
}
