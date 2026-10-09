*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)*

# Step Out: An Open-Weight Outdoor Planner That Gets You Away From The Screen

## What I Built

Most outdoor and fitness apps do the opposite of what they promise: they try to keep your eyes glued to glass with leaderboards, feed scrolling, and badges while you are standing right in front of trees.

**Step Out** is built so the screen is the shortest part of the experience: plan an outing in under a minute, then put your phone in your pocket and step outside.

### Key Capabilities

1. **One-Minute Plan**: You enter a location (or tap "Use current location"), choose how much free time you have (30 minutes to 4 hours), and pick a pace (*Easy*, *Energetic*, *Curious*, or *Quiet*). In under 60 seconds, the app fetches live weather and sunset data from Open-Meteo, queries OpenStreetMap for real nearby footpaths, parks, and water bodies, and generates **one concrete pocket card**.
2. **Pocket Card**: A clean, single-page printable card designed for high contrast. It provides:
   - A realistic "leave by" time calculated to beat dusk or rain.
   - A 3-to-5 step route that selects only verified physical paths.
   - Season-aware things to notice along the way (autumn foliage, migratory birds, late dusk shadows).
   - What to pack (max 4 items) and a realistic rain contingency.
   - An offline-first design: saved to `localStorage` and cached by a custom service worker so it works with zero cellular signal on the trail.
3. **Voice Trail Notes**: While walking, you tap a big tactile button and speak naturally (*"saw a purple-rumped sunbird near the old oak, 6:40pm"*). Audio goes to Whisper, which transcribes it, and Llama tidies the transcript into a dated field journal entry with tags for species, place, weather, and mood. Notes live in the browser and export cleanly to Markdown.
4. **Streak Without Gamification**: A simple count of *"days outside this month"*. No badges, no XP points, and no confetti.

---

## Demo

- **60-Second Walkthrough**:

| Step | Action | Experience |
| :--- | :--- | :--- |
| **01. Plan** | Select "45 min", mood "Curious", starting near Richmond Park. | Aggregates OpenStreetMap footways + Open-Meteo sunset in parallel. |
| **02. Pocket Card** | Llama 3.3 70B produces the single card. | Displays leave-by time (e.g. 17:21), 4-step trail, and pack items. |
| **03. Pocket It** | Tap "Save to pocket" or "Print card". | Service worker caches the card; phone goes away. |
| **04. Voice Note** | On trail, tap "Talk to it", speak an observation, tap stop. | Whisper transcribes audio; Llama 3.1 8B extracts tags and field note. |
| **05. Export** | Tap "Export .md". | Produces a clean Markdown notebook of all field observations. |

The app is responsive down to 360px mobile viewports and includes `@media print` styling so you can print the card on index cards or paper before leaving.

---

## Code

The project is built with Next.js App Router, TypeScript, Tailwind CSS, Zod, and the OpenAI SDK (configured for Groq and local Ollama inference).

### Architecture Highlights

- **`lib/planner.ts`**: Validates LLM responses with a strict Zod schema (`response_format: { type: "json_object" }`). The system prompt instructs the model to pick only from real OpenStreetMap coordinates and never hallucinate places. If validation fails, it retries once before serving a deterministic fallback plan.
- **`lib/places.ts`**: Queries the OpenStreetMap Overpass API for `leisure=park|nature_reserve`, `natural=water|peak`, and `highway=path|footway` within 3 km. Implements a 24-hour cache on rounded coordinates and automatic failover across Overpass mirrors.
- **`lib/weather.ts`**: Queries Open-Meteo for real-time temperature, precipitation probability, and sunset time, adjusted to the coordinate's local timezone.
- **`lib/notes.ts`**: Accepts audio uploads (<= 25 MB), calls Whisper for speech-to-text, and uses Llama 3.1 8B to extract structured metadata (species, place, weather, mood).
- **`public/sw.js`**: Hand-written service worker that pre-caches the application shell so the pocket card remains available on remote trails with zero cellular signal.

```typescript
// Excerpt from lib/planner.ts: Enforcing structured, grounded outdoor plans
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
```

---

## How I Built It

Step Out runs exclusively on **open-weight AI models**:
- **`llama-3.3-70b-versatile`**: Used for route structuring, seasonal observation synthesis, and timing calculations.
- **`llama-3.1-8b-instant`**: Fast, lightweight model for tidying spoken audio notes and extracting structured taxonomy tags.
- **`whisper-large-v3-turbo`**: High-accuracy speech recognition for outdoor ambient voice recording.

### The Inference Abstraction

Instead of hardcoding a vendor SDK, the app uses Groq's OpenAI-compatible endpoint with model names and base URLs driven entirely by environment variables:

```bash
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_...
PLAN_MODEL=llama-3.3-70b-versatile
NOTES_MODEL=llama-3.1-8b-instant
STT_MODEL=whisper-large-v3-turbo
```

Switching to a completely private, offline setup requires changing only `.env.local`:

```bash
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
PLAN_MODEL=llama3.1:8b
NOTES_MODEL=llama3.1:8b
STT_BASE_URL=http://localhost:8000/v1
STT_MODEL=whisper-1
```

---

## Why Does Open Innovation Matter?

I chose open-weight models for Step Out because outdoor utility tools should outlive proprietary API contracts and respect intimate personal data. The application uses `llama-3.3-70b-versatile` for structured route planning, `llama-3.1-8b-instant` for field-note cleanup, and `whisper-large-v3-turbo` for voice transcription.

Open weights solve two practical problems here. First, portability: by sticking to standard OpenAI-compatible endpoints with environment variable controls, the exact same Next.js server runs against Groq in the cloud or Ollama on a laptop without editing code. Second, privacy: spoken trail notes often include home coordinates, timestamps, and private thoughts. Running locally means voice recordings never traverse the public internet.

The engineering tradeoff is real: Groq-hosted open weights deliver the sub-second response times needed when you are heading out the front door, while local Ollama inference eliminates API bills and ensures total offline privacy. Open architectures give the walker that choice.

---

## My Agent Session

This project was developed end-to-end with pair programming assistance from Google Antigravity. You can view or embed the full interactive build session:

{% agent_session step-out-touch-grass-outdoor-planner-build-kz2z2l %}

Link: [https://dev.to/agent_sessions/step-out-touch-grass-outdoor-planner-build-kz2z2l](https://dev.to/agent_sessions/step-out-touch-grass-outdoor-planner-build-kz2z2l)

---

## Prize Categories

- **Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass**
- **Open-Source AI / Open Weights Track** (Llama 3.3 70B, Llama 3.1 8B, Whisper Large v3 Turbo via Groq & Ollama)
