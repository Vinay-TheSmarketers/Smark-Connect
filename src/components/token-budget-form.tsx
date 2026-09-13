"use client";

import { FormEvent, useState } from "react";

export function TokenBudgetForm({ initialBudget, tokenUsed }: { initialBudget: number; tokenUsed: number }) {
  const [budget, setBudget] = useState(String(initialBudget));
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/settings/token-budget", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tokenBudget: Number(budget) }) });
      const result = await response.json() as { tokenBudget?: number; error?: string };
      if (!response.ok || result.tokenBudget === undefined) throw new Error(result.error ?? "The token limit could not be updated.");
      setBudget(String(result.tokenBudget));
      setMessage("Token limit saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The token limit could not be updated.");
    } finally {
      setPending(false);
    }
  }

  return <form className="token-budget-form" onSubmit={save}>
    <div><strong>Workspace token limit</strong><p>{tokenUsed.toLocaleString()} estimated tokens recorded so far. Set 0 for no application-level limit.</p></div>
    <label>Tokens <input inputMode="numeric" min="0" max="20000000" value={budget} onChange={(event) => setBudget(event.target.value.replace(/[^0-9]/g, ""))} /></label>
    <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save limit"}</button>
    {message && <span role="status">{message}</span>}
  </form>;
}
