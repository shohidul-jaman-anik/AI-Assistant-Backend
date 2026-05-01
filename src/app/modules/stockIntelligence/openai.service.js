// src/app/modules/stockIntelligence/openai.service.js
import OpenAI from 'openai';
import { SYSTEM_INSTRUCTION, buildAugmentedPrompt } from './systemPrompt.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
let _client = null;

function getClient() {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY env var is required');
  _client = new OpenAI({ apiKey });
  return _client;
}

export async function generateResponse(userPrompt, contextBlocks = [], errors = [], conversationHistory = []) {
  const client = getClient();
  const augmentedPrompt = buildAugmentedPrompt(userPrompt, contextBlocks, errors);

  const messages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    ...conversationHistory.map((turn) => ({
      role: turn.role === 'model' ? 'assistant' : turn.role,
      content: turn.text,
    })),
    { role: 'user', content: augmentedPrompt },
  ];

  const start = Date.now();
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.15,
    max_tokens: 2048,
    top_p: 0.85,
  });

  const text = completion.choices?.[0]?.message?.content?.trim()
    || 'Unable to generate a response. Please try again.';

  const usage = completion.usage;
  console.log(`[OpenAI] ${completion.model} responded in ${Date.now() - start}ms | tokens: ${usage?.total_tokens}`);

  return {
    text,
    model: completion.model,
    promptTokens: usage?.prompt_tokens || 0,
    outputTokens: usage?.completion_tokens || 0,
    totalTokens: usage?.total_tokens || 0,
  };
}