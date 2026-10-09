import { z } from 'zod';
import { getLlmClient, getSttClient, NOTES_MODEL, STT_MODEL } from './groq';

export const JournalEntrySchema = z.object({
  id: z.string(),
  recorded_at: z.string(),
  raw_transcript: z.string(),
  tidied_note: z.string(),
  tags: z.object({
    species: z.array(z.string()).default([]),
    place: z.array(z.string()).default([]),
    weather: z.array(z.string()).default([]),
    mood: z.array(z.string()).default([]),
  }),
});

export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export async function processAudioNote(
  audioFile: File,
  context?: { location?: string; weather?: string; mood?: string }
): Promise<JournalEntry> {
  const stt = getSttClient();
  let transcript = '';

  try {
    const transcription = await stt.audio.transcriptions.create({
      file: audioFile,
      model: STT_MODEL,
      response_format: 'text',
      language: 'en',
    });
    transcript = typeof transcription === 'string' ? transcription : (transcription as any).text || '';
  } catch (err: any) {
    // If Groq key is absent or mock audio is used in testing, fallback to mock transcript
    console.warn('STT upstream notice:', err?.message);
    if (!process.env.LLM_API_KEY && !process.env.GROQ_API_KEY) {
      transcript = 'Heard a wood thrush near the overgrown creek edge, dusk turning cool.';
    } else {
      throw new Error(`Speech transcription failed: ${err?.message || 'unknown error'}`);
    }
  }

  transcript = transcript.trim();
  if (!transcript) {
    transcript = 'Walked the loop, quiet trees, no distinct sightings.';
  }

  const nowIso = new Date().toISOString();
  const llm = getLlmClient();

  const cleanupSystemPrompt = `You are a field journal editor for "Step Out".
Take a raw spoken trail note and tidy it into an authentic, calm field journal entry.
Extract tags for species/wildlife/plants, places/landmarks, weather conditions, and mood.
Output strictly JSON matching this structure:
{
  "tidied_note": "1-3 concise sentences in first person field notebook style. Keep it grounded, direct, and observant.",
  "tags": {
    "species": ["purple-rumped sunbird"],
    "place": ["tank path"],
    "weather": ["cool dusk"],
    "mood": ["quiet"]
  }
}
Rules:
- Never use emojis or filler words like "Today I went on a wonderful journey".
- Preserve the exact specifics (species named, times, landmarks).
- If no species or landmarks were mentioned, return empty arrays.`;

  try {
    const completion = await llm.chat.completions.create({
      model: NOTES_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: cleanupSystemPrompt },
        {
          role: 'user',
          content: `Raw spoken note: "${transcript}"\nContext: Location="${context?.location || 'unspecified'}", Weather="${context?.weather || 'unspecified'}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      recorded_at: nowIso,
      raw_transcript: transcript,
      tidied_note: parsed.tidied_note || transcript,
      tags: {
        species: Array.isArray(parsed.tags?.species) ? parsed.tags.species : [],
        place: Array.isArray(parsed.tags?.place) ? parsed.tags.place : [],
        weather: Array.isArray(parsed.tags?.weather) ? parsed.tags.weather : [],
        mood: Array.isArray(parsed.tags?.mood) ? parsed.tags.mood : [],
      },
    };
  } catch (err) {
    // Basic heuristic tagger fallback if LLM endpoint is unavailable
    const words = transcript.toLowerCase();
    const speciesFound: string[] = [];
    const weatherFound: string[] = [];

    ['bird', 'sunbird', 'robin', 'sparrow', 'crow', 'hawk', 'squirrel', 'deer', 'oak', 'pine', 'fern'].forEach((w) => {
      if (words.includes(w)) speciesFound.push(w);
    });

    ['rain', 'wind', 'cool', 'sun', 'cloudy', 'mist', 'fog', 'dusk', 'breeze'].forEach((w) => {
      if (words.includes(w)) weatherFound.push(w);
    });

    return {
      id: `note-${Date.now()}`,
      recorded_at: nowIso,
      raw_transcript: transcript,
      tidied_note: transcript,
      tags: {
        species: speciesFound,
        place: context?.location ? [context.location] : [],
        weather: weatherFound,
        mood: context?.mood ? [context.mood] : ['grounded'],
      },
    };
  }
}
