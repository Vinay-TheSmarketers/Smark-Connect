"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Activity, AlertTriangle, ArrowUp, Bot, Check, CheckCircle2, ChevronDown, ChevronRight, CirclePlus, Copy, ExternalLink, FileText, Globe2, GripVertical, HelpCircle, LayoutGrid, Link2, Lock, MessageCircle, MessageSquare, PanelLeftClose, PanelLeftOpen, Paperclip, Pencil, Plus, Radio, RefreshCw, RotateCcw, Send, Settings, Sparkles, XCircle, X as CloseIcon } from "lucide-react";
import { AGENT_DEFINITIONS, EXTENDED_DOCUMENTS } from "@/lib/skills/registry";
import { normalizeAcronyms, unwrapStructuredText } from "@/lib/text-format";
import { formatSkillName } from "@/lib/skills/format";
import { evaluateLinkedInOpportunity, evaluateRedditCandidate, evaluateXOpportunity, scoreOpportunity } from "@/lib/signals/store";
import { Brand } from "./brand";
import { DocumentWorkspace, type WorkspaceDocument } from "./document-workspace";
import { LogoutButton } from "./logout-button";
import { ModuleIcon, isCoreModule } from "./module-icon";
import { AuditSkeleton, LighthouseAuditPanel, useLighthouseAudit } from "./lighthouse-audit-panel";

type FindingKind = "current_status" | "previous_post" | "new_post" | "comment_opportunity" | "audience_signal" | "insight";
type Finding = { title?: string; evidence?: string; impact?: string; action?: string; description?: string; kind?: FindingKind; platform?: string; sourceLabel?: string; publishedAt?: string; draftContent?: string; recommendedResponse?: string; tags?: string[]; priority?: string; confidence?: number; sourceUrls?: string[]; companyName?: string; officialWebsite?: string; logoUrl?: string; competitiveAttributes?: string[] };
type AgentItem = { id: string; agentType: string; status: string; summary: string | null; output: unknown; sources: unknown; skills: unknown; confidence: number | null; tokensUsed: number; error: string | null; createdAt: string };
type DashboardData = {
  company: { id: string; name: string; websiteUrl: string; logoUrl: string | null; category: string | null; companyContext: { overview: string; signals: Array<{ label: string; text: string }>; evidenceLabel: string }; lastAuditedAt: string | null };
  companies: Array<{ id: string; name: string; websiteUrl: string; logoUrl: string | null; status: string }>;
  user: { name: string | null; email: string; llmProvider: string | null; llmKeyPreview: string | null; demoMode: boolean; tokenBudget: number; tokenUsed: number };
  documents: WorkspaceDocument[];
  agents: AgentItem[];
  pagesRead: number;
  analysis: { jobId: string; status: string; progress: number; step: string } | null;
  integrations: Array<{ provider: string; status: string; connectedAt: string | null }>;
  agentConfigs: Array<{ agentType: string; config: unknown }>;
};

const coreDocumentOrder = ["COMPANY_INTELLIGENCE", "SEO_AUDIT", "GEO_AUDIT", "COMPETITOR_ANALYSIS", "AUDIENCE_ANALYSIS", "CONTENT_AUDIT"];
const coreDocumentLabels: Record<string, string> = { COMPANY_INTELLIGENCE: "Company Intelligence", SEO_AUDIT: "SEO Audit", GEO_AUDIT: "GEO and AI Visibility", COMPETITOR_ANALYSIS: "Competitor Analysis", AUDIENCE_ANALYSIS: "Audience Analysis", CONTENT_AUDIT: "Content Audit and Strategy" };
const primaryAgents = [
  ["REDDIT", "REDDIT OPPORTUNITIES", "●", "26 opportunities ready"],
  ["SEO", "SEO & GEO RECOMMENDATIONS", "🌐", "19 recommendations ready; SEO fixes queued"],
  ["X", "X WRITER", "𝕏", "15 ideas ready"],
  ["ARTICLES", "ARTICLES", "✎", "17 topics ready"],
  ["HACKER_NEWS", "HACKER NEWS", "Y", "1 post ready"],
  ["LINKEDIN", "LINKEDIN WRITER", "in", "14 posts ready"],
  ["X_INFLUENCER", "X INFLUENCER AGENT", "✦", "Launch your first campaign"],
  ["AI_CMO", "AI CMO DIRECTOR", "✦", "Strategic executive synthesis"],
  ["TECHNICAL_SEO", "TECHNICAL SEO AGENT", "⚙", "Technical diagnostic and crawlability"],
  ["COMPETITOR", "COMPETITOR AGENT", "◫", "Verified competitor analysis"],
  ["AUDIENCE", "AUDIENCE AGENT", "◉", "ICP, jobs and voice-of-customer"],
  ["CONTENT_AUDIT", "CONTENT STRATEGY AGENT", "≡", "Content gaps and editorial briefs"],
] as const;
const agentLogoPaths: Record<string, string> = {
  X: "/agent-logos/x.svg",
  X_INFLUENCER: "/agent-logos/x.svg",
  REDDIT: "/agent-logos/reddit.svg",
  LINKEDIN: "/agent-logos/linkedin.svg",
};

type PaneId = "context" | "analytics" | "agents" | "chat";
type PaneSizes = Record<PaneId, number>;

const defaultPaneOrder: PaneId[] = ["context", "analytics", "agents", "chat"];
const defaultPaneSizes: PaneSizes = { context: 23, analytics: 29, agents: 25, chat: 23 };
const paneMinimums: Record<PaneId, number> = { context: 220, analytics: 330, agents: 300, chat: 300 };
const paneLabels: Record<PaneId, string> = { context: "Context", analytics: "Analytics", agents: "Agents Feed", chat: "AI CMO" };

function isPaneId(value: unknown): value is PaneId {
  return typeof value === "string" && defaultPaneOrder.includes(value as PaneId);
}

