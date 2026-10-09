# Step Out — Demo Walkthrough & Contest Post Draft

---

## 60-Second Demo Script

| Timestamp | Screen / Action | Voiceover / What Happens |
| :--- | :--- | :--- |
| **00:00 - 00:12** | **Form View (`/`)**<br>Type "Richmond Park" (or tap *Use current location*). Select "45 min" and tap "Curious" mood. Tap **Plan my 45 min**. | *"Most outdoor apps try to trap your attention with social feeds and badge streaks. Step Out is designed to get you away from the screen in sixty seconds."* |
| **00:12 - 00:25** | **Pocket Card Appears**<br>Card renders with sun emblem, leave-by time (e.g. 17:21), 4-step route, seasonal foliage notice, packing items, and rain plan. | *"The planner pulls real OpenStreetMap paths and live Open-Meteo sunset data. Llama 3.3 70B condenses it into one pocket card with a hard leave-by deadline before dusk."* |
| **00:25 - 00:35** | **Card Actions**<br>Tap **Print card** (shows clean black-and-white print preview), then tap **Save to pocket**. | *"You can print this card or let the service worker cache it to localStorage. Now the phone goes in your pocket with zero signal needed on the trail."* |
| **00:35 - 00:48** | **Voice Notes Tab**<br>Tap "Voice notes" tab. Tap big green circle **Talk to it**. Speak: *"Saw a purple-rumped sunbird near the old oak, dusk turning cool."* Tap stop. | *"While out on the path, tap the big tactile button and speak naturally. Whisper transcribes the speech, and Llama 3.1 8B cleans it into an authentic field log."* |
| **00:48 - 01:00** | **Journal Log & Export**<br>Card updates with tidied entry and chips (`species: sunbird`, `place: old oak`, `weather: cool dusk`, `mood: quiet`). Tap **Export .md** and show downloaded file. Notice streak at header: "1 day outside this month". | *"No badges, no confetti—just a plain count of days outside this month, and an exported Markdown notebook that stays on your own disk."* |

---

## Contest Post Draft: "Why open innovation mattered here"

I chose open-weight models for Step Out because outdoor utility tools should outlive proprietary API contracts and respect intimate personal data. The application uses `llama-3.3-70b-versatile` for structured route planning, `llama-3.1-8b-instant` for field-note cleanup, and `whisper-large-v3-turbo` for voice transcription.

Open weights solve two practical problems here. First, portability: by sticking to standard OpenAI-compatible endpoints with environment variable controls, the exact same Next.js server runs against Groq in the cloud or Ollama on a laptop without editing code. Second, privacy: spoken trail notes often include home coordinates, timestamps, and private thoughts. Running locally means voice recordings never traverse the public internet.

The engineering tradeoff is real: Groq-hosted open weights deliver the sub-second response times needed when you are heading out the front door, while local Ollama inference eliminates API bills and ensures total offline privacy. Open architectures give the walker that choice.

*(Word count: 149 words)*
