import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import AI providers dynamically
let ChatOpenAI, ChatAnthropic, ChatGoogleGenerativeAI, ChatXAI;

try {
  const openai = await import('@langchain/openai');
  ChatOpenAI = openai.ChatOpenAI;
} catch (e) {
  console.warn('OpenAI not available:', e.message);
}

try {
  const anthropic = await import('@langchain/anthropic');
  ChatAnthropic = anthropic.ChatAnthropic;
} catch (e) {
  console.warn('Anthropic not available:', e.message);
}

try {
  const google = await import('@langchain/google-genai');
  ChatGoogleGenerativeAI = google.ChatGoogleGenerativeAI;
} catch (e) {
  console.warn('Google Generative AI not available:', e.message);
}

try {
  const xai = await import('@langchain/xai');
  ChatXAI = xai.ChatXAI;
} catch (e) {
  console.warn('xAI/Grok not available:', e.message);
}

// Function to get AI model based on provider
function getAIModel(provider = process.env.DEFAULT_AI_PROVIDER || 'openai') {
  switch (provider.toLowerCase()) {
    case 'openai':
      if (!ChatOpenAI) throw new Error('OpenAI not installed or API key missing');
      return new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-3.5-turbo',
        temperature: 0.3,
      });
    case 'anthropic':
      if (!ChatAnthropic) throw new Error('Anthropic not installed or API key missing');
      return new ChatAnthropic({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        modelName: 'claude-3-sonnet-20240229',
        temperature: 0.3,
      });
    case 'google':
      if (!ChatGoogleGenerativeAI) throw new Error('Google Generative AI not installed or API key missing');
      return new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: 'gemini-pro',
        temperature: 0.3,
      });
    case 'xai':
    case 'grok':
      if (!ChatXAI) throw new Error('xAI/Grok not installed or API key missing');
      return new ChatXAI({
        apiKey: process.env.XAI_API_KEY,
        model: 'grok-beta',
        temperature: 0.3,
      });
    case 'openrouter':
      if (!ChatOpenAI) throw new Error('OpenAI client not available for OpenRouter');
      return new ChatOpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        modelName: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku',
        temperature: 0.3,
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
        },
      });
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

export { getAIModel };