'use client';

import React, { useState } from 'react';
import { OutingPlan } from '@/lib/planner';
import { WeatherSummary } from '@/lib/weather';

interface PocketCardProps {
  plan: OutingPlan;
  weather?: WeatherSummary;
  locationName?: string;
  onNewPlan?: () => void;
  isSaved?: boolean;
  onSave?: () => void;
}

export function PocketCard({
  plan,
  weather,
  locationName,
  onNewPlan,
  isSaved = false,
  onSave,
}: PocketCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = [
      `STEP OUT — ${plan.title.toUpperCase()}`,
      `Where: ${plan.where}`,
      `Distance: ${plan.distance_km} km | Time: ${plan.duration_min} min | Leave by: ${plan.leave_by}`,
      '',
      'ROUTE:',
      ...plan.route.map((r, i) => `${i + 1}. ${r}`),
      '',
      'LOOK FOR:',
      ...plan.look_for.map((l) => `• ${l}`),
      '',
      'BRING:',
      plan.bring.join(', '),
      '',
      `RAIN PLAN: ${plan.if_it_rains}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Pocket card container */}
      <div className="pocket-card-print bg-[#fdfcf9] border border-[#ded9cc] p-6 sm:p-8 shadow-xs rounded-sm">
        {/* Top card header */}
        <div className="flex items-start justify-between border-b border-[#ded9cc] pb-4 mb-5">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-[#656259] font-mono">
              Pocket Card • {locationName || plan.where}
            </div>
            <h2 className="text-2xl sm:text-3xl text-[#1c1b18] leading-tight font-heading">
              {plan.title}
            </h2>
          </div>

          {/* Hand-drawn SVG Sun */}
          <div className="shrink-0 pl-3 pt-0.5" title="Sun / daylight indicator">
            <svg
              className="w-10 h-10 text-[#c05c31]"
              viewBox="0 0 40 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              {/* Hand-drawn sun circle */}
              <circle cx="20" cy="20" r="7.5" fill="#fdf0e6" stroke="#c05c31" strokeWidth="2" />
              {/* Uneven hand-drawn rays */}
              <line x1="20" y1="5" x2="20" y2="9" />
              <line x1="20" y1="31" x2="20" y2="35" />
              <line x1="5" y1="20" x2="9" y2="20" />
              <line x1="31" y1="20" x2="35" y2="20" />
              <line x1="9.5" y1="9.5" x2="12.5" y2="12.5" />
              <line x1="27.5" y1="27.5" x2="30.5" y2="30.5" />
              <line x1="9.5" y1="30.5" x2="12.5" y2="27.5" />
              <line x1="27.5" y1="12.5" x2="30.5" y2="9.5" />
            </svg>
          </div>
        </div>

        {/* Vital stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-[#ded9cc] text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#656259]">Leave by</div>
            <div className="font-mono text-base font-medium text-[#274c3d]">{plan.leave_by}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#656259]">Duration</div>
            <div className="font-mono text-base font-medium text-[#1c1b18]">{plan.duration_min} min</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#656259]">Distance</div>
            <div className="font-mono text-base font-medium text-[#1c1b18]">~{plan.distance_km} km</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#656259]">Weather</div>
            <div className="text-sm font-medium text-[#1c1b18]">
              {weather ? `${weather.temperatureC}°C • ${weather.condition}` : 'Clear'}
            </div>
          </div>
        </div>

        {/* Route Steps */}
        <div className="my-5">
          <div className="text-xs uppercase tracking-wider text-[#656259] font-mono mb-2.5">
            Trail & Waypoints
          </div>
          <ol className="space-y-2 text-[15px] leading-relaxed list-none pl-0">
            {plan.route.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="font-mono text-xs text-[#274c3d] pt-1 select-none shrink-0 w-4 font-bold">
                  {idx + 1}.
                </span>
                <span className="text-[#1c1b18]">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Look for & Bring columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-4 border-t border-[#ded9cc]">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#656259] font-mono mb-2">
              Notice Along the Way
            </div>
            <ul className="space-y-1.5 text-sm text-[#2c2a26]">
              {plan.look_for.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#c05c31] select-none shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-[#656259] font-mono mb-2">
              Pack Light
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {plan.bring.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-block bg-[#f2eee3] text-[#3d3a33] text-xs px-2.5 py-1 rounded-xs border border-[#ded9cc]"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="text-xs uppercase tracking-wider text-[#656259] font-mono mb-1">
              Rain Plan
            </div>
            <p className="text-xs text-[#524f46] italic leading-normal">
              {plan.if_it_rains}
            </p>
          </div>
        </div>

        {/* Footer line on card */}
        <div className="mt-4 pt-3 border-t border-dashed border-[#ded9cc] flex items-center justify-between text-[11px] text-[#787469] font-mono">
          <span>Target destination: {plan.where}</span>
          <span>Screen down • Outside now</span>
        </div>
      </div>

      {/* Action buttons (hidden on print) */}
      <div className="no-print mt-5 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              onClick={onSave}
              className={`px-4 py-2 text-sm rounded-xs border transition-colors ${
                isSaved
                  ? 'bg-[#e4ede7] border-[#274c3d] text-[#274c3d] font-medium'
                  : 'bg-[#274c3d] text-[#f7f4ed] border-[#274c3d] hover:bg-[#1f3d31]'
              }`}
            >
              {isSaved ? '✓ Saved to pocket' : 'Save to pocket'}
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-sm bg-white border border-[#ded9cc] text-[#1c1b18] hover:bg-[#f7f4ed] rounded-xs transition-colors"
            title="Print or save as PDF"
          >
            Print card
          </button>

          <button
            onClick={handleCopy}
            className="px-3 py-2 text-sm text-[#656259] hover:text-[#1c1b18] transition-colors"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {onNewPlan && (
          <button
            onClick={onNewPlan}
            className="text-xs font-mono text-[#656259] hover:text-[#1c1b18] underline underline-offset-4"
          >
            ← Change parameters
          </button>
        )}
      </div>
    </div>
  );
}
