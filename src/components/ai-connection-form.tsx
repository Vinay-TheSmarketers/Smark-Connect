"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const providers = [
  { value: "anthropic", label: "Anthropic", hint: "Claude", icon: "/provider-logos/anthropic.svg", recommendedModel: "claude-haiku-4-5" },
  { value: "openai", label: "OpenAI", hint: "ChatGPT", icon: "/provider-logos/openai.svg", recommendedModel: "gpt-5.4-mini" },
  { value: "openrouter", label: "OpenRouter", hint: "Many models", icon: "/provider-logos/openrouter.svg", recommendedModel: "openai/gpt-5.4-mini" },
  { value: "google", label: "Google", hint: "Gemini", icon: "/provider-logos/google-gemini.svg", recommendedModel: "gemini-2.5-flash" },
] as const;

export function AIConnectionForm({ returnTo = "/onboarding/company", initialProvider = "anthropic", initialModel, currentPreview, recoveryReason }: { returnTo?: string; initialProvider?: string; initialModel?: string | null; currentPreview?: string | null; recoveryReason?: "model" | null }) {
  const router = useRouter();
  const [provider, setProvider] = useState(initialProvider);
  const initialDefinition = providers.find((item) => item.value === initialProvider) ?? providers[0];
  const [model, setModel] = useState(initialModel || initialDefinition.recommendedModel);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const selectedDefinition = providers.find((item) => item.value === provider) ?? providers[0];
  const canReuseSavedKey = Boolean(currentPreview && provider === initialProvider);

  function selectProvider(value: string) {
    const definition = providers.find((item) => item.value === value) ?? providers[0];
    setProvider(definition.value);
    setModel(definition.value === initialProvider && initialModel ? initialModel : definition.recommendedModel);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const apiKey = String(data.get("apiKey") ?? "").trim();
      const response = await fetch("/api/llm/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey: apiKey || undefined, model }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The provider could not be connected.");
      router.push(returnTo);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The provider could not be connected.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="form-card">
      <p className="eyebrow">BRING YOUR OWN AI</p>
      <h2>Connect your preferred provider.</h2>
      <p className="form-intro">{recoveryReason === "model" ? "Choose a model that supports long structured reports. Your saved key stays encrypted and will be reused for validation." : `We make one live request to verify the key and structured-output support. Once accepted, it is encrypted and used only for your workspace.${currentPreview ? ` Current key: ${currentPreview}` : ""}`}</p>
      <form onSubmit={submit}>
        <div className="provider-grid" role="radiogroup" aria-label="LLM provider">
          {providers.map((item) => <button className={provider === item.value ? "provider-option selected" : "provider-option"} type="button" role="radio" aria-checked={provider === item.value} onClick={() => selectProvider(item.value)} key={item.value}><Image src={item.icon} alt="" width={30} height={30} /><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>)}
        </div>
        <label htmlFor="api-key">API key</label>
        <input id="api-key" name="apiKey" type="password" autoComplete="off" required={!canReuseSavedKey} minLength={10} placeholder={canReuseSavedKey ? `Leave blank to reuse ${currentPreview}` : "Paste your provider key"} />
        {canReuseSavedKey && <p className="saved-key-note">Your saved key will be reused unless you enter a replacement.</p>}
        <div className="model-label-row"><label htmlFor="model">Model</label><button type="button" onClick={() => setModel(selectedDefinition.recommendedModel)}>Use recommended</button></div>
        <input id="model" name="model" value={model} onChange={(event) => setModel(event.target.value)} required placeholder={selectedDefinition.recommendedModel} />
        <p className="model-note">Recommended for {selectedDefinition.label}: <button type="button" onClick={() => setModel(selectedDefinition.recommendedModel)}>{selectedDefinition.recommendedModel}</button>{provider === "openrouter" ? " · Free models may not support the long structured output required by company audits." : ""}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={pending}>{pending ? "Verifying with provider…" : "Verify and continue"}<span>→</span></button>
        <p className="submit-note">Your key is sent directly from our server to the selected provider for validation.</p>
      </form>
    </div>
  );
}
