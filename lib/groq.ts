import OpenAI from 'openai';

// Factory for OpenAI-compatible client.
// Points to Groq by default, but swapping LLM_BASE_URL points straight to Ollama or llama.cpp.

export const PLAN_MODEL = process.env.PLAN_MODEL || 'llama-3.3-70b-versatile';
export const NOTES_MODEL = process.env.NOTES_MODEL || 'llama-3.1-8b-instant';
export const STT_MODEL = process.env.STT_MODEL || 'whisper-large-v3-turbo';

export function getLlmClient(): OpenAI {
  const baseURL = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const apiKey = process.env.LLM_API_KEY || process.env.GROQ_API_KEY || 'dummy-key';

  return new OpenAI({
    baseURL,
    apiKey,
    timeout: 10000, // 10s strict timeout on upstream calls
  });
}

export function getSttClient(): OpenAI {
  // Allows pointing STT to a dedicated local faster-whisper-server if configured
  const baseURL = process.env.STT_BASE_URL || process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const apiKey = process.env.LLM_API_KEY || process.env.GROQ_API_KEY || 'dummy-key';

  return new OpenAI({
    baseURL,
    apiKey,
    timeout: 25000,
  });
}
