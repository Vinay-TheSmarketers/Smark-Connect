import type { CompletionParams, LLMProvider } from "../types";
import { providerFetch } from "../shared";

export const openAIProvider: LLMProvider = {
  async validateKey(apiKey, model = process.env.SMARK_MODEL_OPENAI || "gpt-5.4-mini") {
    await this.complete({ apiKey, model, messages: [{ role: "user", content: "Reply with OK." }], maxTokens: 12 });
  },
  async complete(params: CompletionParams) {
    const input = params.messages.map((message) => ({ role: message.role, content: [{ type: "input_text", text: message.content }] }));
    const data = (await providerFetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${params.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: params.model,
        instructions: params.system,
        input,
        max_output_tokens: params.maxTokens,
        temperature: params.temperature,
        store: false,
        text: params.jsonSchema ? { format: { type: "json_schema", name: params.jsonSchema.name, schema: params.jsonSchema.schema, strict: true } } : undefined,
      }),
    })) as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    return data.output_text ?? data.output?.flatMap((item) => item.content ?? []).find((part) => part.type === "output_text")?.text ?? "";
  },
};
