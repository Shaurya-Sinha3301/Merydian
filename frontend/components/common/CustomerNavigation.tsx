'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface CustomerNavigationProps {
  className?: string;
}

const CustomerNavigation = ({ className = '' }: CustomerNavigationProps) => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    {
      label: 'My Trip Request',
      path: '/customer-trip-request',
      icon: 'DocumentTextIcon',
      description: 'Create and manage your trip preferences',
    },
    {
      label: 'My Itinerary',
      path: '/customer-itinerary-view',
      icon: 'MapIcon',
      description: 'View and modify your travel itinerary',
    },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Desktop Navigation */}
      <header className={`sticky top-0 z-100 neu-flat shadow-neu-md ${className}`}>
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/customer-trip-request" className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-neu-sm">
                <Icon name="GlobeAltIcon" size={24} className="text-primary-foreground" variant="solid" />
              </div>
              <span className="font-heading text-xl font-semibold text-foreground">TripCraft</span>
            </Link>

            {/* Desktop Navigation Items */}
            <div className="hidden md:flex md:items-center md:space-x-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`group relative flex items-center space-x-2 rounded-2xl px-4 py-2 text-sm font-medium transition-smooth ${
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground shadow-neu-sm'
                      : 'text-foreground neu-button'
                  }`}
                >
                  <Icon name={item.icon as any} size={20} variant={isActive(item.path) ? 'solid' : 'outline'} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden rounded-xl p-2 text-foreground neu-button transition-smooth"
              aria-label="Toggle menu"
            >
              <Icon name={isMobileMenuOpen ? 'XMarkIcon' : 'Bars3Icon'} size={24} />
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border/50">
            <div className="space-y-1 px-4 pb-3 pt-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 rounded-2xl px-3 py-3 text-base font-medium transition-smooth ${
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground shadow-neu-sm'
                      : 'text-foreground neu-button'
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

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-100 neu-flat border-t border-border/50 shadow-neu-lg">
        <div className="flex items-center justify-around px-4 py-2">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-2xl transition-smooth ${
                isActive(item.path)
                  ? 'text-primary' :'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={item.icon as any} size={24} variant={isActive(item.path) ? 'solid' : 'outline'} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default CustomerNavigation;