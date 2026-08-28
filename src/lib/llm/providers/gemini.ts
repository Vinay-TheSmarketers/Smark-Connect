import type { CompletionParams, LLMProvider } from "../types";
import { providerFetch } from "../shared";

export const geminiProvider: LLMProvider = {
  async validateKey(apiKey, model = process.env.SMARK_MODEL_GOOGLE || "gemini-3.6-flash") {
    await this.complete({ apiKey, model, messages: [{ role: "user", content: "Reply with OK." }], maxTokens: 12 });
  },
  async complete(params: CompletionParams) {
    const data = (await providerFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent?key=${encodeURIComponent(params.apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: params.system ? { parts: [{ text: params.system }] } : undefined,
        contents: params.messages.map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
        generationConfig: {
          maxOutputTokens: params.maxTokens,
          temperature: params.temperature,
          responseMimeType: params.jsonSchema ? "application/json" : undefined,
          responseJsonSchema: params.jsonSchema?.schema,
        },
      }),
    })) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  },
};
