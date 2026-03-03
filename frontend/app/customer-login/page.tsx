import type { Metadata } from 'next';
import CustomerLoginInteractive from './components/CustomerLoginInteractive';

export const metadata: Metadata = {
  title: 'Customer Login - MerYDiaN',
  description: 'Login to your family portal using your Family ID',
};

export default function CustomerLoginPage() {
  return (
    <div className="min-h-screen bp-grid-bg bg-white">
      <CustomerLoginInteractive />
    </div>
  );
}
