'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: string;
}

interface NavigationBreadcrumbsProps {
  customBreadcrumbs?: BreadcrumbItem[];
  requestContext?: {
    customerName?: string;
    destination?: string;
    requestId?: string;
  };
  className?: string;
}

const NavigationBreadcrumbs = ({
  customBreadcrumbs,
  requestContext,
  className = '',
}: NavigationBreadcrumbsProps) => {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customBreadcrumbs) return customBreadcrumbs;

    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', path: '/agent-dashboard', icon: 'HomeIcon' },
    ];

    if (pathname.includes('/agent-request-review')) {
      breadcrumbs.push({
        label: requestContext?.customerName || 'Request Review',
        path: '/agent-request-review',
        icon: 'ClipboardDocumentCheckIcon',
      });
    }

    if (pathname.includes('/agent-itinerary-editor')) {
      if (requestContext?.customerName) {
        breadcrumbs.push({
          label: requestContext.customerName,
          path: '/agent-request-review',
        });
      }
      breadcrumbs.push({
        label: requestContext?.destination || 'Edit Itinerary',
        path: '/agent-itinerary-editor',
        icon: 'PencilSquareIcon',
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className={`bg-background border-b border-border ${className}`} aria-label="Breadcrumb">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        {/* Desktop Breadcrumbs */}
        <ol className="hidden md:flex items-center space-x-2 text-sm">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const isFirst = index === 0;

            return (
              <li key={crumb.path} className="flex items-center">
                {!isFirst && (
                  <Icon
                    name="ChevronRightIcon"
                    size={16}
                    className="text-muted-foreground mx-2"
                  />
                )}
                {isLast ? (
                  <div className="flex items-center space-x-2">
                    {crumb.icon && (
                      <Icon
                        name={crumb.icon as any}
                        size={16}
                        className="text-foreground"
                        variant="solid"
                      />
                    )}
                    <span className="font-medium text-foreground">{crumb.label}</span>
                  </div>
                ) : (
                  <Link
                    href={crumb.path}
                    className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-smooth"
                  >
                    {crumb.icon && (
                      <Icon name={crumb.icon as any} size={16} />
                    )}
                    <span>{crumb.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>

        {/* Mobile Breadcrumbs */}
        <div className="md:hidden">
          {isExpanded ? (
            <div className="space-y-2">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <div key={crumb.path} className="flex items-center">
                    <div className="w-6 flex justify-center">
                      {index > 0 && (
                        <div className="w-0.5 h-4 bg-border" />
                      )}
                    </div>
                    {isLast ? (
                      <div className="flex items-center space-x-2 ml-2">
                        {crumb.icon && (
                          <Icon
                            name={crumb.icon as any}
                            size={18}
                            className="text-foreground"
                            variant="solid"
                          />
                        )}
                        <span className="font-medium text-foreground">{crumb.label}</span>
                      </div>
                    ) : (
                      <Link
                        href={crumb.path}
                        className="flex items-center space-x-2 ml-2 text-muted-foreground hover:text-foreground transition-smooth"
                      >
                        {crumb.icon && (
                          <Icon name={crumb.icon as any} size={18} />
                        )}
                        <span className="text-sm">{crumb.label}</span>
                      </Link>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => setIsExpanded(false)}
                className="flex items-center space-x-2 ml-8 text-sm text-primary hover:text-primary/80 transition-smooth"
              >
                <Icon name="ChevronUpIcon" size={16} />
                <span>Collapse</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center space-x-2 text-sm"
            >
              <Link
                href={breadcrumbs[0].path}
                className="text-muted-foreground hover:text-foreground transition-smooth"
              >
                {breadcrumbs[0].label}
              </Link>
              <Icon name="ChevronRightIcon" size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">...</span>
              <Icon name="ChevronRightIcon" size={16} className="text-muted-foreground" />
              <span className="font-medium text-foreground">
                {breadcrumbs[breadcrumbs.length - 1].label}
              </span>
              <Icon name="ChevronDownIcon" size={16} className="text-muted-foreground ml-1" />
            </button>
          )}
        </div>

        {/* Request Context Info */}
        {requestContext && (requestContext.customerName || requestContext.destination) && (
          <div className="mt-2 flex items-center space-x-4 text-xs text-muted-foreground">
            {requestContext.customerName && (
              <div className="flex items-center space-x-1">
                <Icon name="UserIcon" size={14} />
                <span>{requestContext.customerName}</span>
              </div>
            )}
            {requestContext.destination && (
              <div className="flex items-center space-x-1">
                <Icon name="MapPinIcon" size={14} />
                <span>{requestContext.destination}</span>
              </div>
            )}
            {requestContext.requestId && (
              <div className="flex items-center space-x-1">
                <Icon name="HashtagIcon" size={14} />
                <span className="data-text">{requestContext.requestId}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavigationBreadcrumbs;