import { z } from 'zod';
import { getLlmClient, PLAN_MODEL } from './groq';
import { PlaceItem } from './places';
import { WeatherSummary } from './weather';

// Planner output schema mandated by specification
export const PlanSchema = z.object({
  title: z.string().describe('3-6 words, specific, not cute'),
  where: z.string().describe('must match a provided place name'),
  distance_km: z.number().describe('approximate distance in km'),
  duration_min: z.number().describe('total outing minutes'),
  leave_by: z.string().describe('local time, before sunset/rain e.g. 17:15'),
  route: z.array(z.string()).min(2).max(6).describe('3-5 short plain steps'),
  look_for: z.array(z.string()).min(2).max(4).describe('3 things, season-aware'),
  bring: z.array(z.string()).min(1).max(4).describe('max 4 essentials'),
  if_it_rains: z.string().describe('one sentence contingency'),
});

export type OutingPlan = z.infer<typeof PlanSchema>;

export type Mood = 'easy' | 'energetic' | 'curious' | 'quiet';

export interface PlanRequest {
  lat: number;
  lng: number;
  locationName?: string;
  durationMinutes: number; // 30 to 240
  mood: Mood;
  places: PlaceItem[];
  weather: WeatherSummary;
}

export function generateFallbackPlan(req: PlanRequest): OutingPlan {
  const chosenPlace = req.places[0]?.name || 'Local Neighborhood Loop';
  const pace = req.mood === 'energetic' ? 5.5 : 3.8; // km/h
  const dist = parseFloat(((req.durationMinutes / 60) * pace).toFixed(1));

  // Determine a realistic leave-by time before sunset
  let leaveBy = 'Right now';
  if (req.weather.sunsetTime) {
    const [h, m] = req.weather.sunsetTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const sunsetMinutes = h * 60 + m;
      const targetMinutes = sunsetMinutes - req.durationMinutes - 15;
      const leaveH = Math.max(7, Math.floor(targetMinutes / 60));
      const leaveM = Math.max(0, targetMinutes % 60);
      leaveBy = `${String(leaveH).padStart(2, '0')}:${String(leaveM).padStart(2, '0')}`;
    }
  }

  const moodRoutes: Record<Mood, string[]> = {
    easy: [
      `Head toward ${chosenPlace} via the sunniest side of the street`,
      'Do an unhurried single circuit around the open perimeter',
      'Sit on the bench near the trees for five quiet minutes',
      'Take the parallel street back home',
    ],
    energetic: [
      `Brisk stride straight out to ${chosenPlace}`,
      'Pick up tempo along the longest unbroken pathway',
      'Loop twice or take the uphill side',
      'Cool down walk on the final four blocks',
    ],
    curious: [
      `Walk toward ${chosenPlace}, staying on whatever path looks least familiar`,
      'Notice the oldest trees and inspect any bark or fungi along the base',
      'Cut through the small connecting lane or footway',
      'Return keeping count of bird calls',
    ],
    quiet: [
      `Slip out along the low-traffic residential lane toward ${chosenPlace}`,
      'Find the quietest edge away from road noise',
      'Walk without headphones, watching the shifting light',
      'Gentle pace back home',
    ],
  };

  return {
    title: `${req.mood.charAt(0).toUpperCase() + req.mood.slice(1)} Walk Around ${chosenPlace.split(',')[0]}`,
    where: chosenPlace,
    distance_km: Math.max(1.0, dist),
    duration_min: req.durationMinutes,
    leave_by: leaveBy,
    route: moodRoutes[req.mood] || moodRoutes.easy,
    look_for: [
      'October tree crowns turning amber and shedding leaves',
      'Flocks of small birds darting low before dusk',
      'Long golden evening shadows stretching across the pavement',
    ],
    bring: [
      'Sturdy shoes',
      'Water bottle',
      req.weather.isRaining || req.weather.rainChancePercent > 40 ? 'Light rain jacket' : 'Warm layer for twilight',
    ],
    if_it_rains: req.weather.isRaining
      ? 'Drizzle is already falling; duck under the tree canopy or cut the loop in half.'
      : 'Step under the nearest sheltered awning or head straight back via the shortest road.',
  };
}

export async function createPlan(req: PlanRequest): Promise<OutingPlan> {
  const availablePlaceNames = req.places.map((p) => `${p.name} (${p.kind}, ~${p.distanceKm} km away)`);
  const placesPromptList = availablePlaceNames.join('\n- ');

  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());

  const systemPrompt = `You are Step Out, a minimalist outdoor outing planner.
CRITICAL RULES:
1. Pick exactly ONE destination from the provided list of real nearby places. You MUST NEVER invent place names or landmarks. If only generic places are given, use them exactly.
2. The user has ${req.durationMinutes} minutes. The outing must comfortably fit this duration.
3. Mood requested: "${req.mood}". Tailor pace and route steps to this mood.
4. Output strict JSON matching the schema.
5. Be concrete, concise, grounded, and slightly dry. No hype, no "embark on a journey", no emojis, no exclamation marks.
6. Season awareness: It is ${currentMonth}. Mention authentic seasonal details in "look_for".
7. Max 120 words total across all fields.
8. If local data is thin, keep it simple and honest.`;

  const userPrompt = `User details:
- Time available: ${req.durationMinutes} minutes
- Mood: ${req.mood}
- Current weather: ${req.weather.temperatureC}°C (${req.weather.temperatureF}°F), ${req.weather.condition}, rain chance ${req.weather.rainChancePercent}%
- Local sunset: ${req.weather.sunsetTime}
- Candidate places nearby:
- ${placesPromptList || 'Neighborhood quiet streets and local green paths'}

Generate a single plan adhering to this JSON structure:
{
  "title": "3-6 words, specific, not cute",
  "where": "must match one provided place name exactly",
  "distance_km": number,
  "duration_min": ${req.durationMinutes},
  "leave_by": "HH:MM time before sunset or rain",
  "route": ["step 1", "step 2", "step 3", "step 4"],
  "look_for": ["item 1", "item 2", "item 3"],
  "bring": ["item 1", "item 2", "item 3"],
  "if_it_rains": "one plain sentence"
}`;

  // Try LLM call, retry once if zod parsing fails, otherwise return fallback plan
  const llm = getLlmClient();

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const completion = await llm.chat.completions.create({
        model: PLAN_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 600,
      });

      const rawText = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(rawText);
      const validated = PlanSchema.safeParse(parsed);

      if (validated.success) {
        return validated.data;
      }
      // If validation failed on attempt 1, loop will retry
    } catch (err: any) {
      // e.g. API key missing or network dropped; continue to attempt 2 or fallback
      if (attempt === 2) break;
    }
  }

  // Graceful fallback plan ensuring user always gets a valid pocket card
  return generateFallbackPlan(req);
}
