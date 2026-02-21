import { TripRequest } from '@/lib/agent-dashboard/types';
import { MapPin, Users, Calendar } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface DestinationCardsProps {
  groups: TripRequest[];
}

const destinationImages: Record<string, { gradient: string; image: string; icon: string }> = {
  'Goa': { 
    gradient: 'from-amber-400 via-orange-400 to-rose-400', 
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop',
    icon: 'https://api.iconify.design/mdi:beach.svg?color=%23f97316'
  },
  'Manali': { 
    gradient: 'from-emerald-400 via-teal-400 to-cyan-400', 
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    icon: 'https://api.iconify.design/mdi:mountain.svg?color=%2314b8a6'
  },
  'Kerala': { 
    gradient: 'from-green-400 via-emerald-500 to-teal-500', 
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400&h=300&fit=crop',
    icon: 'https://api.iconify.design/mdi:palm-tree.svg?color=%2310b981'
  },
  'Alleppey': { 
    gradient: 'from-blue-400 via-cyan-400 to-teal-400', 
    image: 'https://images.unsplash.com/photo-1580837119756-563d608dd119?w=400&h=300&fit=crop',
    icon: 'https://api.iconify.design/mdi:ferry.svg?color=%2306b6d4'
  },
};

const getDestinationStyle = (location: string) => {
  for (const [key, value] of Object.entries(destinationImages)) {
    if (location.includes(key)) {
      return value;
    }
  }
  return { 
    gradient: 'from-slate-400 via-gray-400 to-zinc-400', 
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop',
    icon: 'https://api.iconify.design/mdi:airplane.svg?color=%2364748b'
  };
};

const DestinationCards = ({ groups }: DestinationCardsProps) => {
  const topDestinations = groups.slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Active Destinations</h2>
        <span className="text-sm text-muted-foreground">{groups.length} groups traveling</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {topDestinations.map((group) => {
          const style = getDestinationStyle(group.destination);
          const totalMembers = group.groupSize.adults + group.groupSize.children + group.groupSize.seniors;
          const daysLeft = Math.ceil((new Date(group.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

          return (
            <Link
              key={group.id}
              href={`/agent-dashboard/${group.id}`}
              className="group relative overflow-hidden rounded-3xl bg-card border border-border hover:shadow-lg transition-all duration-300"
            >
              {/* Background Image with Overlays */}
              <div className="absolute inset-0 overflow-hidden">
                <Image
                  src={style.image}
                  alt={group.destination}
                  fill
                  className="object-cover group-hover:scale-105 transition-all duration-500"
                  unoptimized
                />
                {/* Lighter overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/50" />
                {/* Subtle color tint on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
              </div>
              
              {/* Content */}
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-md flex items-center justify-center mb-3 shadow-lg">
                      <Image
                        src={style.icon}
                        alt=""
                        width={28}
                        height={28}
                        className="opacity-90"
                        unoptimized
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1 drop-shadow-lg">
                      {group.destination}
                    </h3>
                    <p className="text-sm text-white/80 line-clamp-1 drop-shadow-md">
                      {group.customerName}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-white/90">
                    <Users className="w-4 h-4 mr-2 drop-shadow-md" />
                    <span className="drop-shadow-md">{totalMembers} travelers</span>
                  </div>
                  <div className="flex items-center text-sm text-white/90">
                    <Calendar className="w-4 h-4 mr-2 drop-shadow-md" />
                    <span className="drop-shadow-md">{daysLeft > 0 ? `${daysLeft} days remaining` : 'Ending today'}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-white/80 mb-1">
                    <span className="drop-shadow-md">Trip Progress</span>
                    <span className="drop-shadow-md">{Math.min(100, Math.max(0, 100 - (daysLeft / 7) * 100)).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-black/30 backdrop-blur-sm rounded-full overflow-hidden border border-white/20">
                    <div 
                      className={`h-full bg-gradient-to-r ${style.gradient} transition-all duration-500 shadow-lg`}
                      style={{ width: `${Math.min(100, Math.max(0, 100 - (daysLeft / 7) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DestinationCards;
