import type { Metadata } from 'next';
import AgentLoginInteractive from './components/AgentLoginInteractive';

export const metadata: Metadata = {
    title: 'Agent Login - Voyageur',
    description: 'Login to your agent portal',
};

export default function AgentLoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bp-grid-bg bg-white">
            <AgentLoginInteractive />
        </div>
    );
}
