import Icon from '@/components/ui/AppIcon';

interface TripSummaryData {
  destination: string;
  startDate: string;
  endDate: string;
  duration: number;
  totalCost: number;
  groupSize: {
    adults: number;
    children: number;
    seniors: number;
  };
  status: 'draft' | 'submitted' | 'in-review' | 'approved';
}

interface TripSummaryCardProps {
  tripData: TripSummaryData;
}

const TripSummaryCard = ({ tripData }: TripSummaryCardProps) => {
  const totalPeople = tripData.groupSize.adults + tripData.groupSize.children + tripData.groupSize.seniors;
  const costPerPerson = tripData.totalCost / totalPeople;

  const statusConfig = {
    draft: { label: 'Draft', color: 'text-muted-foreground', bgColor: 'bg-muted' },
    submitted: { label: 'Submitted', color: 'text-primary', bgColor: 'bg-primary/10' },
    'in-review': { label: 'In Review', color: 'text-warning', bgColor: 'bg-warning/10' },
    approved: { label: 'Approved', color: 'text-success', bgColor: 'bg-success/10' },
  };

  const currentStatus = statusConfig[tripData.status];

  return (
    <div className="neu-flat rounded-3xl shadow-neu-md p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-1">{tripData.destination}</h2>
          <p className="text-sm text-muted-foreground">
            {tripData.startDate} - {tripData.endDate}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-2xl ${currentStatus.bgColor}`}>
          <span className={`text-sm font-medium ${currentStatus.color}`}>{currentStatus.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl neu-convex bg-primary/10">
            <Icon name="CalendarIcon" size={20} className="text-primary" variant="solid" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-sm font-semibold text-foreground">{tripData.duration} Days</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl neu-convex bg-success/10">
            <Icon name="CurrencyDollarIcon" size={20} className="text-success" variant="solid" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="text-sm font-semibold text-foreground">${tripData.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl neu-convex bg-accent/10">
            <Icon name="UserGroupIcon" size={20} className="text-accent" variant="solid" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Group Size</p>
            <p className="text-sm font-semibold text-foreground">{totalPeople} People</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl neu-convex bg-secondary/10">
            <Icon name="CalculatorIcon" size={20} className="text-secondary" variant="solid" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Per Person</p>
            <p className="text-sm font-semibold text-foreground">${costPerPerson.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 pt-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Group Composition</h3>
        <div className="flex flex-wrap gap-3">
          {tripData.groupSize.adults > 0 && (
            <div className="flex items-center space-x-2 px-4 py-2 neu-button rounded-2xl">
              <Icon name="UserIcon" size={16} className="text-foreground" />
              <span className="text-sm text-foreground">{tripData.groupSize.adults} Adults</span>
            </div>
          )}
          {tripData.groupSize.children > 0 && (
            <div className="flex items-center space-x-2 px-4 py-2 neu-button rounded-2xl">
              <Icon name="UserIcon" size={16} className="text-foreground" />
              <span className="text-sm text-foreground">{tripData.groupSize.children} Children</span>
            </div>
          )}
          {tripData.groupSize.seniors > 0 && (
            <div className="flex items-center space-x-2 px-4 py-2 neu-button rounded-2xl">
              <Icon name="UserIcon" size={16} className="text-foreground" />
              <span className="text-sm text-foreground">{tripData.groupSize.seniors} Seniors</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripSummaryCard;