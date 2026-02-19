'use client';

import FamilyDetailsCard from './FamilyDetailsCard';
import ChatBot from './ChatBot';

export default function RightSidebar() {
  return (
    <div className="sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto space-y-6 custom-scrollbar pr-2">

      {/* Family Details */}
      <FamilyDetailsCard />

    </div>
  );
}
