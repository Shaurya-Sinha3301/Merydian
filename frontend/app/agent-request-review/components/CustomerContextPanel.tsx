import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface GroupMember {
  id: string;
  name: string;
  age: number;
  type: 'adult' | 'child' | 'senior';
  interests: string[];
  constraints: string[];
  image: string;
  alt: string;
}

interface CustomerInfo {
  requestId: string;
  customerName: string;
  email: string;
  phone: string;
  destination: string;
  startDate: string;
  endDate: string;
  budgetRange: string;
  groupSize: number;
  groupMembers: GroupMember[];
  mustVisit: string[];
  placesToAvoid: string[];
  specialRequirements: string[];
  submittedDate: string;
}

interface CustomerContextPanelProps {
  customerInfo: CustomerInfo;
}

const CustomerContextPanel = ({ customerInfo }: CustomerContextPanelProps) => {
  const getMemberTypeIcon = (type: string) => {
    switch (type) {
      case 'adult':
        return 'UserIcon';
      case 'child':
        return 'UserIcon';
      case 'senior':
        return 'UserIcon';
      default:
        return 'UserIcon';
    }
  };

  const getMemberTypeBadge = (type: string) => {
    const badges = {
      adult: 'bg-primary/10 text-primary',
      child: 'bg-accent/10 text-accent',
      senior: 'bg-secondary/10 text-secondary',
    };
    return badges[type as keyof typeof badges] || badges.adult;
  };

  return (
    <div className="h-full overflow-y-auto bg-card border-r border-border">
      <div className="p-6 space-y-6">
        {/* Request Header */}
        <div className="pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Request Details</h2>
            <span className="data-text text-xs text-muted-foreground">#{customerInfo.requestId}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Icon name="UserIcon" size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{customerInfo.customerName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icon name="EnvelopeIcon" size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{customerInfo.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icon name="PhoneIcon" size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{customerInfo.phone}</span>
            </div>
          </div>
        </div>

        {/* Trip Overview */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center space-x-2">
            <Icon name="MapPinIcon" size={18} className="text-primary" variant="solid" />
            <span>Trip Overview</span>
          </h3>
          <div className="space-y-2 pl-7">
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Destination</span>
              <span className="text-sm font-medium text-foreground text-right">{customerInfo.destination}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Duration</span>
              <span className="text-sm font-medium text-foreground text-right">{customerInfo.startDate} - {customerInfo.endDate}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Budget Range</span>
              <span className="text-sm font-medium text-foreground text-right">{customerInfo.budgetRange}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Group Size</span>
              <span className="text-sm font-medium text-foreground text-right">{customerInfo.groupSize} travelers</span>
            </div>
          </div>
        </div>

        {/* Group Members */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center space-x-2">
            <Icon name="UsersIcon" size={18} className="text-primary" variant="solid" />
            <span>Group Members</span>
          </h3>
          <div className="space-y-3 pl-7">
            {customerInfo.groupMembers.map((member) => (
              <div key={member.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted">
                    <AppImage
                      src={member.image}
                      alt={member.alt}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-foreground">{member.name}</span>
                      <span className={`caption text-xs px-2 py-0.5 rounded-full ${getMemberTypeBadge(member.type)}`}>
                        {member.type}
                      </span>
                    </div>
                    <span className="caption text-xs text-muted-foreground">{member.age} years old</span>
                  </div>
                </div>
                {member.interests.length > 0 && (
                  <div className="space-y-1">
                    <span className="caption text-xs text-muted-foreground">Interests:</span>
                    <div className="flex flex-wrap gap-1">
                      {member.interests.map((interest, idx) => (
                        <span key={idx} className="caption text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {member.constraints.length > 0 && (
                  <div className="space-y-1">
                    <span className="caption text-xs text-muted-foreground">Constraints:</span>
                    <div className="flex flex-wrap gap-1">
                      {member.constraints.map((constraint, idx) => (
                        <span key={idx} className="caption text-xs bg-warning/10 text-warning px-2 py-0.5 rounded flex items-center space-x-1">
                          <Icon name="ExclamationTriangleIcon" size={12} />
                          <span>{constraint}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Must Visit Places */}
        {customerInfo.mustVisit.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <Icon name="StarIcon" size={18} className="text-accent" variant="solid" />
              <span>Must Visit</span>
            </h3>
            <div className="space-y-2 pl-7">
              {customerInfo.mustVisit.map((place, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <Icon name="CheckCircleIcon" size={16} className="text-success mt-0.5" variant="solid" />
                  <span className="text-sm text-foreground">{place}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Places to Avoid */}
        {customerInfo.placesToAvoid.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <Icon name="XCircleIcon" size={18} className="text-destructive" variant="solid" />
              <span>Places to Avoid</span>
            </h3>
            <div className="space-y-2 pl-7">
              {customerInfo.placesToAvoid.map((place, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <Icon name="MinusCircleIcon" size={16} className="text-destructive mt-0.5" variant="solid" />
                  <span className="text-sm text-foreground">{place}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special Requirements */}
        {customerInfo.specialRequirements.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <Icon name="InformationCircleIcon" size={18} className="text-primary" variant="solid" />
              <span>Special Requirements</span>
            </h3>
            <div className="space-y-2 pl-7">
              {customerInfo.specialRequirements.map((req, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <Icon name="CheckBadgeIcon" size={16} className="text-primary mt-0.5" variant="solid" />
                  <span className="text-sm text-foreground">{req}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submission Info */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Icon name="ClockIcon" size={14} />
            <span>Submitted on {customerInfo.submittedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerContextPanel;