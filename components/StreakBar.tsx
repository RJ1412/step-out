'use client';

import React, { useEffect, useState } from 'react';
import { getDaysOutsideThisMonth } from '@/lib/storage';

export function StreakBar() {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    setDays(getDaysOutsideThisMonth());
  }, []);

  if (days === null) return null;

  return (
    <div className="flex items-center gap-2 text-xs font-mono text-[#656259]">
      <span className="w-2 h-2 rounded-full bg-[#274c3d]" />
      <span>
        {days === 0
          ? '0 days outside this month'
          : days === 1
          ? '1 day outside this month'
          : `${days} days outside this month`}
      </span>
    </div>
  );
}
