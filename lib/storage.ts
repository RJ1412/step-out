import { OutingPlan } from './planner';
import { JournalEntry } from './notes';
import { WeatherSummary } from './weather';

export interface SavedPlanRecord {
  id: string;
  savedAt: string; // ISO date
  plan: OutingPlan;
  weather?: WeatherSummary;
  locationName?: string;
  completed?: boolean;
}

const STORAGE_KEY_PLAN = 'stepout_latest_plan';
const STORAGE_KEY_JOURNAL = 'stepout_journal_entries';
const STORAGE_KEY_DAYS = 'stepout_days_active';

export function saveLatestPlan(
  plan: OutingPlan,
  weather?: WeatherSummary,
  locationName?: string
): SavedPlanRecord {
  if (typeof window === 'undefined') {
    return { id: 'temp', savedAt: new Date().toISOString(), plan, weather, locationName };
  }

  const record: SavedPlanRecord = {
    id: `plan-${Date.now()}`,
    savedAt: new Date().toISOString(),
    plan,
    weather,
    locationName,
  };

  try {
    localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(record));
    recordDayActive(new Date());
  } catch (err) {
    console.warn('Failed saving plan to localStorage:', err);
  }

  return record;
}

export function loadLatestPlan(): SavedPlanRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAN);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadJournalEntries(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_JOURNAL);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveJournalEntry(entry: JournalEntry): JournalEntry[] {
  if (typeof window === 'undefined') return [entry];
  try {
    const current = loadJournalEntries();
    // Prepend newer entry
    const updated = [entry, ...current.filter((e) => e.id !== entry.id)];
    localStorage.setItem(STORAGE_KEY_JOURNAL, JSON.stringify(updated));
    recordDayActive(new Date(entry.recorded_at));
    return updated;
  } catch (err) {
    console.warn('Failed saving journal entry:', err);
    return [];
  }
}

export function deleteJournalEntry(id: string): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = loadJournalEntries();
    const updated = current.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY_JOURNAL, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

// Track unique calendar days active (YYYY-MM-DD)
export function recordDayActive(date = new Date()): void {
  if (typeof window === 'undefined') return;
  try {
    const ymd = date.toISOString().split('T')[0];
    const raw = localStorage.getItem(STORAGE_KEY_DAYS);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add(ymd);
    localStorage.setItem(STORAGE_KEY_DAYS, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

// Returns the plain count of unique days outside in current calendar month
export function getDaysOutsideThisMonth(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DAYS);
    if (!raw) return 0;
    const days: string[] = JSON.parse(raw);
    const now = new Date();
    const currentPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return days.filter((d) => d.startsWith(currentPrefix)).length;
  } catch {
    return 0;
  }
}

// Export journal as a clean readable Markdown file
export function exportJournalToMarkdown(entries: JournalEntry[]): void {
  if (typeof window === 'undefined' || entries.length === 0) return;

  const lines: string[] = [
    '# Step Out - Field Notes & Trail Journal',
    `Exported on ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`,
    '',
    '---',
    '',
  ];

  for (const entry of entries) {
    const dateFormatted = new Date(entry.recorded_at).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    lines.push(`## ${dateFormatted}`);
    lines.push('');
    lines.push(`> ${entry.tidied_note}`);
    lines.push('');

    const tagParts: string[] = [];
    if (entry.tags.species?.length) tagParts.push(`**Species:** ${entry.tags.species.join(', ')}`);
    if (entry.tags.place?.length) tagParts.push(`**Place:** ${entry.tags.place.join(', ')}`);
    if (entry.tags.weather?.length) tagParts.push(`**Weather:** ${entry.tags.weather.join(', ')}`);
    if (entry.tags.mood?.length) tagParts.push(`**Mood:** ${entry.tags.mood.join(', ')}`);

    if (tagParts.length > 0) {
      lines.push(tagParts.join(' | '));
      lines.push('');
    }

    if (entry.raw_transcript && entry.raw_transcript !== entry.tidied_note) {
      lines.push(`*Spoken audio note:* "${entry.raw_transcript}"`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `step-out-journal-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
