'use client';

import React, { useState, useEffect } from 'react';
import { Mood, OutingPlan } from '@/lib/planner';
import { WeatherSummary } from '@/lib/weather';

interface PlanFormProps {
  onPlanGenerated: (plan: OutingPlan, weather: WeatherSummary, locationName: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const TIME_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '90 min' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
];

const MOODS: { id: Mood; title: string; note: string }[] = [
  { id: 'easy', title: 'Easy', note: 'Flat, unhurried, benches' },
  { id: 'energetic', title: 'Energetic', note: 'Brisk pace, long strides' },
  { id: 'curious', title: 'Curious', note: 'Small lanes, older trees, details' },
  { id: 'quiet', title: 'Quiet', note: 'Low traffic, dusk shadows, space' },
];

export function PlanForm({ onPlanGenerated, isLoading, setIsLoading }: PlanFormProps) {
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingStatus, setLocatingStatus] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [mood, setMood] = useState<Mood>('easy');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState('Checking the sky...');

  // Cycle calm progress text while fetching real weather and places
  useEffect(() => {
    if (!isLoading) return;
    const phases = [
      'Reading current weather and sunset...',
      'Scanning local footways and green space...',
      'Assembling a single clean outing...',
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % phases.length;
      setLoadingPhase(phases[idx]);
    }, 2200);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser. Type your city or park instead.');
      return;
    }

    setLocatingStatus('Locating...');
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocationText(`Around here (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
        setLocatingStatus(null);
      },
      (err) => {
        setLocatingStatus(null);
        if (err.code === 1) {
          setErrorMessage('Location permission denied. Enter a place or neighborhood below.');
        } else {
          setErrorMessage('Could not determine current position. Please type a place.');
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const payload: any = {
        durationMinutes,
        mood,
      };

      if (coords && locationText.includes('Around here')) {
        payload.lat = coords.lat;
        payload.lng = coords.lng;
      } else if (locationText.trim().length > 0) {
        payload.locationName = locationText.trim();
      } else if (coords) {
        payload.lat = coords.lat;
        payload.lng = coords.lng;
      } else {
        // Fallback default coordinates if user left blank
        payload.locationName = 'Greenwich Park, London';
      }

      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to build an outing');
      }

      onPlanGenerated(data.plan, data.weather, data.location?.name || locationText || 'Local area');
    } catch (err: any) {
      setErrorMessage(err.message || 'Something broke while planning. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Button label formatting
  const timeLabel =
    durationMinutes === 60
      ? 'my hour'
      : durationMinutes === 120
      ? 'my 2 hours'
      : durationMinutes === 180
      ? 'my 3 hours'
      : durationMinutes === 240
      ? 'my 4 hours'
      : `my ${durationMinutes} min`;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto space-y-7">
      {/* 1. Location field */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="location-input" className="text-sm font-medium text-[#1c1b18]">
            Where are you starting from?
          </label>
          <button
            type="button"
            id="btn-use-location"
            onClick={handleUseMyLocation}
            className="text-xs font-mono text-[#274c3d] hover:text-[#183127] underline underline-offset-2 transition-colors"
          >
            {locatingStatus || 'Use current location'}
          </button>
        </div>

        <input
          id="location-input"
          type="text"
          value={locationText}
          onChange={(e) => {
            setLocationText(e.target.value);
            // clear cached gps if user edits manually
            if (coords && !e.target.value.includes('Around here')) {
              setCoords(null);
            }
          }}
          placeholder="e.g. Richmond Park, or 12th St & Elm, or leave blank"
          className="w-full px-3.5 py-2.5 bg-white border border-[#ded9cc] text-[#1c1b18] placeholder-[#948f82] text-sm focus:outline-none focus:border-[#274c3d] rounded-xs"
        />
        <p className="text-[12px] text-[#787469]">
          Checked against OpenStreetMap and Open-Meteo for real dusk times and footways.
        </p>
      </div>

      {/* 2. Free time selector */}
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-medium text-[#1c1b18]">
            Free time today
          </label>
          <span className="text-xs font-mono text-[#656259]">
            {durationMinutes >= 60 ? `${durationMinutes / 60}h` : `${durationMinutes}m`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDurationMinutes(opt.value)}
              className={`px-3 py-1.5 text-xs font-mono rounded-xs border transition-colors ${
                durationMinutes === opt.value
                  ? 'bg-[#274c3d] text-[#f7f4ed] border-[#274c3d]'
                  : 'bg-white border-[#ded9cc] text-[#423f38] hover:border-[#aaa393]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Mood selector */}
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-[#1c1b18] block">
          Pace and mood
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          {MOODS.map((m) => {
            const isSelected = mood === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMood(m.id)}
                className={`text-left p-3 border rounded-xs transition-all ${
                  isSelected
                    ? 'bg-[#f4efe4] border-[#274c3d] ring-1 ring-[#274c3d]'
                    : 'bg-white border-[#ded9cc] hover:border-[#b8b1a0]'
                }`}
              >
                <div className="text-sm font-medium text-[#1c1b18] font-heading">
                  {m.title}
                </div>
                <div className="text-[11px] text-[#656259] mt-0.5 leading-snug">
                  {m.note}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-3 bg-[#faede6] border border-[#e2b7a3] text-xs text-[#8c3218] rounded-xs">
          {errorMessage}
        </div>
      )}

      {/* Primary Action Button */}
      <div className="pt-2">
        <button
          type="submit"
          id="btn-plan-outing"
          disabled={isLoading}
          className="w-full py-3 px-5 bg-[#274c3d] hover:bg-[#1e3b2f] text-[#f7f4ed] text-base font-medium rounded-xs border border-[#274c3d] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="font-mono text-xs">{loadingPhase}</span>
          ) : (
            <span>Plan {timeLabel}</span>
          )}
        </button>

        <div className="mt-2 text-center">
          <span className="text-[11px] text-[#858074] font-mono">
            Plan in under a minute • Phone in pocket
          </span>
        </div>
      </div>
    </form>
  );
}
