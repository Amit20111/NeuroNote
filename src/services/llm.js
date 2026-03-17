import storage from './storage';

function buildPrompt(content, selectedOutputs, settings) {
  const flashcardCount = settings?.flashcardCount || 10;
  const quizCount = settings?.quizCount || 7;

  const outputList = selectedOutputs.join(', ');

  const prompt = `Transform the following content into structured study materials.

Generate ONLY these output types: ${outputList}

${selectedOutputs.includes('flashcards') ? `Generate exactly ${flashcardCount} flashcards.` : ''}
${selectedOutputs.includes('quiz') ? `Generate exactly ${quizCount} quiz questions with 4 options each.` : ''}

Return ONLY valid JSON matching this schema (include only the keys for the requested output types):
{
  ${selectedOutputs.includes('notes') ? '"notes": { "sections": [{ "heading": "...", "body": "...", "bullets": ["..."] }] },' : ''}
  ${selectedOutputs.includes('flashcards') ? '"flashcards": [{ "question": "...", "answer": "..." }],' : ''}
  ${selectedOutputs.includes('quiz') ? '"quiz": [{ "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": 0, "explanation": "..." }],' : ''}
  ${selectedOutputs.includes('summary') ? '"summary": { "tldr": "...", "keyPoints": ["..."], "terms": [{ "name": "...", "definition": "..." }] }' : ''}
}

Content to study:
---
${content}
---`;

  return prompt;
}

const SYSTEM_INSTRUCTION = `You are an expert study assistant for NeuroNote. Transform the provided content into structured study materials. Return ONLY valid JSON matching the schema exactly, with no explanation or markdown.`;

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export async function generateStudyMaterials(content, selectedOutputs) {
  const baseUrl = GROQ_BASE_URL;
  const apiKey = GROQ_API_KEY;
  const model = GROQ_MODEL;

  const settings = storage.getSettings();
  const prompt = buildPrompt(content, selectedOutputs, settings);

  // Standard OpenAI-compatible payload
  const body = {
    model: model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      { role: 'user', content: prompt }
    ],
    // The following is supported by most major providers (OpenAI, Anthropic via standard translation, Groq, Together) to force JSON output
    response_format: { type: 'json_object' }
  };

  // Ensure baseUrl doesn't end with a slash and append /chat/completions if not already there
  let endpoint = baseUrl.trim();
  if (endpoint.endsWith('/')) {
    endpoint = endpoint.slice(0, -1);
  }
  if (!endpoint.endsWith('/chat/completions')) {
      endpoint += '/chat/completions';
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`LLM API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const rawText = data?.choices?.[0]?.message?.content;

  if (!rawText) {
    throw new Error('No response from LLM');
  }

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error('MALFORMED_JSON:' + rawText);
  }
}
