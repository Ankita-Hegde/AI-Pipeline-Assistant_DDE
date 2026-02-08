import OpenAI from 'openai';

const apiKey = process.env.API_KEY;
const apiBase = process.env.API_BASE;
const model = process.env.API_CHAT_MODEL;

if (!apiKey) {
  console.warn('API_KEY is not set. AI features will not work until it is configured.');
}

export const aiClient = new OpenAI({
  apiKey: apiKey || 'missing-api-key',
  baseURL: apiBase || 'https://ai-gateway.uni-paderborn.de/v1/',
});

export const AI_MODEL = model || 'gwdg.llama-3.3-70b-instruct';
