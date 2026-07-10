// Gemini API client for AI feedback summaries
// Reads GEMINI_API_KEY at call time (not module load) so tests can toggle it per-test

const GEMINI_TIMEOUT_MS = 20_000
// caps help keep the prompt inside free-tier token limits
const MAX_RESPONSES_PER_QUESTION = 1000
const MAX_RESPONSE_CHARS = 500

export interface AiSummary {
  questions: { question: string; points: string[] }[]
}

export interface OpenEndedGroup {
  question: string
  responses: string[]
}

export function aiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY
}

// Gemini structured output schema to match AiSummary, so the response is guaranteed valid JSON
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          points: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['question', 'points'],
      },
    },
  },
  required: ['questions'],
}

function buildPrompt(eventName: string, groups: OpenEndedGroup[]): string {
  const sections = groups.map(g => {
    const lines = g.responses
      .slice(0, MAX_RESPONSES_PER_QUESTION)
      .map(r => `- ${r.slice(0, MAX_RESPONSE_CHARS)}`)
      .join('\n')
    return `Question: ${g.question}\nResponses (${g.responses.length}):\n${lines}`
  }).join('\n\n')

  return `You are summarizing anonymous attendee feedback for a campus event named "${eventName}".
    For each question below, write 2-4 concise bullet points capturing the main themes, common suggestions, and overall sentiment of the responses.
    Only describe what is actually in the responses, do not invent details. Keep every bullet under 25 words. Return one entry per question, in the same order as given.

${sections}`
}

// throws on any failure (timeout, rate limit, bad response), the caller decides what to serve
export async function summarizeFeedback(eventName: string, groups: OpenEndedGroup[]): Promise<AiSummary> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')
  const model = process.env.GEMINI_MODEL ?? 'gemini-flash-lite-latest'
  // google's server that hosts the Gemini API, the API version, the model to use, and the generateContent endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  // abort the request if it takes too long to avoid blocking the server
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      // the API key is passed in a custom header, not in the URL
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(eventName, groups) }] }],
        // temperature controls randomness, lower is more deterministic
        generationConfig: {
          temperature: 0.3,
          // ensure valid JSON output
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Gemini API error ${res.status}`)
    const data = await res.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty Gemini response')
    return JSON.parse(text) as AiSummary
  } finally {
    clearTimeout(timer)
  }
}
