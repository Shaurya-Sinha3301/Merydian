'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface AgentNavigationProps {
  className?: string;
}

const AgentNavigation = ({ className = '' }: AgentNavigationProps) => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/agent-dashboard',
      icon: 'HomeIcon',
      description: 'Overview and request management',
    },
    {
      label: 'Review Requests',
      path: '/agent-request-review',
      icon: 'ClipboardDocumentCheckIcon',
      description: 'Analyze and assess trip requests',
    },
    {
      label: 'Edit Itineraries',
      path: '/agent-itinerary-editor',
      icon: 'PencilSquareIcon',
      description: 'Modify and optimize itineraries',
    },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <header className={`sticky top-0 z-100 bg-card shadow-elevation-2 ${className}`}>
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/agent-dashboard" className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Icon name="GlobeAltIcon" size={24} className="text-primary-foreground" variant="solid" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-xl font-semibold text-foreground">TripCraft</span>
              <span className="caption text-muted-foreground text-xs">Agent Portal</span>
            </div>
          </Link>

          {/* Desktop Navigation Items */}
          <div className="hidden md:flex md:items-center md:space-x-2">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`group relative flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium transition-smooth ${
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon name={item.icon as any} size={20} variant={isActive(item.path) ? 'solid' : 'outline'} />
                <span>{item.label}</span>
                {isActive(item.path) && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-foreground" />
                )}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden rounded-md p-2 text-foreground hover:bg-muted transition-smooth"
            aria-label="Toggle menu"
          >
            <Icon name={isMobileMenuOpen ? 'XMarkIcon' : 'Bars3Icon'} size={24} />
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 rounded-md px-3 py-3 text-base font-medium transition-smooth ${
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <Icon name={item.icon as any} size={24} variant={isActive(item.path) ? 'solid' : 'outline'} />
                <div className="flex flex-col">
                  <span>{item.label}</span>
                  <span className="text-xs opacity-75">{item.description}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default AgentNavigation;