'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface FilterOption {
  label: string;
  value: string;
}

interface RequestFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  onSearchChange: (search: string) => void;
}

export interface FilterState {
  status: string;
  priority: string;
  sortBy: string;
}

const RequestFilters = ({ onFilterChange, onSearchChange }: RequestFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    priority: 'all',
    sortBy: 'newest',
  });
  const [searchTerm, setSearchTerm] = useState('');

  const statusOptions: FilterOption[] = [
    { label: 'All Status', value: 'all' },
    { label: 'New', value: 'new' },
    { label: 'In Review', value: 'in-review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Booked', value: 'booked' },
  ];

  const priorityOptions: FilterOption[] = [
    { label: 'All Priority', value: 'all' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ];

  const sortOptions: FilterOption[] = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Budget: High to Low', value: 'budget-desc' },
    { label: 'Budget: Low to High', value: 'budget-asc' },
    { label: 'Departure Date', value: 'departure' },
  ];

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearchChange(value);
  };

  const handleClearFilters = () => {
    const defaultFilters: FilterState = {
      status: 'all',
      priority: 'all',
      sortBy: 'newest',
    };
    setFilters(defaultFilters);
    setSearchTerm('');
    onFilterChange(defaultFilters);
    onSearchChange('');
  };

  const hasActiveFilters = filters.status !== 'all' || filters.priority !== 'all' || searchTerm !== '';

  return (
    <div className="bg-card rounded-lg border border-border p-4 mb-6 shadow-elevation-1">
      {/* Search Bar */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex-1 relative">
          <Icon 
            name="MagnifyingGlassIcon" 
            size={20} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search by customer name, destination, or request ID..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-smooth"
          />
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-smooth"
        >
          <Icon name="AdjustmentsHorizontalIcon" size={20} />
          <span className="hidden sm:inline text-sm font-medium">Filters</span>
          <Icon 
            name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'} 
            size={16} 
            className="text-muted-foreground"
          />
        </button>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="caption text-xs font-medium text-muted-foreground mb-2 block">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-smooth"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="caption text-xs font-medium text-muted-foreground mb-2 block">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-smooth"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="caption text-xs font-medium text-muted-foreground mb-2 block">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-smooth"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={handleClearFilters}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-smooth"
              >
                <Icon name="XMarkIcon" size={16} />
                <span>Clear All Filters</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RequestFilters;