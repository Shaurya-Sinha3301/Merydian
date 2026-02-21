import { TripRequest } from '@/lib/agent-dashboard/types';
import { Phone, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface UpcomingGroupsTimelineProps {
  groups: TripRequest[];
}

const destinationImages: Record<string, string> = {
  'Goa': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=200&fit=crop',
  'Manali': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
  'Kerala': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400&h=200&fit=crop',
  'Alleppey': 'https://images.unsplash.com/photo-1580837119756-563d608dd119?w=400&h=200&fit=crop',
};

const getDestinationImage = (location: string) => {
  for (const [key, value] of Object.entries(destinationImages)) {
    if (location.includes(key)) {
      return value;
    }
  }
  return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=200&fit=crop';
};

const UpcomingGroupsTimeline = ({ groups }: UpcomingGroupsTimelineProps) => {
  // Sort groups by start date and take next 4
  const upcomingGroups = [...groups]
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 4);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysUntil = (dateString: string) => {
    const days = Math.ceil((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Ongoing';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  return (
    <div className="bg-card rounded-3xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Upcoming Groups</h2>
        <span className="text-sm text-muted-foreground">{upcomingGroups.length} scheduled</span>
      </div>

      <div className="space-y-3">
        {upcomingGroups.map((group, index) => {
          const totalMembers = group.groupSize.adults + group.groupSize.children + group.groupSize.seniors;
          const daysUntil = getDaysUntil(group.startDate);
          const destinationImage = getDestinationImage(group.destination);

          return (
            <Link
              key={group.id}
              href={`/agent-dashboard/${group.id}`}
              className="block group"
            >
              <div className="relative">
                {/* Timeline Line */}
                {index < upcomingGroups.length - 1 && (
                  <div className="absolute left-5 top-16 bottom-0 w-0.5 bg-border z-0" />
                )}

                {/* Timeline Dot */}
                <div className="absolute left-3 top-6 w-4 h-4 rounded-full bg-card border-2 border-primary z-10" />

                {/* Card Content */}
                <div className="ml-10 relative overflow-hidden rounded-2xl border border-border hover:shadow-lg transition-all duration-300">
                  {/* Background Image with Overlay */}
                  <div className="absolute inset-0">
                    <Image
                      src={destinationImage}
                      alt={group.destination}
                      fill
                      className="object-cover group-hover:scale-105 transition-all duration-500"
                      unoptimized
                    />
                    {/* Lighter overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/35 to-black/50" />
                  </div>

                  {/* Content */}
                  <div className="relative p-4 flex items-center justify-between">
                    {/* Left: Group Info */}
                    <div className="flex-1 min-w-0 mr-4">
                      <h4 className="font-semibold text-white mb-1 line-clamp-1 drop-shadow-lg">
                        {group.customerName}
                      </h4>
                      <p className="text-sm text-white/80 line-clamp-1 drop-shadow-md mb-2">
                        {group.destination}
                      </p>
                      <div className="flex items-center space-x-3 text-xs text-white/70">
                        <span className="drop-shadow-md">{formatDate(group.startDate)}</span>
                        <span className="drop-shadow-md">•</span>
                        <span className="drop-shadow-md">{totalMembers} travelers</span>
                      </div>
                    </div>

                    {/* Right: Badge & Actions */}
                    <div className="flex flex-col items-end space-y-2">
                      {/* Days Badge */}
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg ${
                        daysUntil === 'Today' || daysUntil === 'Tomorrow'
                          ? 'bg-amber-500 text-white'
                          : 'bg-white/95 text-gray-900 backdrop-blur-sm'
                      }`}>
                        {daysUntil}
                      </span>

                      {/* Quick Actions */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            console.log('Call', group.id);
                          }}
                          className="p-2 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-md"
                          title="Call"
                        >
                          <Phone className="w-3.5 h-3.5 text-gray-700" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            console.log('Message', group.id);
                          }}
                          className="p-2 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-md"
                          title="Message"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-gray-700" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* View All Button */}
      <button className="w-full mt-4 py-3 rounded-xl bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity">
        View All Groups
      </button>
    </div>
  );
};

export default UpcomingGroupsTimeline;
