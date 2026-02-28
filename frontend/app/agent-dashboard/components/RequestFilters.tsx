import React from 'react';

export interface FilterState {
    status: string;
    priority: string;
    sortBy: string;
}

interface RequestFiltersProps {
    onFilterChange: (filters: FilterState) => void;
    onSearchChange: (search: string) => void;
}

const RequestFilters: React.FC<RequestFiltersProps> = ({ onFilterChange, onSearchChange }) => {
    return (
        <div className="bg-card p-4 rounded-lg flex gap-4 items-center">
            <input
                type="text"
                placeholder="Search requests..."
                className="border p-2 rounded w-full max-w-sm"
                onChange={(e) => onSearchChange(e.target.value)}
            />
            <div>Request Filters Component Placeholder</div>
        </div>
    );
};

export default RequestFilters;
