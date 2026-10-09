'use client';

import React, { useState, useEffect } from 'react';
import { PlanForm } from '@/components/PlanForm';
import { PocketCard } from '@/components/PocketCard';
import { VoiceNotes } from '@/components/VoiceNotes';
import { StreakBar } from '@/components/StreakBar';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { OutingPlan } from '@/lib/planner';
import { WeatherSummary } from '@/lib/weather';
import { loadLatestPlan, saveLatestPlan, SavedPlanRecord } from '@/lib/storage';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'plan' | 'card' | 'notes'>('plan');
  const [currentPlan, setCurrentPlan] = useState<OutingPlan | null>(null);
  const [currentWeather, setCurrentWeather] = useState<WeatherSummary | undefined>(undefined);
  const [currentLocationName, setCurrentLocationName] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSavedPlan, setHasSavedPlan] = useState(false);

  // Load any previously saved plan from localStorage on first render
  useEffect(() => {
    const saved = loadLatestPlan();
    if (saved && saved.plan) {
      setHasSavedPlan(true);
      // If we don't have an active plan in state, preload it
      setCurrentPlan(saved.plan);
      setCurrentWeather(saved.weather);
      setCurrentLocationName(saved.locationName || '');
      setIsSaved(true);
    }
  }, []);

  const handlePlanGenerated = (
    plan: OutingPlan,
    weather: WeatherSummary,
    locationName: string
  ) => {
    setCurrentPlan(plan);
    setCurrentWeather(weather);
    setCurrentLocationName(locationName);
    setIsSaved(true);
    setHasSavedPlan(true);
    // Automatically save new plan to pocket
    saveLatestPlan(plan, weather, locationName);
    // Switch view to pocket card
    setActiveTab('card');
  };

  const handleSaveToPocket = () => {
    if (currentPlan) {
      saveLatestPlan(currentPlan, currentWeather, currentLocationName);
      setIsSaved(true);
      setHasSavedPlan(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[#ded9cc]">
      <ServiceWorkerRegister />

      {/* Main Page Header */}
      <header className="no-print border-b border-[#ded9cc] px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-2xl tracking-tight text-[#1c1b18]">
                Step Out
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#656259] pt-1">
                Field edition
              </span>
            </div>
            <p className="text-xs text-[#656259] mt-0.5">
              Plan in under a minute, then put the phone away.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <StreakBar />
          </div>
        </div>

        {/* Minimal Navigation Bar */}
        <div className="max-w-2xl mx-auto mt-4 pt-2 border-t border-[#ede8dd] flex items-center justify-between text-xs font-mono">
          <nav aria-label="Main Navigation" className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-3 py-1.5 rounded-xs transition-colors ${
                activeTab === 'plan'
                  ? 'bg-[#274c3d] text-[#f7f4ed]'
                  : 'text-[#545046] hover:text-[#1c1b18]'
              }`}
            >
              Plan an outing
            </button>

            {currentPlan && (
              <button
                onClick={() => setActiveTab('card')}
                className={`px-3 py-1.5 rounded-xs transition-colors ${
                  activeTab === 'card'
                    ? 'bg-[#274c3d] text-[#f7f4ed]'
                    : 'text-[#545046] hover:text-[#1c1b18]'
                }`}
              >
                Pocket card {hasSavedPlan && '•'}
              </button>
            )}

            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-xs transition-colors ${
                activeTab === 'notes'
                  ? 'bg-[#274c3d] text-[#f7f4ed]'
                  : 'text-[#545046] hover:text-[#1c1b18]'
              }`}
            >
              Voice notes
            </button>
          </nav>

          {currentPlan && activeTab === 'plan' && (
            <button
              onClick={() => setActiveTab('card')}
              className="text-[#274c3d] hover:underline underline-offset-2 text-[11px]"
            >
              View current card →
            </button>
          )}
        </div>
      </header>

      {/* Main Body Content */}
      <main className="grow px-4 sm:px-6 py-8 sm:py-10">
        <div className="max-w-2xl mx-auto">
          {activeTab === 'plan' && (
            <div className="space-y-6">
              <PlanForm
                onPlanGenerated={handlePlanGenerated}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            </div>
          )}

          {activeTab === 'card' && currentPlan && (
            <div>
              <PocketCard
                plan={currentPlan}
                weather={currentWeather}
                locationName={currentLocationName}
                isSaved={isSaved}
                onSave={handleSaveToPocket}
                onNewPlan={() => setActiveTab('plan')}
              />
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <VoiceNotes
                locationContext={currentLocationName || currentPlan?.where}
                weatherContext={currentWeather ? `${currentWeather.condition}, ${currentWeather.temperatureC}°C` : undefined}
                moodContext={currentPlan ? 'outing' : undefined}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-[#ded9cc] px-4 sm:px-6 py-4 mt-8 text-xs text-[#787469] font-mono">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>
            Step Out • Open-weight AI: Llama 3.3 70B &amp; Whisper Large v3
          </span>
          <div className="flex gap-3">
            <span>Groq &amp; Ollama compatible</span>
            <span>•</span>
            <span>No tracking</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
