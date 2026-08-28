import { anthropicProvider } from "./providers/anthropic";
import { geminiProvider } from "./providers/gemini";
import { openAIProvider } from "./providers/openai";
import { openRouterProvider } from "./providers/openrouter";
import type { LLMProvider, ProviderName } from "./types";

const providers: Record<ProviderName, LLMProvider> = {
  anthropic: anthropicProvider,
  openai: openAIProvider,
  openrouter: openRouterProvider,
  google: geminiProvider,
};

export const DEFAULT_MODELS: Record<ProviderName, string> = {
  anthropic: process.env.SMARK_MODEL_ANTHROPIC || "claude-haiku-4-5",
  openai: process.env.SMARK_MODEL_OPENAI || "gpt-5.4-mini",
  openrouter: process.env.SMARK_MODEL_OPENROUTER || "openai/gpt-5.4-mini",
  google: process.env.SMARK_MODEL_GOOGLE || "gemini-2.5-flash",
};

export function getProvider(name: string): LLMProvider {
  if (!(name in providers)) throw new Error(`Unsupported LLM provider: ${name}`);
  return providers[name as ProviderName];
}

export type { ProviderName } from "./types";
