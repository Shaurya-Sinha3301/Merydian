'use client';

import { ReactNode } from 'react';
import CustomerNavigation from './CustomerNavigation';
import AgentNavigation from './AgentNavigation';

type UserRole = 'customer' | 'agent';

interface RoleBasedNavigationProps {
  userRole: UserRole;
  children?: ReactNode;
  className?: string;
}

const RoleBasedNavigation = ({ 
  userRole, 
  children,
  className = '' 
}: RoleBasedNavigationProps) => {
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {userRole === 'customer' ? (
        <CustomerNavigation />
      ) : (
        <AgentNavigation />
      )}
      {children}
    </div>
  );
};

export default RoleBasedNavigation;