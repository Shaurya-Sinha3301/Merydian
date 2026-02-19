import { LayoutGrid, List } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';

interface DashboardHeaderProps {
  showDetailedView: boolean;
  onToggleView: () => void;
}

const DashboardHeader = ({ showDetailedView, onToggleView }: DashboardHeaderProps) => {
  const currentDate = new Date();
  const greeting = currentDate.getHours() < 12 ? 'Good Morning' : currentDate.getHours() < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg">
            A
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              {greeting}, Agent!
            </h1>
            <p className="text-muted-foreground">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <button
          onClick={onToggleView}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
        >
          {showDetailedView ? (
            <>
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium">Overview</span>
            </>
          ) : (
            <>
              <List className="w-4 h-4" />
              <span className="text-sm font-medium">Detailed View</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DashboardHeader;
