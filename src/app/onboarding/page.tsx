"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  Globe,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Key,
  Layers,
  Sparkles,
  Shield,
  Search,
  Bot,
  Compass,
  FileText,
  BarChart3,
  Users,
  Briefcase,
  Check,
} from "lucide-react";

interface ProviderOption {
  id: string;
  name: string;
  models: string;
  logo: string;
  hint: string;
  recommendedModel: string;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: "openai",
    name: "OpenAI",
    models: "GPT-4o, o1, and more",
    logo: "/provider-logos/openai.svg",
    hint: "Fast parallel JSON completion",
    recommendedModel: "gpt-4o",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    models: "Claude 3.5 Sonnet, Opus",
    logo: "/provider-logos/anthropic.svg",
    hint: "Exceptional strategic reasoning",
    recommendedModel: "claude-3-5-sonnet-20241022",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    models: "Gemini 1.5 Pro, 2.0 Flash",
    logo: "/provider-logos/google-gemini.svg",
    hint: "Massive context & multimodal",
    recommendedModel: "gemini-1.5-pro",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    models: "Access 100+ models",
    logo: "/provider-logos/openrouter.svg",
    hint: "Unified key with smart routing",
    recommendedModel: "anthropic/claude-3.5-sonnet",
  },
];

const ROLES = [
  "Founder / CEO",
  "Head of Marketing / CMO",
  "Growth & Performance Lead",
  "SEO / Content Strategist",
  "Agency Partner / Consultant",
];

const PRIORITIES = [
  "Fix Technical SEO & Link Topology",
  "Generative AI Engine Visibility (GEO)",
  "Uncover Competitor Whitespace",
  "Build ICPs & Buyer Objections",
  "Full Content Strategy Roadmap",
];

function OnboardingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialUrl = searchParams.get("url") || "";
  const [currentStep, setCurrentStep] = React.useState(1);

  // Form State
  const [url, setUrl] = React.useState(initialUrl);
  const [selectedProvider, setSelectedProvider] = React.useState("anthropic");
  const [apiKey, setApiKey] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState(ROLES[0]);
  const [selectedPriority, setSelectedPriority] = React.useState(PRIORITIES[0]);
  const [isVerifying, setIsVerifying] = React.useState(false);

  // Auto-fill company name from domain if empty
  React.useEffect(() => {
    if (url && !companyName) {
      try {
        const clean = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
        const namePart = clean.split(".")[0];
        if (namePart) {
          setCompanyName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
        }
      } catch {
        // ignore
      }
    }
  }, [url, companyName]);

  const normalizeUrl = (raw: string) => {
    let trimmed = raw.trim();
    if (!trimmed) return "";
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setUrl(normalizeUrl(url));
    setCurrentStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(3);
  };

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(4);
  };

  const handleFinalLaunch = () => {
    setIsVerifying(true);
    // Route into signup / company onboarding flow with pre-populated parameters
    setTimeout(() => {
      router.push(`/signup?redirect=/onboarding/ai`);
    }, 600);
  };

  const currentProviderObj = PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[1];

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0f] font-sans text-slate-100 selection:bg-purple-500 selection:text-white">
      {/* Sticky Main Menu Header */}
      <SiteHeader activeNav="get-started" />

      <main className="relative mx-auto max-w-4xl px-6 pt-28 pb-24 md:pt-32">
        {/* Step Progress Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3.5 py-1 text-xs font-semibold text-purple-300 backdrop-blur-md">
            <Sparkles className="size-3.5 text-purple-400" />
            <span>STEP 0{currentStep} OF 04 &bull; WORKSPACE SETUP</span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            {currentStep === 1 && "What website are we analyzing?"}
            {currentStep === 2 && "Choose your AI inference provider"}
            {currentStep === 3 && "Configure your growth workspace"}
            {currentStep === 4 && "Review & launch intelligence engine"}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            {currentStep === 1 && "Smark Connect crawls up to 20 public pages to extract verified digital evidence before running strategy."}
            {currentStep === 2 && "Bring your own API key. Your credentials are encrypted with AES-256 at rest and never shared."}
            {currentStep === 3 && "Tailor your AI CMO synthesis to your team's specific role and quarterly growth objectives."}
            {currentStep === 4 && "Your evidence baseline is ready to initialize. All six analyses will run concurrently."}
          </p>

          {/* Stepper Progress Bar */}
          <div className="mx-auto mt-8 flex max-w-md items-center justify-between gap-2">
            {[1, 2, 3, 4].map((step) => {
              const isDone = currentStep > step;
              const isCurrent = currentStep === step;
              return (
                <div key={step} className="flex flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep > step) setCurrentStep(step);
                    }}
                    disabled={currentStep < step}
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isDone
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 cursor-pointer"
                        : isCurrent
                        ? "border-2 border-purple-500 bg-purple-500/20 text-purple-300"
                        : "border border-white/10 bg-white/5 text-slate-500"
                    }`}
                  >
                    {isDone ? <Check className="size-4 stroke-[3]" /> : step}
                  </button>
                  {step < 4 && (
                    <div
                      className={`h-0.5 flex-1 rounded-full transition-all ${
                        currentStep > step ? "bg-purple-500" : "bg-white/10"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1: TARGET DOMAIN */}
        {currentStep === 1 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-10 backdrop-blur-xl shadow-2xl">
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <label htmlFor="website-url" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Company or Product Website URL
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <Globe className="size-5 text-purple-400" />
                  </div>
                  <input
                    id="website-url"
                    type="text"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://yourcompany.com or stripe.com"
                    className="h-14 w-full rounded-2xl border border-white/15 bg-white/[0.05] pl-12 pr-4 text-base text-white placeholder-slate-500 outline-none transition-all focus:border-purple-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <span>Quick pick:</span>
                  {["stripe.com", "linear.app", "ramp.com", "vercel.com"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setUrl(`https://${d}`)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300 hover:border-purple-500/50 hover:bg-white/10"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* What will be analyzed */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  6-Engine Evidence Crawl Queue
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 text-xs">
                    <Search className="size-4 text-purple-400 shrink-0" />
                    <span>Company Intelligence</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 text-xs">
                    <BarChart3 className="size-4 text-purple-400 shrink-0" />
                    <span>Technical SEO Audit</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 text-xs">
                    <Bot className="size-4 text-purple-400 shrink-0" />
                    <span>GEO & AI Answer Engines</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 text-xs">
                    <Compass className="size-4 text-purple-400 shrink-0" />
                    <span>Competitor Landscape</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 text-xs">
                    <Users className="size-4 text-purple-400 shrink-0" />
                    <span>Audience ICP Profiling</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 text-xs">
                    <FileText className="size-4 text-purple-400 shrink-0" />
                    <span>Content Strategy Roadmap</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-purple-600 px-7 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500 active:scale-95 cursor-pointer"
                >
                  <span>Continue to AI Provider</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: PROVIDER SELECTION WITH REAL LOGOS */}
        {currentStep === 2 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-10 backdrop-blur-xl shadow-2xl">
            <form onSubmit={handleStep2Submit} className="space-y-8">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Select Your AI Provider (Bring Your Own Key)
                </label>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {PROVIDERS.map((prov) => {
                    const isSelected = selectedProvider === prov.id;
                    return (
                      <div
                        key={prov.id}
                        onClick={() => setSelectedProvider(prov.id)}
                        className={`relative flex cursor-pointer items-center gap-4 rounded-2xl border p-5 transition-all ${
                          isSelected
                            ? "border-purple-500 bg-purple-950/20 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/50"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        {/* Real Provider SVG Logo Container */}
                        <div className="flex size-13 shrink-0 items-center justify-center rounded-xl bg-white/10 p-2.5 backdrop-blur-md border border-white/10">
                          <Image
                            src={prov.logo}
                            alt={`${prov.name} logo`}
                            width={34}
                            height={34}
                            className="size-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white">{prov.name}</h3>
                            {isSelected && (
                              <span className="flex size-4 items-center justify-center rounded-full bg-purple-500 text-white">
                                <Check className="size-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-purple-300 font-medium">{prov.models}</p>
                          <p className="mt-1 text-[11px] text-slate-400 truncate">{prov.hint}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* API Key Input */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="api-key" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {currentProviderObj.name} API Key
                  </label>
                  <span className="text-[11px] text-purple-400 font-medium">Recommended: {currentProviderObj.recommendedModel}</span>
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <Key className="size-4 text-purple-400" />
                  </div>
                  <input
                    id="api-key"
                    type="password"
                    autoComplete="off"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Paste your ${currentProviderObj.name} key (sk-...)`}
                    className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.05] pl-11 pr-4 text-xs font-mono text-white placeholder-slate-500 outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Lock className="size-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Zero-Trust: Your key is AES-256 encrypted at rest in your workspace and never shared with anyone.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-purple-600 px-7 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500 active:scale-95 cursor-pointer"
                >
                  <span>Continue to Workspace</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: WORKSPACE & ROLE */}
        {currentStep === 3 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-10 backdrop-blur-xl shadow-2xl">
            <form onSubmit={handleStep3Submit} className="space-y-6">
              <div>
                <label htmlFor="company-name" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Company / Organization Name
                </label>
                <input
                  id="company-name"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Stripe, Acme Corp"
                  className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Your Primary Marketing Role
                </label>
                <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {ROLES.map((role) => {
                    const isSelected = selectedRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className={`flex items-center justify-between rounded-xl border p-3.5 text-xs text-left transition-all ${
                          isSelected
                            ? "border-purple-500 bg-purple-950/20 text-white font-semibold"
                            : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <span>{role}</span>
                        {isSelected && <Check className="size-3.5 text-purple-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Immediate Focus Area
                </label>
                <div className="mt-2 space-y-2">
                  {PRIORITIES.map((priority) => {
                    const isSelected = selectedPriority === priority;
                    return (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => setSelectedPriority(priority)}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-xs text-left transition-all ${
                          isSelected
                            ? "border-purple-500 bg-purple-950/20 text-white font-semibold"
                            : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <span>{priority}</span>
                        {isSelected && <Check className="size-3.5 text-purple-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-purple-600 px-7 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500 active:scale-95 cursor-pointer"
                >
                  <span>Review & Complete</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: REVIEW & LAUNCH */}
        {currentStep === 4 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-10 backdrop-blur-xl shadow-2xl">
            <div className="space-y-6">
              <div className="rounded-xl border border-purple-500/30 bg-purple-950/15 p-6 backdrop-blur-md">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="size-4 text-purple-400" />
                  Ready to Synthesize Marketing Intelligence
                </h3>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                  We will crawl {url} across 20 public endpoints and initialize your AI CMO workspace powered by {currentProviderObj.name}.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-white/10 pt-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Website</span>
                    <p className="mt-1 text-xs font-semibold text-white truncate">{url}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Provider</span>
                    <div className="mt-1 flex items-center gap-2">
                      <Image
                        src={currentProviderObj.logo}
                        alt={currentProviderObj.name}
                        width={18}
                        height={18}
                        className="object-contain"
                      />
                      <span className="text-xs font-semibold text-white">{currentProviderObj.name}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workspace</span>
                    <p className="mt-1 text-xs font-semibold text-white">{companyName || "Marketing Team"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Deliverables generated in this workspace
                </h4>
                <ul className="mt-3 space-y-2 text-xs text-slate-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-purple-400" />
                    <span>6 Foundation Intelligence Documents (Positioning, SEO, GEO, Competitors, ICPs, Content)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-purple-400" />
                    <span>12+ Specialist Agents with access to company ground truth</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-purple-400" />
                    <span>Branded PDF, PPTX presentation decks, and operational XLSX workbooks</span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={handleFinalLaunch}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 px-8 text-sm font-semibold text-white shadow-xl shadow-purple-600/30 transition-all hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <span>{isVerifying ? "Initializing Workspace…" : "Launch Workspace Analysis"}</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Standard Footer */}
      <SiteFooter />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <OnboardingContent />
    </React.Suspense>
  );
}
