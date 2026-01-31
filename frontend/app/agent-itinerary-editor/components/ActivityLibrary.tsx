'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface Activity {
  id: string;
  name: string;
  category: string;
  location: string;
  duration: number;
  priceRange: string;
  price: number;
  description: string;
  image: string;
  alt: string;
  rating: number;
  tags: string[];
}

interface ActivityLibraryProps {
  onActivitySelect: (activity: Activity) => void;
  selectedCategory?: string;
}

const ActivityLibrary = ({ onActivitySelect, selectedCategory }: ActivityLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(selectedCategory || 'all');
  const [priceFilter, setPriceFilter] = useState('all');

  const categories = [
  { id: 'all', label: 'All Activities', icon: 'Squares2X2Icon' },
  { id: 'attractions', label: 'Attractions', icon: 'BuildingLibraryIcon' },
  { id: 'dining', label: 'Dining', icon: 'CakeIcon' },
  { id: 'adventure', label: 'Adventure', icon: 'BoltIcon' },
  { id: 'culture', label: 'Culture', icon: 'AcademicCapIcon' },
  { id: 'shopping', label: 'Shopping', icon: 'ShoppingBagIcon' },
  { id: 'relaxation', label: 'Relaxation', icon: 'SparklesIcon' }];


  const priceRanges = [
  { id: 'all', label: 'All Prices' },
  { id: 'budget', label: '$0-50' },
  { id: 'moderate', label: '$51-150' },
  { id: 'premium', label: '$151+' }];


  const mockActivities: Activity[] = [
  {
    id: 'act-001',
    name: 'Eiffel Tower Summit Tour',
    category: 'attractions',
    location: 'Champ de Mars, Paris',
    duration: 180,
    priceRange: 'moderate',
    price: 89,
    description: 'Skip-the-line access to all three levels including summit with panoramic city views',
    image: "https://images.unsplash.com/photo-1654714696948-d38186f04df7",
    alt: 'Eiffel Tower illuminated at dusk with golden lights against purple sky',
    rating: 4.8,
    tags: ['iconic', 'views', 'photography']
  },
  {
    id: 'act-002',
    name: 'Le Jules Verne Restaurant',
    category: 'dining',
    location: 'Eiffel Tower, 2nd Floor',
    duration: 150,
    priceRange: 'premium',
    price: 285,
    description: 'Michelin-starred dining experience with breathtaking views of Paris',
    image: "https://images.unsplash.com/photo-1517807918616-f60475f77328",
    alt: 'Elegant fine dining table setting with white tablecloth and wine glasses overlooking city',
    rating: 4.9,
    tags: ['fine-dining', 'romantic', 'michelin']
  },
  {
    id: 'act-003',
    name: 'Seine River Cruise',
    category: 'relaxation',
    location: 'Port de la Bourdonnais',
    duration: 90,
    priceRange: 'budget',
    price: 35,
    description: 'Scenic boat tour along the Seine with audio guide and refreshments',
    image: "https://images.unsplash.com/photo-1532789778906-6ee7fe6c9ef1",
    alt: 'Tourist boat cruising on Seine River with historic Parisian buildings in background',
    rating: 4.6,
    tags: ['scenic', 'relaxing', 'sightseeing']
  },
  {
    id: 'act-004',
    name: 'Louvre Museum Private Tour',
    category: 'culture',
    location: 'Rue de Rivoli',
    duration: 240,
    priceRange: 'premium',
    price: 195,
    description: 'Expert-guided tour of world-famous artworks including Mona Lisa and Venus de Milo',
    image: "https://images.unsplash.com/photo-1601950355591-5099f042e4f9",
    alt: 'Glass pyramid entrance of Louvre Museum with classical architecture in background',
    rating: 4.9,
    tags: ['art', 'history', 'guided-tour']
  },
  {
    id: 'act-005',
    name: 'Hot Air Balloon Ride',
    category: 'adventure',
    location: 'Parc André Citroën',
    duration: 120,
    priceRange: 'premium',
    price: 220,
    description: 'Tethered balloon flight offering 360-degree views of Paris from 150 meters',
    image: "https://images.unsplash.com/photo-1607417793969-d349bdb51736",
    alt: 'Colorful hot air balloon floating above city with passengers in basket',
    rating: 4.7,
    tags: ['adventure', 'views', 'unique']
  },
  {
    id: 'act-006',
    name: 'Marché aux Puces Shopping',
    category: 'shopping',
    location: 'Saint-Ouen',
    duration: 180,
    priceRange: 'budget',
    price: 0,
    description: 'Explore Europe\'s largest antique market with over 2,500 vendors',
    image: "https://images.unsplash.com/photo-1726197799703-0e2c0c746b28",
    alt: 'Vintage antique market stall displaying colorful ceramics and decorative items',
    rating: 4.5,
    tags: ['shopping', 'antiques', 'local']
  },
  {
    id: 'act-007',
    name: 'Montmartre Walking Tour',
    category: 'culture',
    location: 'Montmartre District',
    duration: 150,
    priceRange: 'budget',
    price: 45,
    description: 'Discover the artistic heart of Paris with visits to Sacré-Cœur and Place du Tertre',
    image: "https://images.unsplash.com/photo-1660925912263-68be34f72759",
    alt: 'White domed Sacré-Cœur Basilica illuminated at night on hilltop',
    rating: 4.7,
    tags: ['walking', 'art', 'historic']
  },
  {
    id: 'act-008',
    name: 'Cooking Class at Le Cordon Bleu',
    category: 'dining',
    location: 'Rue Léon Delhomme',
    duration: 210,
    priceRange: 'premium',
    price: 175,
    description: 'Learn French culinary techniques from professional chefs in hands-on workshop',
    image: "https://images.unsplash.com/photo-1665356203435-9f1d0e5443c7",
    alt: 'Chef in white uniform preparing food in professional kitchen with copper pots',
    rating: 4.8,
    tags: ['cooking', 'hands-on', 'culinary']
  }];


  const filteredActivities = mockActivities.filter((activity) => {
    const matchesSearch = activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = activeCategory === 'all' || activity.category === activeCategory;
    const matchesPrice = priceFilter === 'all' || activity.priceRange === priceFilter;

    return matchesSearch && matchesCategory && matchesPrice;
  });

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Activity Library</h3>
        
        {/* Search */}
        <div className="relative mb-4">
          <Icon name="MagnifyingGlassIcon" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search activities, tags, or locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />

        </div>

        {/* Price Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {priceRanges.map((range) =>
          <button
            key={range.id}
            onClick={() => setPriceFilter(range.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-smooth ${
            priceFilter === range.id ?
            'bg-primary text-primary-foreground' :
            'bg-muted text-muted-foreground hover:bg-muted/80'}`
            }>

              {range.label}
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-3 border-b border-border overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((category) =>
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-smooth ${
            activeCategory === category.id ?
            'bg-primary text-primary-foreground' :
            'bg-muted text-muted-foreground hover:bg-muted/80'}`
            }>

              <Icon name={category.icon as any} size={16} />
              <span>{category.label}</span>
            </button>
          )}
        </div>
      </div>

      {/* Activities List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredActivities.length === 0 ?
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icon name="MagnifyingGlassIcon" size={48} className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No activities found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
          </div> :

        filteredActivities.map((activity) =>
        <div
          key={activity.id}
          className="bg-background rounded-lg border border-border p-3 hover:shadow-elevation-2 transition-smooth cursor-pointer"
          onClick={() => onActivitySelect(activity)}>

              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                  <AppImage
                src={activity.image}
                alt={activity.alt}
                className="w-full h-full object-cover" />

                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-foreground text-sm line-clamp-1">{activity.name}</h4>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <Icon name="StarIcon" size={14} className="text-warning" variant="solid" />
                      <span className="text-xs font-medium text-foreground">{activity.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                    <div className="flex items-center space-x-1">
                      <Icon name="MapPinIcon" size={12} />
                      <span className="line-clamp-1">{activity.location}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Icon name="ClockIcon" size={12} />
                      <span>{activity.duration} min</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">${activity.price}</span>
                    <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onActivitySelect(activity);
                  }}
                  className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-smooth">

                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )
        }
      </div>
    </div>);

};

export default ActivityLibrary;