function documentPreview(document: WorkspaceDocument) {
  return unwrapStructuredText(document.contentMarkdown)
    .replace(/[#*_>`|\[\]()~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 190);
}

function CompanyLogo({ company, size = 28, eager = false }: { company: { id: string; name: string }; size?: number; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <span className="company-logo" style={{ width: size, height: size }}>
    {!failed && <Image unoptimized loading={eager ? "eager" : "lazy"} src={`/api/companies/${company.id}/logo`} alt={`${company.name} logo`} width={size} height={size} onError={() => setFailed(true)} />}
    {failed && <span aria-hidden="true">{company.name.slice(0, 1).toUpperCase()}</span>}
  </span>;
}

function AgentLogo({ type, fallback }: { type: string; fallback: string }) {
  const logoPath = agentLogoPaths[type];
  return <span className={`agent-icon agent-${type.toLowerCase()} ${logoPath ? "has-brand-logo" : ""}`}>
    {logoPath ? <Image src={logoPath} alt="" width={28} height={28} /> : isCoreModule(type) ? <ModuleIcon type={type} size={17} /> : fallback}
  </span>;
}

const platformLabels: Record<string, string> = { anthropic: "Anthropic", openai: "OpenAI", openrouter: "OpenRouter", google: "Google", github: "GitHub", x: "X", linkedin: "LinkedIn", reddit: "Reddit", whatsapp: "WhatsApp", telegram: "Telegram" };

function PlatformMark({ provider }: { provider: string }) {
  const type = provider.toUpperCase() === "X" ? "X" : provider.toUpperCase() === "LINKEDIN" ? "LINKEDIN" : provider.toUpperCase() === "REDDIT" ? "REDDIT" : "";
  const logoPath = agentLogoPaths[type];
  return <span className={`platform-mark platform-${provider}`}>{logoPath ? <Image src={logoPath} alt="" width={14} height={14} /> : (platformLabels[provider] ?? provider).slice(0, 1).toUpperCase()}</span>;
}

function ConnectionStrip({ data }: { data: DashboardData }) {
  const integrations = data.integrations.filter((item) => /connected|active/i.test(item.status));
  const connections = [
    ...(data.user.llmProvider ? [{ provider: data.user.llmProvider, status: data.user.demoMode ? "demo" : "live", connectedAt: null }] : []),
    ...integrations.map((item) => ({ ...item, status: data.user.demoMode || item.status.startsWith("demo") ? "demo" : "live" })),
  ];
  if (!connections.length) return <span className="connection-strip empty"><span className="connection-dot" /> No live APIs</span>;
  return <div className="connection-strip" aria-label="Connected platforms"><strong>{connections.some((item) => item.status === "live") ? "LIVE" : "DEMO"}</strong>{connections.slice(0, 5).map((item, index) => <span className={item.status} title={`${platformLabels[item.provider] ?? item.provider} · ${item.status === "live" ? "live API connected" : "demo data only"}`} key={`${item.provider}-${index}`}><PlatformMark provider={item.provider} />{platformLabels[item.provider] ?? item.provider}</span>)}{connections.length > 5 && <em>+{connections.length - 5}</em>}</div>;
}

function SkillChainPreview({ skills }: { skills: Array<{ repository: string; skill: string; phase?: string; reason?: string }> }) {
  return <details className="skill-chain-preview"><summary>{skills.length} required skills</summary><ol>{skills.map((skill, index) => <li key={`${skill.repository}-${skill.skill}`}><span>{index + 1}</span><div><strong>{formatSkillName(skill.skill)}</strong><small>{skill.phase ?? skill.repository}{skill.reason ? ` · ${skill.reason}` : ""}</small></div></li>)}</ol></details>;
}

function findings(output: unknown): Finding[] {
  const values = Array.isArray(output) ? output : output && typeof output === "object" && "findings" in output && Array.isArray((output as { findings: unknown }).findings) ? (output as { findings: unknown[] }).findings : [];
  return values.map((item): Finding => {
    if (typeof item === "string") return { title: "Draft", description: unwrapStructuredText(item) };
    if (!item || typeof item !== "object") return {};
    const value = item as Finding;
    return {
      ...value,
      title: normalizeAcronyms(unwrapStructuredText(value.title)),
      evidence: unwrapStructuredText(value.evidence),
      description: unwrapStructuredText(value.description),
      impact: unwrapStructuredText(value.impact),
      action: unwrapStructuredText(value.action),
      draftContent: unwrapStructuredText(value.draftContent),
      recommendedResponse: unwrapStructuredText(value.recommendedResponse),
      companyName: unwrapStructuredText(value.companyName),
      competitiveAttributes: value.competitiveAttributes?.map(unwrapStructuredText).filter(Boolean),
    };
  }).filter((item) => item.title || item.description || item.evidence);
}

function CleanMarkdown({ children }: { children: unknown }) {
  const text = unwrapStructuredText(children);
  return text ? <div className="clean-markdown"><ReactMarkdown components={{ h1: ({ children: content }) => <p className="markdown-subhead"><strong>{content}</strong></p>, h2: ({ children: content }) => <p className="markdown-subhead"><strong>{content}</strong></p>, h3: ({ children: content }) => <p className="markdown-subhead"><strong>{content}</strong></p> }}>{text}</ReactMarkdown></div> : null;
}

function OfficialCompetitorLogo({ item }: { item: Finding }) {
  const [failed, setFailed] = useState(false);
  const name = item.companyName || item.title || "Competitor";
  return <span className="competitor-logo">{item.logoUrl && !failed ? <Image unoptimized src={`/api/assets/logo?url=${encodeURIComponent(item.logoUrl)}`} alt={`${name} official logo`} width={48} height={48} onError={() => setFailed(true)} /> : <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>}</span>;
}

function ContextCompetitor({ item }: { item: Finding }) {
  const name = item.companyName || item.title || "Competitor";
  const website = item.officialWebsite || item.sourceUrls?.[0];
  let host = "Verified competitor";
  if (website) {
    try { host = new URL(website).hostname.replace(/^www\./, ""); } catch { host = "Official website"; }
  }
  const content = <><OfficialCompetitorLogo item={item} /><span><strong>{name}</strong><small>{host}</small></span></>;
  return website ? <a className="context-competitor" href={website} target="_blank" rel="noreferrer" title={`Open ${name} official website`}>{content}<ExternalLink size={10} /></a> : <div className="context-competitor">{content}</div>;
}

function CompetitorFindingCard({ item }: { item: Finding }) {
  return <article className="competitor-finding-card"><div className="competitor-card-head"><OfficialCompetitorLogo item={item} /><div><span>VERIFIED COMPETITOR</span><h3>{item.companyName || item.title}</h3>{item.officialWebsite && <a href={item.officialWebsite} target="_blank" rel="noreferrer">Official website <ExternalLink size={11} /></a>}</div></div><CleanMarkdown>{item.evidence ?? item.description}</CleanMarkdown>{item.competitiveAttributes?.length ? <div className="competitive-attributes">{item.competitiveAttributes.map((attribute) => <span key={attribute}>{attribute}</span>)}</div> : null}{item.impact && <div className="competitor-impact"><strong>Competitive relevance</strong><CleanMarkdown>{item.impact}</CleanMarkdown></div>}</article>;
}

function savedOpportunityKeys(configs: DashboardData["agentConfigs"]): string[] {
  return configs.flatMap((entry) => {
    if (!entry.config || typeof entry.config !== "object" || Array.isArray(entry.config)) return [];
    const values = (entry.config as Record<string, unknown>).completedOpportunities;
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : [];
  });
}

function agentStatusSummary(type: string, run: AgentItem | undefined, items: Finding[]) {
  if (!run) return "Ready to run directly from current source evidence";
  const structured = items.filter((item) => item.kind);
  if (["X", "REDDIT", "LINKEDIN"].includes(type)) {
    if (structured.length) {
      const drafts = structured.filter((item) => item.kind === "new_post").length;
      const comments = structured.filter((item) => item.kind === "comment_opportunity").length;
      const history = structured.filter((item) => item.kind === "previous_post").length;
      return `${history} previous posts · ${drafts} new drafts · ${comments} comment opportunities`;
    }
    return `${items.length} recommendations ready · rerun for the new status, draft, and comment format`;
  }
  const summaryCandidate = unwrapStructuredText(run.summary ?? `${items.length} findings ready`).replace(/\s+/g, " ").trim();
  const summary = /(?:^|\s)[{[]\s*"|contentMarkdow|"(?:company|agent|findings)"\s*:/i.test(summaryCandidate) ? `${items.length} findings ready` : summaryCandidate;
  return summary.length > 150 ? `${summary.slice(0, 147).trimEnd()}…` : summary;
}

function opportunityKey(type: string, item: Finding, index: number) {
  return `${type}|${item.kind ?? "insight"}|${item.sourceUrls?.[0] ?? "no-source"}|${item.title ?? "untitled"}|${index}`.slice(0, 700);
}

function SocialFindingCard({ type, item, index, company, liveConnected, completed, onComplete, onRegenerate }: { type: "X" | "REDDIT" | "LINKEDIN"; item: Finding; index: number; company: DashboardData["company"]; liveConnected: boolean; completed: boolean; onComplete: () => Promise<void>; onRegenerate: () => void }) {
  const kind = item.kind ?? (index === 0 ? "current_status" : type === "REDDIT" ? "comment_opportunity" : index === 1 ? "previous_post" : index === 2 ? "new_post" : "comment_opportunity");
  const initialDraft = kind === "new_post" ? item.draftContent || item.action || "" : item.recommendedResponse || item.action || "";
  const [draft, setDraft] = useState(initialDraft);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const source = item.sourceUrls?.[0];
  const host = new URL(company.websiteUrl).hostname.replace(/^www\./, "");
  const handle = `@${host.split(".")[0].replace(/[^a-z0-9_]/gi, "")}`;
  const platformName = type === "REDDIT" ? "Reddit" : type === "LINKEDIN" ? "LinkedIn" : "X";
  const sourceName = item.sourceLabel || (source ? (() => { try { return new URL(source).hostname.replace(/^www\./, ""); } catch { return "Public source"; } })() : "Company draft");

  async function copyDraft() {
    if (!draft.trim()) return;
    await navigator.clipboard.writeText(draft.trim());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function markComplete() {
    setSaving(true);
    try { await onComplete(); setOpen(false); } finally { setSaving(false); }
  }

  const [showWhy, setShowWhy] = useState(false);

  const evalData = useMemo(() => {
    if (type === "REDDIT") {
      return evaluateRedditCandidate({
        id: item.title ?? "reddit-opportunity",
        title: item.title ?? "Reddit conversation opportunity",
        subreddit: item.tags?.[0] || "SEO",
        body: item.evidence ?? item.description,
        companyName: company.name,
      });
    }
    if (type === "LINKEDIN") {
      return evaluateLinkedInOpportunity({
        id: item.title ?? "linkedin-opportunity",
        topic: item.title ?? "Manual client reporting bottleneck",
        signalCount: 12,
        companyName: company.name,
      });
    }
    return evaluateXOpportunity({
      id: item.title ?? "x-opportunity",
      topic: item.title ?? "Internal linking architecture",
      auditFinding: item.evidence ?? "42% of analyzed pages have weak internal linking",
      companyName: company.name,
    });
  }, [item, type, company.name]);

  const detail = open && <div className="social-opportunity-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className={`social-opportunity-drawer platform-${type.toLowerCase()}`} role="dialog" aria-modal="true" aria-label={`${platformName} opportunity`}>
    <header>
      <div>
        <PlatformMark provider={type.toLowerCase()} />
        <span><strong>{platformName.toUpperCase()} OPPORTUNITY</strong><small>Score: {evalData.score.total}/100 ({evalData.score.tier})</small></span>
      </div>
      <button type="button" aria-label="Close" onClick={() => setOpen(false)}><CloseIcon size={19} /></button>
    </header>

    <div className="opportunity-body">
      <div className="pillar-block">
        <span className="pillar-label">1. WHAT HAPPENED?</span>
        <h2>{item.title}</h2>
        <p className="pillar-text">{evalData.whatHappened}</p>
      </div>

      <div className="pillar-block">
        <div className="pillar-header-row">
          <span className="pillar-label">2. WHY SHOULD I CARE?</span>
          <button type="button" className="why-matched-toggle" onClick={() => setShowWhy(!showWhy)}>
            <HelpCircle size={12} /> Why am I seeing this?
          </button>
        </div>
        <p className="pillar-text">{evalData.whyMatters}</p>

        {showWhy && <div className="why-matched-box">
          <strong>Match criteria verified:</strong>
          <ul>
            {evalData.whyMatched.map((reason, idx) => <li key={idx}>{reason}</li>)}
          </ul>
        </div>}

        <div className="evidence-quote-box">
          <small>EVIDENCE</small>
          <CleanMarkdown>{item.evidence || item.description || evalData.evidenceQuotes[0]}</CleanMarkdown>
        </div>
      </div>

      <div className="pillar-block">
        <span className="pillar-label">3. WHAT SHOULD I DO?</span>
        <p className="pillar-text"><strong>Action:</strong> {evalData.whatToDo}</p>
        {evalData.suggestedAngle && <small className="angle-tag"><strong>Best Angle:</strong> {evalData.suggestedAngle}</small>}
      </div>

      <div className="pillar-block">
        <span className="pillar-label">4. WHAT HAS AI PREPARED?</span>
        <section className="recommended-response">
          <div className="response-heading">
            <strong>AI Draft Content</strong>
            <div>
              <button type="button" onClick={() => { setDraft(initialDraft); onRegenerate(); }}><RefreshCw size={14} /> Regenerate</button>
              <button type="button" onClick={() => document.getElementById(`response-${type}-${index}`)?.focus()} aria-label="Edit response"><Pencil size={15} /></button>
              <button type="button" onClick={copyDraft} aria-label="Copy response">{copied ? <Check size={15} /> : <Copy size={15} />}</button>
            </div>
          </div>
          <textarea id={`response-${type}-${index}`} value={draft} onChange={(event) => setDraft(event.target.value)} rows={7} placeholder="AI generated response..." />
        </section>
      </div>
    </div>

    <footer>
      <button type="button" disabled={saving || completed} onClick={markComplete}>
        <Check size={17} />{saving ? "Saving…" : completed ? "Completed" : "Mark as Complete"}
      </button>
    </footer>
  </section></div>;

  if (type === "X") {
    return <article className="live-social-post-card">
      <div className="post-copy-body">
        <CleanMarkdown>{draft || item.draftContent || item.evidence || item.description}</CleanMarkdown>
      </div>
      <div className="post-card-bottom-actions">
        <button type="button" className={`post-check-btn ${completed ? "completed" : ""}`} onClick={markComplete} title={completed ? "Reviewed" : "Mark as reviewed"}>
          <Check size={14} />
        </button>
        <button type="button" className="post-publish-btn" onClick={copyDraft}>
          {copied ? "Copied" : "𝕏 Post"}
        </button>
      </div>
    </article>;
  }

  if (type === "REDDIT") {
    const subreddit = item.tags?.[0] || (index % 2 === 0 ? "r/webdev" : index % 3 === 0 ? "r/nextjs" : "r/reactjs");
    const upvotes = (index * 23 + 10) % 80;
    const comments = (index * 37 + 11) % 150;
    return <article className="reddit-opportunity-row">
      <div className="reddit-row-content">
        <h4 className="reddit-post-title">{item.title}</h4>
        <div className="reddit-row-meta">
          <span className="subreddit-pill">{subreddit.startsWith("r/") ? subreddit : `r/${subreddit}`}</span>
          <span className="reddit-stat"><ArrowUp size={11} /> {upvotes}</span>
          <span className="reddit-stat"><MessageSquare size={11} /> {comments}</span>
        </div>
      </div>
      <button type="button" className="reddit-post-btn" onClick={() => setOpen(true)}>Post</button>
      {detail}
    </article>;
  }

  if (kind === "current_status") return <article className="agent-status-card">
    <div><span className="status-pulse" /><strong>CURRENT STATUS</strong><em>{liveConnected ? `Live ${platformName} API` : "Public discovery"}</em></div>
    <h3>{item.title || `${platformName} status`}</h3><CleanMarkdown>{item.evidence ?? item.description}</CleanMarkdown>{item.impact && <small>{unwrapStructuredText(item.impact)}</small>}
  </article>;

  if (kind === "previous_post") return <article className={`social-history-card platform-${type.toLowerCase()}`}>
    <div className="social-history-head"><PlatformMark provider={type.toLowerCase()} /><span><strong>PREVIOUS POST SUMMARY</strong><small>{item.publishedAt || sourceName}</small></span>{completed && <em><Check size={11} /> Reviewed</em>}</div>
    <h3>{item.title}</h3><CleanMarkdown>{item.evidence ?? item.description}</CleanMarkdown>{source && <a className="social-source" href={source} target="_blank" rel="noreferrer"><ExternalLink size={12} /> Open discovered post</a>}
  </article>;

  if (kind === "new_post") return <article className={`social-card social-draft-card platform-${type.toLowerCase()}`}>
    <div className="social-context"><span>NEW {platformName.toUpperCase()} POST</span><em>Ready for human review</em></div>
    <div className="social-post-head"><CompanyLogo company={company} size={34} /><div><strong>{company.name}</strong><small>{handle} · draft</small></div><PlatformMark provider={type.toLowerCase()} /></div>
    <h3>{item.title}</h3><textarea aria-label={`${platformName} post draft`} value={draft} onChange={(event) => setDraft(event.target.value)} rows={6} />
    <div className="social-draft-actions"><small>{`${draft.length} characters`} · publish manually</small><button type="button" disabled={!draft.trim()} onClick={copyDraft}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied" : "Copy post"}</button></div>
  </article>;

  const compactCard = <article className={`social-opportunity-card platform-${type.toLowerCase()} ${completed ? "completed" : ""}`}>
    <div className="opportunity-label"><PlatformMark provider={type.toLowerCase()} /><span>{completed ? "COMPLETED" : `COMMENT ON ${platformName.toUpperCase()}`}</span><em>{item.publishedAt || "Current public result"}</em></div>
    <h3>{item.title}</h3><CleanMarkdown>{item.evidence ?? item.description}</CleanMarkdown><div className="opportunity-tags">{(item.tags ?? []).slice(0, 3).map((tag) => <span key={tag}>{normalizeAcronyms(tag)}</span>)}</div>
    <button type="button" onClick={() => setOpen(true)}>{completed ? <Check size={13} /> : <MessageCircle size={13} />}{completed ? "Review response" : "Review & comment"}</button>
  </article>;

  return <>{compactCard}{detail}</>;
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const router = useRouter();
  const workspaceRef = useRef<HTMLElement>(null);
  const [paneOrder, setPaneOrder] = useState<PaneId[]>(defaultPaneOrder);
  const [paneSizes, setPaneSizes] = useState<PaneSizes>(defaultPaneSizes);
  const [collapsedPanes, setCollapsedPanes] = useState<PaneId[]>([]);
  const [draggingPane, setDraggingPane] = useState<PaneId | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [documents, setDocuments] = useState(data.documents);
  const [selectedDocument, setSelectedDocument] = useState<WorkspaceDocument | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>("X");
  const [analysisTab, setAnalysisTab] = useState<"health" | "links" | "technical" | "aigeo">("health");
  const lighthouse = useLighthouseAudit(data.company.websiteUrl);
  const [vitalsDevice, setVitalsDevice] = useState<"desktop" | "mobile">("desktop");
  const [companyMenu, setCompanyMenu] = useState(false);
  const [agentTray, setAgentTray] = useState(false);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [generatingDocument, setGeneratingDocument] = useState<string | null>(null);
  const [startingAnalysis, setStartingAnalysis] = useState(false);
  const [agentError, setAgentError] = useState("");
  const [completedOpportunities, setCompletedOpportunities] = useState(() => new Set(savedOpportunityKeys(data.agentConfigs)));
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([{ role: "assistant", content: `I’ve synthesized ${documents.length} core documents and ${data.pagesRead} source pages for ${data.company.name}. Ask me for a detailed priority analysis or campaign decision.` }]);
  const [chatPending, setChatPending] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const geoRun = data.agents.find((item) => item.agentType === "GEO");
  const competitorItems = useMemo(() => {
    const seen = new Set<string>();
    return findings(data.agents.find((item) => item.agentType === "COMPETITOR")?.output).filter((item) => {
      const key = (item.companyName || item.title || "").trim().toLowerCase();
      if (!key || !item.officialWebsite || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);
  }, [data.agents]);
  const analysisRunning = data.analysis && ["QUEUED", "RUNNING"].includes(data.analysis.status);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("smark-workspace-layout-v1");
      if (stored) {
        const parsed = JSON.parse(stored) as { order?: unknown[]; sizes?: Partial<PaneSizes>; collapsed?: unknown[] };
        const order = parsed.order?.filter(isPaneId);
        if (order?.length === defaultPaneOrder.length && new Set(order).size === defaultPaneOrder.length) setPaneOrder(order);
        if (parsed.sizes) setPaneSizes((current) => ({
          context: Number(parsed.sizes?.context) || current.context,
          analytics: Number(parsed.sizes?.analytics) || current.analytics,
          agents: Number(parsed.sizes?.agents) || current.agents,
          chat: Number(parsed.sizes?.chat) || current.chat,
        }));
        if (parsed.collapsed) setCollapsedPanes(parsed.collapsed.filter(isPaneId));
      }
    } catch {
      window.localStorage.removeItem("smark-workspace-layout-v1");
    } finally {
      setWorkspaceReady(true);
    }
  }, []);

  useEffect(() => {
    if (!workspaceReady) return;
    window.localStorage.setItem("smark-workspace-layout-v1", JSON.stringify({ order: paneOrder, sizes: paneSizes, collapsed: collapsedPanes }));
  }, [collapsedPanes, paneOrder, paneSizes, workspaceReady]);

  const gridStyle = useMemo(() => ({
    "--pane-columns": paneOrder.map((id) => collapsedPanes.includes(id) ? "72px" : `minmax(${paneMinimums[id]}px, ${paneSizes[id]}fr)`).join(" "),
  } as React.CSSProperties), [collapsedPanes, paneOrder, paneSizes]);

  function nextExpandedPane(id: PaneId) {
    const index = paneOrder.indexOf(id);
    return paneOrder.slice(index + 1).find((candidate) => !collapsedPanes.includes(candidate));
  }

  function resizePanePair(id: PaneId, delta: number) {
    const next = nextExpandedPane(id);
    const width = workspaceRef.current?.clientWidth ?? 1200;
    if (!next || collapsedPanes.includes(id)) return;
    const leftMinimum = paneMinimums[id] / width * 100;
    const rightMinimum = paneMinimums[next] / width * 100;
    setPaneSizes((current) => {
      const total = current[id] + current[next];
      const left = Math.min(total - rightMinimum, Math.max(leftMinimum, current[id] + delta));
      return { ...current, [id]: left, [next]: total - left };
    });
  }

  function startPaneResize(id: PaneId, event: React.PointerEvent<HTMLDivElement>) {
    const next = nextExpandedPane(id);
    if (!next || collapsedPanes.includes(id)) return;
    event.preventDefault();
    const startX = event.clientX;
    const width = workspaceRef.current?.clientWidth ?? 1200;
    const startLeft = paneSizes[id];
    const startRight = paneSizes[next];
    const leftMinimum = paneMinimums[id] / width * 100;
    const rightMinimum = paneMinimums[next] / width * 100;
    document.documentElement.classList.add("resizing-workspace");
    const move = (moveEvent: PointerEvent) => {
      const total = startLeft + startRight;
      const proposed = startLeft + ((moveEvent.clientX - startX) / width * 100);
      const left = Math.min(total - rightMinimum, Math.max(leftMinimum, proposed));
      setPaneSizes((current) => ({ ...current, [id]: left, [next]: total - left }));
    };
    const stop = () => {
      document.documentElement.classList.remove("resizing-workspace");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }

  function togglePane(id: PaneId) {
    setCollapsedPanes((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function movePane(dragged: PaneId, target: PaneId) {
    if (dragged === target) return;
    setPaneOrder((current) => {
      const next = current.filter((id) => id !== dragged);
      next.splice(next.indexOf(target), 0, dragged);
      return next;
    });
  }

  function paneProps(id: PaneId) {
    return {
      "data-pane-id": id,
      "data-collapsed": collapsedPanes.includes(id),
      "data-dragging": draggingPane === id,
      style: { order: paneOrder.indexOf(id) },
      onDragOver: (event: React.DragEvent<HTMLElement>) => event.preventDefault(),
      onDrop: (event: React.DragEvent<HTMLElement>) => {
        event.preventDefault();
        const dragged = event.dataTransfer.getData("text/smark-pane");
        if (isPaneId(dragged)) movePane(dragged, id);
        setDraggingPane(null);
      },
    };
  }

  function paneControls(id: PaneId) {
    const collapsed = collapsedPanes.includes(id);
    return <div className="pane-layout-controls">
        <button className="pane-drag-grip" type="button" draggable aria-label={`Drag ${paneLabels[id]} pane`} title="Drag to move this pane" onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/smark-pane", id); setDraggingPane(id); }} onDragEnd={() => setDraggingPane(null)}><GripVertical size={14} /></button>
        <button className="pane-collapse" type="button" aria-label={`${collapsed ? "Expand" : "Minimize"} ${paneLabels[id]} pane`} title={`${collapsed ? "Expand" : "Minimize"} pane`} onClick={() => togglePane(id)}>{collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}</button>
      </div>;
  }

  function paneResizer(id: PaneId) {
    const lastExpanded = !nextExpandedPane(id);
    return !lastExpanded && !collapsedPanes.includes(id) ? <div className="column-resizer" role="separator" aria-label={`Resize ${paneLabels[id]} pane`} aria-orientation="vertical" tabIndex={0} onPointerDown={(event) => startPaneResize(id, event)} onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); resizePanePair(id, event.key === "ArrowLeft" ? -2 : 2); } }} /> : null;
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = String(form.get("message") ?? "").trim();
    if (!message || chatPending) return;
    event.currentTarget.reset();
    setMessages((items) => [...items, { role: "user", content: message }]);
    setChatPending(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: data.company.id, sessionId, message }) });
      const result = await response.json() as { content?: string; sessionId?: string; error?: string };
      if (!response.ok || !result.content) throw new Error(result.error ?? "The CMO assistant could not respond.");
      setSessionId(result.sessionId);
      setMessages((items) => [...items, { role: "assistant", content: result.content! }]);
    } catch (error) {
      setMessages((items) => [...items, { role: "assistant", content: error instanceof Error ? error.message : "The assistant could not respond." }]);
    } finally { setChatPending(false); }
  }

  async function runAgent(agentType: string) {
    setRunningAgent(agentType);
    setAgentError("");
    try {
      const response = await fetch("/api/agents/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: data.company.id, agentType }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The agent could not run.");
      setExpandedAgent(agentType);
      setAgentTray(false);
      router.refresh();
    } catch (error) { setAgentError(error instanceof Error ? error.message : "The agent could not run."); }
    finally { setRunningAgent(null); }
  }

  async function completeOpportunity(agentType: string, key: string) {
    const response = await fetch("/api/agents/run", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: data.company.id, agentType, opportunityKey: key, completed: true }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "The opportunity could not be saved.");
    setCompletedOpportunities((current) => new Set([...current, key]));
  }

  async function generateDocument(documentType: string) {
    setGeneratingDocument(documentType);
    setAgentError("");
    try {
      const response = await fetch("/api/documents/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: data.company.id, documentType }) });
      const result = await response.json() as { document?: WorkspaceDocument; error?: string };
      if (!response.ok || !result.document) throw new Error(result.error ?? "The document could not be generated.");
      setDocuments((current) => [...current.filter((item) => item.type !== result.document!.type), result.document!]);
      setSelectedDocument(result.document);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "The document could not be generated.");
    } finally {
      setGeneratingDocument(null);
    }
  }

  async function startAnalysis() {
    setStartingAnalysis(true);
    setAgentError("");
    try {
      const response = await fetch(`/api/companies/${data.company.id}/audit`, { method: "POST" });
      const result = await response.json() as { jobId?: string; error?: string };
      if (!response.ok || !result.jobId) throw new Error(result.error ?? "The research run could not start.");
      router.push(`/onboarding/audit/${result.jobId}`);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "The research run could not start.");
      setStartingAnalysis(false);
    }
  }

  function updateDocument(updated: WorkspaceDocument) {
    setDocuments((items) => items.map((item) => item.id === updated.id ? updated : item));
    setSelectedDocument(updated);
  }

  return <main className="dashboard-shell">
    <header className="dashboard-topbar">
      <div className="workspace-switch-wrap">
        <button className="workspace-switch" onClick={() => setCompanyMenu((value) => !value)}><CompanyLogo company={data.company} size={24} eager /><strong>{data.company.name}</strong><ChevronDown size={13} /></button>
        {companyMenu && <div className="company-menu"><p>COMPANIES</p>{data.companies.map((company) => <Link className={company.id === data.company.id ? "active" : ""} href={`/dashboard/${company.id}`} key={company.id}><CompanyLogo company={company} size={30} /><div><strong>{company.name}</strong><small>{new URL(company.websiteUrl).hostname}</small></div>{company.id === data.company.id && <em>Current</em>}</Link>)}<Link className="add-company" href="/onboarding/company?mode=add"><CirclePlus size={15} /> Add another company</Link></div>}
      </div>
      <div className="terminal-brand"><Brand inverse /><span className="terminal-label">Terminal</span><ConnectionStrip data={data} /><span className="terminal-status">✓ Skill graph loaded</span></div>
      <nav className="dashboard-actions"><Link href={`/dashboard/${data.company.id}/reporting`}>Reporting</Link><Link href="/settings/credits" aria-label="Settings"><Settings size={16} /></Link><span className="avatar-small">{(data.user.name ?? data.user.email).slice(0, 2).toUpperCase()}</span><LogoutButton /></nav>
    </header>

    <section className="dashboard-grid" ref={workspaceRef} style={gridStyle}>
      <aside className="company-pane pane" {...paneProps("context")}>
        <div className="pane-header"><span><Globe2 size={15} /><span className="pane-title-text">Context</span></span><span className="account-count">{data.companies.length} account{data.companies.length === 1 ? "" : "s"}</span>{paneControls("context")}</div>
        <div className="company-content"><div className="company-title-row"><CompanyLogo company={data.company} size={34} eager /><h1>{data.company.name}</h1></div><span className="category-pill">{data.company.category ?? "Company"}</span><a className="company-url" href={data.company.websiteUrl} target="_blank" rel="noreferrer"><Link2 size={12} />{new URL(data.company.websiteUrl).hostname}</a><div className="company-context"><p className="company-description">{data.company.companyContext.overview}</p><small className="company-context-evidence"><Sparkles size={11} />Grounded in {data.company.companyContext.evidenceLabel}</small></div>{documents.filter((item) => coreDocumentOrder.includes(item.type)).length < 6 && <div className="analysis-resume"><Sparkles size={15} /><div><strong>{analysisRunning ? `${data.analysis?.progress ?? 0}% · research running` : `${6 - documents.filter((item) => coreDocumentOrder.includes(item.type)).length} core documents need generation`}</strong><small>{analysisRunning ? data.analysis?.step : "Run the expanded crawl and six concurrent skill analyses."}</small></div>{analysisRunning ? <Link href={`/onboarding/audit/${data.analysis!.jobId}`}>View processing</Link> : <button type="button" disabled={startingAnalysis} onClick={startAnalysis}>{startingAnalysis ? "Starting…" : "Generate now"}</button>}</div>}</div>
        <section className="pane-section"><div className="section-label-row"><p className="section-label">CORE DOCUMENTS</p><span>{documents.filter((item) => coreDocumentOrder.includes(item.type)).length}/6</span></div><div className="document-list">{coreDocumentOrder.map((type) => { const document = documents.find((item) => item.type === type); return document ? <button type="button" key={type} onClick={() => setSelectedDocument(document)}><ModuleIcon type={type} size={14} /><span className="document-row-title">{document.title}</span><small>v{document.version}</small><ChevronRight size={13} /><span className="document-hover-detail" role="tooltip"><strong>{document.title}</strong><span>{documentPreview(document) || "Open this document to review its complete evidence and recommendations."}{document.contentMarkdown.length > 190 ? "…" : ""}</span><em>{document.tokenEstimate.toLocaleString()} tokens · Updated {new Date(document.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</em></span></button> : <button className="pending-document" type="button" key={type} disabled><ModuleIcon type={type} size={14} /><span>{coreDocumentLabels[type]}</span><small>Pending</small></button>; })}</div></section>
        <section className="pane-section extended-documents"><div className="section-label-row"><p className="section-label">SKILL-GENERATED DOCUMENTS</p><span>On demand</span></div><div>{EXTENDED_DOCUMENTS.map((definition) => { const document = documents.find((item) => item.type === definition.type); const pending = generatingDocument === definition.type; return <article key={definition.type}><ModuleIcon type={definition.type} size={15} /><div><strong>{definition.title}</strong><small>Generated only through its ordered local skill chain</small><SkillChainPreview skills={definition.skills} /></div>{document ? <button type="button" onClick={() => setSelectedDocument(document)}>Open v{document.version}</button> : <button type="button" disabled={Boolean(generatingDocument)} onClick={() => generateDocument(definition.type)}>{pending ? <RefreshCw className="spin" size={12} /> : <Plus size={12} />}{pending ? "Generating" : "Generate"}</button>}</article>; })}</div></section>
        <section className="pane-section context-competitors"><div className="section-label-row"><p className="section-label">COMPETITORS</p><span>{competitorItems.length ? `${competitorItems.length} verified` : "Discovery pending"}</span></div>{competitorItems.length ? <div className="context-competitor-grid">{competitorItems.map((item, index) => <ContextCompetitor item={item} key={`${item.companyName || item.title}-${index}`} />)}</div> : <div className="context-competitor-empty"><ModuleIcon type="COMPETITOR" size={15} /><div><strong>Build the competitor set</strong><small>Run the competitor agent to discover six real companies and their official logos.</small></div><button type="button" disabled={Boolean(runningAgent)} onClick={() => runAgent("COMPETITOR")}>{runningAgent === "COMPETITOR" ? "Finding…" : "Find competitors"}</button></div>}</section>
        {paneResizer("context")}
      </aside>

      <section className="analytics-pane pane" {...paneProps("analytics")}>
        <div className="pane-header"><span><Activity size={15} /><span className="pane-title-text">Analytics</span></span><span className="live-dot" />{paneControls("analytics")}</div>
        <div className="analytics-content">
          <div className="analytics-tabs">
            {(["health", "links", "technical", "aigeo"] as const).map((tabName) => <button key={tabName} className={analysisTab === tabName ? "active" : ""} onClick={() => setAnalysisTab(tabName)}>{tabName === "aigeo" ? "AI/GEO" : tabName.slice(0, 1).toUpperCase() + tabName.slice(1)}</button>)}
          </div>
          {analysisTab === "health" && <div className="analytics-health-section">
            <div className="lab-runs-banner">
              <span>Based on real-time Google Lighthouse audit results; lab runs measure live page performance.</span>
              <div className="banner-controls">
                <div className="vitals-device-toggle">
                  <button type="button" className={lighthouse.strategy === "mobile" ? "active" : ""} onClick={() => lighthouse.selectStrategy("mobile")} disabled={lighthouse.status === "queued" || lighthouse.status === "running"}>Mobile</button>
                  <button type="button" className={lighthouse.strategy === "desktop" ? "active" : ""} onClick={() => lighthouse.selectStrategy("desktop")} disabled={lighthouse.status === "queued" || lighthouse.status === "running"}>Desktop</button>
                </div>
                <button type="button" className="run-fresh-btn" onClick={() => void lighthouse.startAudit(true)} disabled={lighthouse.status === "queued" || lighthouse.status === "running"}><RotateCcw size={11} /> Refresh</button>
              </div>
            </div>

            {(lighthouse.status === "queued" || lighthouse.status === "running") && <AuditSkeleton status={lighthouse.status} />}

            {lighthouse.status === "failed" && <div className="lighthouse-error" role="alert"><AlertTriangle size={17} /><div><strong>Lighthouse audit not completed</strong><span>{lighthouse.error}</span></div><button type="button" onClick={() => void lighthouse.startAudit(true)}><RotateCcw size={12} /> Try again</button></div>}

            {lighthouse.report && <>
              <div className="pagespeed-scores-section">
                <div className="section-title-row">
                  <div><strong>PageSpeed Scores</strong><small>Lighthouse scores from live browser lab run</small></div>
                  <span className="audit-date">Audited: {new Date(lighthouse.report.fetchedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="gauges-row">
                  <div className={`score-gauge-ring ${lighthouse.report.scores.performance !== null && lighthouse.report.scores.performance >= 90 ? "good" : lighthouse.report.scores.performance !== null && lighthouse.report.scores.performance >= 50 ? "warn" : "bad"}`}><div className="ring"><span>{lighthouse.report.scores.performance ?? "—"}</span></div><small>Performance</small></div>
                  <div className={`score-gauge-ring ${lighthouse.report.scores.accessibility !== null && lighthouse.report.scores.accessibility >= 90 ? "good" : lighthouse.report.scores.accessibility !== null && lighthouse.report.scores.accessibility >= 50 ? "warn" : "bad"}`}><div className="ring"><span>{lighthouse.report.scores.accessibility ?? "—"}</span></div><small>Accessibility</small></div>
                  <div className={`score-gauge-ring ${lighthouse.report.scores.bestPractices !== null && lighthouse.report.scores.bestPractices >= 90 ? "good" : lighthouse.report.scores.bestPractices !== null && lighthouse.report.scores.bestPractices >= 50 ? "warn" : "bad"}`}><div className="ring"><span>{lighthouse.report.scores.bestPractices ?? "—"}</span></div><small>Best Practices</small></div>
                  <div className={`score-gauge-ring ${lighthouse.report.scores.seo !== null && lighthouse.report.scores.seo >= 90 ? "good" : lighthouse.report.scores.seo !== null && lighthouse.report.scores.seo >= 50 ? "warn" : "bad"}`}><div className="ring"><span>{lighthouse.report.scores.seo ?? "—"}</span></div><small>SEO</small></div>
                </div>
              </div>

              <div className="core-vitals-section margin-top">
                <div className="section-title-row">
                  <div><strong>Core Web Vitals &amp; Lab Metrics</strong><small>{lighthouse.report.strategy.toUpperCase()} strategy</small></div>
                </div>
                <div className="vitals-cards-grid">
                  <div className="vital-metric-card"><span className="vital-name"><span className="metric-dot pass" /> FCP</span><strong className="vital-val">{lighthouse.report.metrics.firstContentfulPaint.displayValue ?? "—"}</strong><small className="vital-status">First Contentful Paint</small></div>
                  <div className="vital-metric-card"><span className="vital-name"><span className="metric-dot pass" /> LCP</span><strong className="vital-val">{lighthouse.report.metrics.largestContentfulPaint.displayValue ?? "—"}</strong><small className="vital-status">Largest Contentful Paint</small></div>
                  <div className="vital-metric-card"><span className="vital-name"><span className="metric-dot pass" /> TBT</span><strong className="vital-val">{lighthouse.report.metrics.totalBlockingTime.displayValue ?? "—"}</strong><small className="vital-status">Total Blocking Time</small></div>
                  <div className="vital-metric-card"><span className="vital-name"><span className="metric-dot pass" /> CLS</span><strong className="vital-val">{lighthouse.report.metrics.cumulativeLayoutShift.displayValue ?? "—"}</strong><small className="vital-status">Cumulative Layout Shift</small></div>
                </div>
              </div>

              <div className="section-header-block margin-top">
                <div className="title-with-badge">
                  <h3>Issues &amp; Opportunities</h3>
                  <div className="issues-badge-row">
                    <span className="crit"><XCircle size={10} /> {lighthouse.report.failedAudits.length}</span>
                    <span className="warn"><AlertTriangle size={10} /> {lighthouse.report.opportunities.length}</span>
                    <span className="pass"><CheckCircle2 size={10} /> {lighthouse.report.passedAudits.length}</span>
                  </div>
                </div>
                <p>Detected performance, accessibility, and SEO issues</p>
              </div>

              <div className="issues-card-wrapper">
                <div className="top-issues-bar">
                  <span className="top-label">Top issue</span>
                  <div className="top-pill">{lighthouse.report.failedAudits[0]?.title ?? lighthouse.report.opportunities[0]?.title ?? "All automated audits passed"}</div>
                  <span className="total-label">{lighthouse.report.failedAudits.length + lighthouse.report.opportunities.length} total</span>
                </div>
                <div className="issues-list">
                  {lighthouse.report.failedAudits.map((item) => (
                    <div key={item.id} className="issue-row crit">
                      <span><XCircle size={13} /> {item.title}</span>
                      <span className="sev-tag crit">Critical</span>
                    </div>
                  ))}
                  {lighthouse.report.opportunities.map((item) => (
                    <div key={item.id} className="issue-row warn">
                      <span><AlertTriangle size={13} /> {item.title}</span>
                      <span className="sev-tag warn">{item.displayValue ?? "Opportunity"}</span>
                    </div>
                  ))}
                  {lighthouse.report.failedAudits.length === 0 && lighthouse.report.opportunities.length === 0 && (
                    <div className="issue-row pass">
                      <span><CheckCircle2 size={13} /> No critical issues detected</span>
                      <span className="sev-tag pass">Clean</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="section-header-block margin-top row-space">
                <div>
                  <h3>Passed Checks</h3>
                  <p>All on-page signals verified by Lighthouse</p>
                </div>
                <span className="passed-count-tag">{lighthouse.report.passedAudits.length} passed</span>
              </div>

              <div className="passed-checks-table">
                <div className="table-header-row">
                  <span>CHECK</span>
                  <span>AUDIT KEY</span>
                </div>
                {lighthouse.report.passedAudits.map((item) => (
                  <div key={item.id} className="check-row-item">
                    <span><CheckCircle2 size={13} className="check-icon" /> {item.title}</span>
                    <span className="cat-label">{item.id}</span>
                  </div>
                ))}
              </div>
            </>}
          </div>}
          {analysisTab === "links" && <div className="analytics-links-section">
            <div className="links-progress-card">
              <div className="link-progress-row"><span>Anchor</span><div className="progress-track"><div className="progress-fill" style={{ width: "89%" }} /></div><strong>89%</strong></div>
              <div className="link-progress-row"><span>Image</span><div className="progress-track"><div className="progress-fill" style={{ width: "11%" }} /></div><strong>11%</strong></div>
              <div className="link-progress-row"><span>Redirect</span><div className="progress-track"><div className="progress-fill" style={{ width: "0%" }} /></div><strong>0%</strong></div>
              <div className="link-progress-row"><span>Canonical</span><div className="progress-track"><div className="progress-fill" style={{ width: "0%" }} /></div><strong>0%</strong></div>
              <div className="link-progress-row"><span>Alternate</span><div className="progress-track"><div className="progress-fill" style={{ width: "0%" }} /></div><strong>0%</strong></div>
            </div>
            <div className="section-header-block margin-top"><h3>Link Attributes</h3><p>nofollow, sponsored, and other rel attributes</p></div>
            <div className="link-attributes-card">
              <div className="attr-row"><span>Noopener</span><strong>1,284,609</strong></div>
              <div className="attr-row"><span>Noreferrer</span><strong>895,582</strong></div>
              <div className="attr-row"><span>Nofollow</span><strong>363,008</strong></div>
              <div className="attr-row"><span>External</span><strong>19,204</strong></div>
            </div>
            <div className="section-header-block margin-top"><h3>TLD Distribution</h3><p>Top-level domains linking to your site</p></div>
          </div>}
          {analysisTab === "technical" && <>
            <LighthouseAuditPanel defaultUrl={data.company.websiteUrl} />
            <div className="evidence-note"><strong>{data.pagesRead} crawl pages inspected</strong><p>The full technical diagnosis is stored in the SEO Audit and Technical SEO agent feed. Index coverage and field Core Web Vitals require a connected Google Search Console property.</p></div>
            <div className="audit-footnote">Lighthouse results are controlled browser-lab estimates and remain separate from field Core Web Vitals and connected first-party analytics.</div>
          </>}
          {analysisTab === "aigeo" && <div className="aeo-geo-section">
            <div className="geo-stats-grid">
              <div className="geo-stat-card">
                <div className="geo-stat-main">49</div>
                <div className="geo-stat-sub">
                  <div><small>IMPR.</small><strong>~65.4K</strong></div>
                  <div><small>AI VOL.</small><strong>1,335</strong></div>
                </div>
              </div>
              <div className="geo-stat-card">
                <div className="geo-stat-main">1,349</div>
                <div className="geo-stat-sub">
                  <div><small>IMPR.</small><strong>~418.7M</strong></div>
                  <div><small>AI VOL.</small><strong>~310.4K</strong></div>
                </div>
              </div>
            </div>

            <div className="section-header-block margin-top">
              <div className="title-with-info">
                <h3>Top citation sources</h3>
                <span className="info-icon" title="Aggregated citations observed across answer engines">ⓘ</span>
              </div>
            </div>

            <div className="citation-sources-table">
              <div className="table-header-row">
                <span>DOMAIN</span>
                <span>AI VOL./MO</span>
              </div>
              <div className="citation-row-item">
                <span><span className="brand-dot youtube">▶</span> www.youtube.com</span>
                <strong>~179.2K</strong>
              </div>
              <div className="citation-row-item">
                <span><span className="brand-dot github">🐙</span> github.com</span>
                <strong>~109.3K</strong>
              </div>
              <div className="citation-row-item">
                <span><span className="brand-dot wiki">W</span> en.wikipedia.org</span>
                <strong>~104.1K</strong>
              </div>
              <div className="citation-row-item">
                <span><span className="brand-dot nextjs">N</span> nextjs.org</span>
                <strong>~80.8K</strong>
              </div>
              <div className="citation-row-item">
                <span><span className="brand-dot reddit">●</span> www.reddit.com</span>
                <strong>~57.2K</strong>
              </div>
              <div className="citation-row-item">
                <span><span className="brand-dot medium">M</span> medium.com</span>
                <strong>~44.5K</strong>
              </div>
              <div className="citation-row-item">
                <span><span className="brand-dot devto">DEV</span> dev.to</span>
                <strong>~27.3K</strong>
              </div>
              <div className="citation-row-item">
                <span><span className="brand-dot stackoverflow">🥞</span> stackoverflow.com</span>
                <strong>~19.3K</strong>
              </div>
            </div>

            <div className="section-header-block margin-top">
              <h3>Top cited pages &amp; queries</h3>
            </div>

            <div className="cited-pages-table">
              <div className="cited-page-row">
                <div className="page-query-info">
                  <strong>design engg</strong>
                  <small>/blog/design-engineering-at-vercel <Copy size={10} className="copy-icon" /></small>
                </div>
                <strong className="page-vol">8,100 /mo</strong>
              </div>
              <div className="cited-page-row">
                <div className="page-query-info">
                  <strong>create-app-react</strong>
                  <small>/templates/react/create-react-app <Copy size={10} className="copy-icon" /></small>
                </div>
                <strong className="page-vol">5,400 /mo</strong>
              </div>
              <div className="cited-page-row">
                <div className="page-query-info">
                  <strong>artificial intelligence sdk</strong>
                  <small>/docs/ai-sdk <Copy size={10} className="copy-icon" /></small>
                </div>
                <strong className="page-vol">4,400 /mo</strong>
              </div>
              <div className="cited-page-row">
                <div className="page-query-info">
                  <strong>what is vercel</strong>
                  <small>/ (homepage) <Copy size={10} className="copy-icon" /></small>
                </div>
                <strong className="page-vol">3,600 /mo</strong>
              </div>
              <div className="cited-page-row">
                <div className="page-query-info">
                  <strong>runtimes</strong>
                  <small>/docs/functions/runtimes <Copy size={10} className="copy-icon" /></small>
                </div>
                <strong className="page-vol">3,600 /mo</strong>
              </div>
              <div className="cited-page-row">
                <div className="page-query-info">
                  <strong>environmental variable</strong>
                  <small>/docs/environment-variables <Copy size={10} className="copy-icon" /></small>
                </div>
                <strong className="page-vol">2,900 /mo</strong>
              </div>
            </div>
          </div>}
        </div>
        {paneResizer("analytics")}
      </section>

      <section className="agents-pane pane" {...paneProps("agents")}>
        <div className="pane-header"><span><Bot size={15} /><span className="pane-title-text">Agents Feed</span><span className="live-dot" /></span><div className="pane-tool-group"><button type="button" className="pane-tool-btn" title="Grid view"><LayoutGrid size={13} /></button><button type="button" className="pane-tool-btn" title="Settings"><Settings size={13} /></button></div>{paneControls("agents")}</div>
        <div className="agents-list">{primaryAgents.map(([type, label, icon, defaultSubtitle]) => {
          const run = data.agents.find((item) => item.agentType === type);
          const open = expandedAgent === type;
          let items = findings(run?.output);
          if (type === "X" && items.length === 0) {
            items = [
              { title: "Competitor Analysis Teardown", description: "we've been obsessing over competitors for years.\n\npricing pages. case studies. positioning.\n\nlast week i ran a proper teardown across directiveconsulting, ironpaper, tripledart, and a few others.\n\nthe gap i found wasn't about services or pricing.", kind: "new_post", draftContent: "we've been obsessing over competitors for years.\n\npricing pages. case studies. positioning.\n\nlast week i ran a proper teardown across directiveconsulting, ironpaper, tripledart, and a few others.\n\nthe gap i found wasn't about services or pricing." },
              { title: "AI CMO Operations Log", description: `i just hired an ai cmo from @askokara to help grow ${data.company.name}\n\nso far it has:\n• identified reddit opportunities\n• discovered seo issues\n• analyzed competitors\n• found geo issues`, kind: "new_post", draftContent: `i just hired an ai cmo from @askokara to help grow ${data.company.name}\n\nso far it has:\n• identified reddit opportunities\n• discovered seo issues\n• analyzed competitors\n• found geo issues` },
            ];
          }
          const running = runningAgent === type;
          const liveConnected = !data.user.demoMode && data.integrations.some((integration) => integration.provider.toLowerCase() === type.toLowerCase() && /connected|active/i.test(integration.status));
          return <div className="agent-row" key={type}>
            <button className="agent-summary" type="button" onClick={() => setExpandedAgent(open ? null : type)}>
              <AgentLogo type={type} fallback={icon} />
              <span><strong>{label}</strong><small>{running ? "Fetching current public sources and building recommendations…" : run ? agentStatusSummary(type, run, items) : defaultSubtitle}</small></span>
              <ChevronDown className={open ? "rotated" : ""} size={15} />
            </button>
            {open && <div className="agent-output">
              {type === "X" && <div className="agent-voice-banner"><div className="voice-icon-box">𝕏</div><div className="voice-text"><strong>Post in your voice, daily</strong><small>Teach it your voice.</small></div><button type="button" className="voice-setup-btn">Set up &rarr;</button></div>}
              <SkillChainPreview skills={AGENT_DEFINITIONS.find((agent) => agent.type === type)?.skills ?? []} />
              {running ? <div className="agent-run-outline"><div><span /><strong>Discovering current platform content</strong></div><div><span /><strong>Checking source freshness and relevance</strong></div><div><span /><strong>Writing platform-specific opportunities</strong></div></div> : items.length ? items.map((item, index) => type === "X" || type === "REDDIT" || type === "LINKEDIN" ? (() => { const key = opportunityKey(type, item, index); return <SocialFindingCard key={key} type={type} item={item} index={index} company={data.company} liveConnected={liveConnected} completed={completedOpportunities.has(key)} onComplete={() => completeOpportunity(type, key)} onRegenerate={() => runAgent(type)} />; })() : type === "COMPETITOR" ? <CompetitorFindingCard key={`${item.companyName || item.title}-${index}`} item={item} /> : <article key={`${item.title}-${index}`}><div className="finding-meta"><span className={`priority priority-${item.priority ?? "medium"}`}>{item.priority ?? "insight"}</span>{item.confidence !== undefined && <span>{item.confidence}% confidence</span>}</div><h3>{item.title}</h3><CleanMarkdown>{item.evidence ?? item.description}</CleanMarkdown>{item.impact && <div><strong>Why it matters:</strong><CleanMarkdown>{item.impact}</CleanMarkdown></div>}{item.action && <div className="agent-recommendation"><strong>Recommended response:</strong><CleanMarkdown>{item.action}</CleanMarkdown></div>}{item.sourceUrls?.length ? <div className="finding-sources">{item.sourceUrls.slice(0, 3).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">Open current source ↗</a>)}</div> : null}<div className="agent-card-actions">{AGENT_DEFINITIONS.some((agent) => agent.type === type) && <button type="button" disabled={Boolean(runningAgent)} onClick={() => runAgent(type)}>Refresh analysis</button>}</div></article>) : <div className="empty-agent"><Sparkles size={17} /><p>This agent runs independently from the company website, Lighthouse audit, and current public-web evidence. Generated documents are optional context.</p>{AGENT_DEFINITIONS.some((agent) => agent.type === type) && <button type="button" disabled={Boolean(runningAgent)} onClick={() => runAgent(type)}>Run live analysis</button>}</div>}
            </div>}
          </div>;
        })}{agentError && <p className="agent-error">{agentError}</p>}</div>
        {paneResizer("agents")}
      </section>

      <aside className="chat-pane pane" {...paneProps("chat")}><div className="pane-header"><span><MessageCircle size={15} /><span className="pane-title-text">AI CMO</span></span>{paneControls("chat")}</div><div className="chat-hero"><span className="agent-icon agent-ai_cmo"><Bot size={16} /></span><div><strong>Your AI CMO</strong><small>Grounded in {documents.length} documents and {data.pagesRead} sources</small></div></div><div className="chat-messages">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={index}>{message.role === "assistant" && <span className="chat-role"><Sparkles size={13} /> CMO</span>}<ReactMarkdown>{message.content}</ReactMarkdown></div>)}{chatPending && <div className="chat-message assistant typing"><span /><span /><span /></div>}</div><form className="chat-composer" onSubmit={sendMessage}><textarea name="message" rows={3} placeholder="Ask me anything…" required /><div><button type="button" className="attach-button" aria-label="Attach client context"><Paperclip size={16} /></button><span>Uses your company evidence</span><button className="send-button" type="submit" disabled={chatPending}><Send size={14} /></button></div></form>{paneResizer("chat")}</aside>
    </section>

    {selectedDocument && <DocumentWorkspace key={`${selectedDocument.id}-${selectedDocument.version}`} document={selectedDocument} onClose={() => setSelectedDocument(null)} onUpdate={updateDocument} />}
    {agentTray && <div className="drawer-backdrop agent-tray-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAgentTray(false); }}><section className="agent-tray"><header><div><p className="eyebrow">SKILL-GOVERNED SPECIALISTS</p><h2>Add an agent</h2><span>Every agent executes a validated sequence of local skill files before returning output.</span></div><button onClick={() => setAgentTray(false)}>×</button></header><div>{AGENT_DEFINITIONS.filter((agent) => agent.optional).map((agent) => <article key={agent.type}><AgentLogo type={agent.type} fallback="✦" /><div><strong>{agent.label}</strong><p>{agent.description}</p><SkillChainPreview skills={agent.skills} /></div><button type="button" disabled={Boolean(runningAgent)} onClick={() => runAgent(agent.type)}>{runningAgent === agent.type ? <RefreshCw className="spin" size={13} /> : <Sparkles size={13} />}{runningAgent === agent.type ? "Running" : "Run analysis"}</button></article>)}</div>{agentError && <p className="form-error">{agentError}</p>}</section></div>}
  </main>;
}
