import type { Metadata } from 'next';
import EditorInteractive from './components/EditorInteractive';

export const metadata: Metadata = {
  title: 'Itinerary Editor - TripCraft Agent Portal',
  description: 'Make detailed modifications to trip itineraries with real-time cost analysis, margin tracking, and comprehensive editing tools for travel agents.',
};

export default function AgentItineraryEditorPage() {
  return <EditorInteractive />;
}