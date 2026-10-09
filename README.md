# Step Out

I built Step Out because most outdoor and fitness apps do the opposite of what they promise: they try to keep your eyes glued to glass while you are standing in front of trees.

Step Out is designed so the screen is the shortest part of the outing. You punch in where you are (or let the browser grab it), choose how much free time you have (30 minutes to 4 hours), and pick a pace. In under a minute it checks live weather, finds actual footpaths and green spaces nearby on OpenStreetMap, and gives you a single pocket card. You save it, print it, or close the browser tab, and head out the door. While walking, you can tap a big record button to dictate field observations; Whisper transcribes the audio and Llama tidies it into a dated journal with tags for species, place, weather, and mood.

---

## Why open matters here

Step Out runs entirely on open-weight models: `llama-3.3-70b-versatile` for planning, `llama-3.1-8b-instant` for note cleanup, and `whisper-large-v3-turbo` for speech-to-text.

The demo defaults to Groq's API endpoint because sub-second inference is necessary when you are standing by the door tying your shoelaces. But because every call uses standard OpenAI-compatible endpoints with models read from environment variables, you can swap the backend without changing a single line of application code:

1. **No vendor lock-in**: If one host raises prices or throttles traffic, point `LLM_BASE_URL` to another provider or self-host.
2. **Local privacy path**: Voice notes can contain personal thoughts, home coordinates, and daily routines. In local mode (via Ollama and `faster-whisper-server`), the audio never leaves your machine or local network.
3. **Personal fine-tuning**: Over a season of walking, your exported Markdown journal becomes your own local dataset. You can fine-tune or prompt-steer a local model to recognize your neighborhood's specific birds, seasonal plant cycles, and favorite routes.

To be honest about the tradeoff: Groq-hosted open weights give you blistering speed and zero local GPU setup. The local Ollama route gives you complete privacy and zero API fees, but requires local compute. Both work against the exact same codebase.

---

## Getting started

Requires Node.js 20+.

### 1. Hosted open weights via Groq (Fastest)

1. Clone and install:
   ```bash
   npm install
   ```

2. Copy the environment template:
   ```bash
   cp .env.local.example .env.local
   ```

3. Add your Groq API key in `.env.local`:
   ```bash
   LLM_BASE_URL=https://api.groq.com/openai/v1
   LLM_API_KEY=gsk_your_key_here
   PLAN_MODEL=llama-3.3-70b-versatile
   NOTES_MODEL=llama-3.1-8b-instant
   STT_MODEL=whisper-large-v3-turbo
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

### 2. Fully local mode (Ollama + local Whisper)

1. Pull the model in Ollama:
   ```bash
   ollama run llama3.1:8b
   ```

2. Run an OpenAI-compatible Whisper server (e.g. `faster-whisper-server` or `whisper.cpp` server on port 8000).

3. Set your `.env.local`:
   ```bash
   LLM_BASE_URL=http://localhost:11434/v1
   LLM_API_KEY=ollama
   PLAN_MODEL=llama3.1:8b
   NOTES_MODEL=llama3.1:8b
   STT_BASE_URL=http://localhost:8000/v1
   STT_MODEL=whisper-1
   ```

---

## Known issues and rough edges

- **Overpass API rate limits**: OpenStreetMap's public Overpass interpreter occasionally throttles requests during peak European afternoon hours. I added a 24-hour rounded-coordinate cache and fallback mirror failover, but rural areas with zero tagged footpaths will fall back to neighborhood perimeter loops.
- **Microphone on iOS Safari**: Mobile Safari requires a direct user gesture to open the microphone stream. If you switch tabs during recording, iOS will pause the media recorder.
- **Sunset accuracy near poles**: The Open-Meteo sunset calculation works well between 60°S and 60°N, but during polar twilight in high latitudes the leave-by calculation defaults to safe dusk estimates.

---

## Real TODOs

- [ ] Add GPX trail track export so routes can be pushed directly to a Garmin watch or offline OsmAnd map.
- [ ] Implement an audio compression step client-side before upload to reduce payload bandwidth on weak 3G trailheads.
- [ ] Add an offline tile cache using MapLibre for users who want a tiny static vector thumbnail on the printed card.
