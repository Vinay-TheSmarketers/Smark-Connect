import { Brand } from "./brand";
import { AuthForm } from "./auth-form";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-copy">
          <p className="eyebrow">YOUR ALWAYS-ON AI CMO</p>
          <h1>Turn one website into your next marketing move.</h1>
          <p>Smark Connect reads your company, builds the foundation, and gives every marketing agent the same source of truth.</p>
        </div>
        <div className="story-stats"><div><strong>6</strong><span>pages researched</span></div><div><strong>2</strong><span>agents ready first</span></div><div><strong>1–3m</strong><span>to first brief</span></div></div>
      </section>
      <section className="auth-card-wrap">
        <div className="auth-card">
          <p className="eyebrow">{mode === "login" ? "WELCOME BACK" : "START BUILDING"}</p>
          <h2>{mode === "login" ? "Sign in to your workspace" : "Create your Smark workspace"}</h2>
          <p className="form-intro">{mode === "login" ? "Continue where your marketing agents left off." : "Your first real company audit starts with a secure provider connection."}</p>
          <AuthForm mode={mode} googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} />
        </div>
      </section>
      <div className="accent-bar" />
    </main>
  );
}
