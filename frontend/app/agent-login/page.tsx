import type { Metadata } from 'next';
import AgentLoginInteractive from './components/AgentLoginInteractive';

export const metadata: Metadata = {
    title: 'Agent Login - MerYDiaN',
    description: 'Login to your agent portal',
};

export default function AgentLoginPage() {
    return (
        <div className="min-h-screen bp-grid-bg bg-white">
            <AgentLoginInteractive />
        </div>
    );
}
