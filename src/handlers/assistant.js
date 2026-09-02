import { json, badRequest } from '../lib/auth.js';

export async function ask({ request, env }) {
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt || prompt.length > 1000) return badRequest('A question up to 1,000 characters is required.');
  if (!env.AI || typeof env.AI.run !== 'function') return json({ error: 'AI service is not configured.' }, { status: 503 });
  const result = await env.AI.run(env.AI_MODEL || '@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'You are Smart21Brain Study Buddy. Give concise, age-appropriate educational help. Do not claim to replace a teacher.' },
      { role: 'user', content: prompt },
    ],
  });
  return json({ answer: result.response || 'I could not generate an answer right now.' });
}