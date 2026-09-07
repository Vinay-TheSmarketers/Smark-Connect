import { ReactNode } from "react";
import { Brand } from "./brand";

const steps = [
  { number: "01", label: "Connect AI" },
  { number: "02", label: "Add company" },
  { number: "03", label: "Initial audit" },
];

export function OnboardingLayout({ activeStep, children }: { activeStep: number; children: ReactNode }) {
  return (
    <main className="onboarding-shell">
      <header className="topbar"><Brand /><div className="topbar-status"><span className="status-dot" /> Secure onboarding</div><span className="secure-label">BYOK · encrypted</span></header>
      <section className="onboarding-frame">
        <aside className="progress-panel" aria-label="Onboarding progress">
          <p className="eyebrow">SET UP YOUR AI CMO</p>
          <h1>Three steps to your first marketing brief.</h1>
          <p className="panel-copy">Connect your company and Smark Connect will turn your live website into an actionable marketing workspace.</p>
          <ol className="step-list">
            {steps.map((step, index) => <li className={index === activeStep ? "step active" : "step"} key={step.number}><span className="step-number">{index < activeStep ? "✓" : step.number}</span><span><strong>{step.label}</strong><small>{index < activeStep ? "Complete" : index === activeStep ? "Current" : "Next"}</small></span></li>)}
          </ol>
          <div className="privacy-note"><span aria-hidden="true">◆</span><p><strong>Your data stays private.</strong> Provider keys are encrypted at rest and never returned to the browser.</p></div>
        </aside>
        <section className="form-stage"><div className="glow glow-one" /><div className="glow glow-two" />{children}</section>
      </section>
      <div className="accent-bar" />
    </main>
  );
}
