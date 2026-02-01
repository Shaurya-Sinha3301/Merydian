'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface WorkflowTab {
  label: string;
  path: string;
  icon: string;
  description: string;
}

interface AgentWorkflowTabsProps {
  requestId?: string;
  hasUnsavedChanges?: boolean;
  onTabChange?: (path: string) => void;
  className?: string;
}

const AgentWorkflowTabs = ({
  requestId,
  hasUnsavedChanges = false,
  onTabChange,
  className = '',
}: AgentWorkflowTabsProps) => {
  const pathname = usePathname();
  const [showWarning, setShowWarning] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const tabs: WorkflowTab[] = [
    {
      label: 'Review',
      path: '/agent-request-review',
      icon: 'ClipboardDocumentCheckIcon',
      description: 'Analyze request details',
    },
    {
      label: 'Edit',
      path: '/optimizer',
      icon: 'PencilSquareIcon',
      description: 'Modify itinerary',
    },
  ];

  const isActive = (path: string) => pathname === path;

  const handleTabClick = (e: React.MouseEvent, path: string) => {
    if (hasUnsavedChanges && path !== pathname) {
      e.preventDefault();
      setPendingPath(path);
      setShowWarning(true);
    } else {
      onTabChange?.(path);
    }
  };

  const confirmNavigation = () => {
    if (pendingPath) {
      onTabChange?.(pendingPath);
      window.location.href = pendingPath;
    }
    setShowWarning(false);
    setPendingPath(null);
  };

  const cancelNavigation = () => {
    setShowWarning(false);
    setPendingPath(null);
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <>
      <div className={`bg-card border-b border-border ${className}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Desktop Tabs */}
          <div className="hidden md:flex md:items-center md:space-x-1 py-2">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                href={requestId ? `${tab.path}?id=${requestId}` : tab.path}
                onClick={(e) => handleTabClick(e, tab.path)}
                className={`group relative flex items-center space-x-2 rounded-md px-4 py-2.5 text-sm font-medium transition-smooth ${isActive(tab.path)
                    ? 'bg-primary text-primary-foreground shadow-elevation-1'
                    : 'text-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                <Icon name={tab.icon as any} size={18} variant={isActive(tab.path) ? 'solid' : 'outline'} />
                <span>{tab.label}</span>
                {isActive(tab.path) && hasUnsavedChanges && (
                  <div className="flex h-2 w-2 items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                  </div>
                )}
              </Link>
            ))}
            {hasUnsavedChanges && (
              <div className="ml-4 flex items-center space-x-2 text-warning">
                <Icon name="ExclamationTriangleIcon" size={16} variant="solid" />
                <span className="caption text-xs">Unsaved changes</span>
              </div>
            )}
          </div>

          {/* Mobile Dropdown */}
          <div className="md:hidden py-3">
            <select
              value={pathname}
              onChange={(e) => {
                const path = e.target.value;
                if (hasUnsavedChanges && path !== pathname) {
                  setPendingPath(path);
                  setShowWarning(true);
                } else {
                  window.location.href = requestId ? `${path}?id=${requestId}` : path;
                }
              }}
              className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {tabs.map((tab) => (
                <option key={tab.path} value={tab.path}>
                  {tab.label} - {tab.description}
                </option>
              ))}
            </select>
            {hasUnsavedChanges && (
              <div className="mt-2 flex items-center space-x-2 text-warning">
                <Icon name="ExclamationTriangleIcon" size={16} variant="solid" />
                <span className="caption text-xs">You have unsaved changes</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background" onClick={cancelNavigation} />
          <div className="relative bg-card rounded-lg shadow-elevation-4 max-w-md w-full p-6 animate-slide-in-from-top">
            <div className="flex items-start space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <Icon name="ExclamationTriangleIcon" size={24} className="text-warning" variant="solid" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">Unsaved Changes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You have unsaved changes that will be lost if you navigate away. Are you sure you want to continue?
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={confirmNavigation}
                    className="flex-1 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-smooth"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={cancelNavigation}
                    className="flex-1 rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-smooth"
                  >
                    Keep Editing
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AgentWorkflowTabs;