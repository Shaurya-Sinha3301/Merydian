import FloatingNav from '@/components/operations/FloatingNav';
import LightPillars from '@/components/operations/LightPillars';

export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 relative overflow-hidden">
      <LightPillars />
      <FloatingNav />
      <main className="relative z-10 pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
