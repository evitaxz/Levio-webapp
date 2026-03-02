const OpenAI = require('openai');
const { SYSTEM_PROMPT } = require('../prompts/index');

let client;

function getClient() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-replace')) {
      throw new Error('OPENAI_API_KEY is not set. Add it to backend/.env');
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/**
 * Make a text-response AI call.
 * Returns the raw text string from the model.
 */
async function callAI(userPrompt, options = {}) {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userPrompt },
    ],
    max_tokens: options.maxTokens || 200,
    temperature: options.temperature ?? 0.75,
  });
  return response.choices[0].message.content.trim();
}

/**
 * Make a JSON-response AI call.
 * Strips markdown code fences if the model adds them, then parses.
 * Returns the parsed JS value (array or object).
 */
async function callAIForJSON(userPrompt, options = {}) {
  const raw = await callAI(userPrompt, { maxTokens: 400, ...options });

  // Strip optional ```json ... ``` or ``` ... ``` wrapping
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[openai] JSON parse failed. Raw response:', raw);
    throw new Error('AI returned an unexpected format. Please try again.');
  }
}

module.exports = { callAI, callAIForJSON };
