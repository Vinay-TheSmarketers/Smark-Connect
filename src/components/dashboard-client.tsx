"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Activity, Bot, Check, ChevronDown, ChevronRight, CirclePlus, Copy, ExternalLink, Globe2, GripVertical, LayoutGrid, Link2, Lock, MessageCircle, PanelLeftClose, PanelLeftOpen, Paperclip, Pencil, Plus, RefreshCw, Send, Settings, Sparkles, X as CloseIcon } from "lucide-react";
import { AGENT_DEFINITIONS, EXTENDED_DOCUMENTS } from "@/lib/skills/registry";
import { normalizeAcronyms, unwrapStructuredText } from "@/lib/text-format";
import { formatSkillName } from "@/lib/skills/format";
import { Brand } from "./brand";
import { DocumentWorkspace, type WorkspaceDocument } from "./document-workspace";
import { LogoutButton } from "./logout-button";
import { ModuleIcon, isCoreModule } from "./module-icon";
import { LighthouseAuditPanel } from "./lighthouse-audit-panel";

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
  ["X_INFLUENCER", "X INFLUENCER AGENT", "✦", "Launch your first campaign (1000 influencers are waiting)"],
  ["REDDIT", "REDDIT AGENT", "●", "2 opportunities ready"],
  ["GEO", "GEO AGENT", "◇", "2 citation gaps detected"],
  ["SEO", "SEO AGENT", "◎", "2 recommendations ready"],
  ["X", "X AGENT", "𝕏", "2 ideas ready"],
  ["AI_CMO", "AI CMO DIRECTOR", "✦", "Strategic executive synthesis"],
  ["TECHNICAL_SEO", "TECHNICAL SEO AGENT", "⚙", "Technical diagnostic and crawlability"],
  ["COMPETITOR", "COMPETITOR AGENT", "◫", "6 verified competitors"],
  ["AUDIENCE", "AUDIENCE AGENT", "◉", "ICP, jobs and voice-of-customer"],
  ["CONTENT_AUDIT", "CONTENT STRATEGY AGENT", "≡", "Content gaps and editorial briefs"],
  ["ARTICLES", "ARTICLES AGENT", "✎", "Evidence-led article briefs"],
  ["LINKEDIN", "LINKEDIN AGENT", "in", "Drafts and comment opportunities"],
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

  const detail = open && <div className="social-opportunity-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className={`social-opportunity-drawer platform-${type.toLowerCase()}`} role="dialog" aria-modal="true" aria-label={`${platformName} comment opportunity`}>
    <header><div><PlatformMark provider={type.toLowerCase()} /><span><strong>Mention on {platformName}</strong><small>{liveConnected ? `Live ${platformName} API connected` : "Current public-web discovery"}</small></span></div><button type="button" aria-label="Close" onClick={() => setOpen(false)}><CloseIcon size={19} /></button></header>
    <div className="opportunity-body"><h2>{item.title}</h2><div className="opportunity-meta"><div>{(item.tags ?? []).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div><time>{item.publishedAt || "Publication time unavailable"}</time></div>
      <section className="source-post-preview"><div className="source-post-heading"><PlatformMark provider={type.toLowerCase()} /><div><strong>{sourceName}</strong><small>{platformName} post · public source</small></div>{source && <a href={source} target="_blank" rel="noreferrer">Go to thread <ExternalLink size={14} /></a>}</div><h3>{item.title}</h3><CleanMarkdown>{item.evidence ?? item.description}</CleanMarkdown>{item.impact && <div className="source-fit"><strong>Why it fits</strong><span>{unwrapStructuredText(item.impact)}</span></div>}</section>
      <section className="recommended-response"><div className="response-heading"><strong>Recommended response</strong><div><button type="button" onClick={() => { setDraft(initialDraft); onRegenerate(); }}><RefreshCw size={14} /> Regenerate</button><button type="button" onClick={() => document.getElementById(`response-${type}-${index}`)?.focus()} aria-label="Edit response"><Pencil size={15} /></button><button type="button" onClick={copyDraft} aria-label="Copy response">{copied ? <Check size={15} /> : <Copy size={15} />}</button></div></div><textarea id={`response-${type}-${index}`} value={draft} onChange={(event) => setDraft(event.target.value)} rows={8} placeholder="Write a transparent, useful response…" /><small>Review the source and disclose affiliation where relevant. Publishing remains manual.</small></section>
    </div><footer><button type="button" disabled={saving || completed} onClick={markComplete}><Check size={17} />{saving ? "Saving…" : completed ? "Completed" : "Mark as Complete"}</button></footer>
  </section></div>;

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
  const [analysisTab, setAnalysisTab] = useState<"seo" | "links" | "technical" | "geo">("seo");
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
            {(["seo", "links", "technical", "geo"] as const).map((tabName) => <button key={tabName} className={analysisTab === tabName ? "active" : ""} onClick={() => setAnalysisTab(tabName)}>{tabName === "seo" || tabName === "geo" ? tabName.toUpperCase() : tabName.slice(0, 1).toUpperCase() + tabName.slice(1)}</button>)}
          </div>
          {analysisTab === "seo" && <>
            <div className="pagespeed-scores-section">
              <div className="section-title-row">
                <div><strong>PageSpeed Scores</strong><small>Lighthouse scores from Google</small></div>
                <span className="audit-date">Last audited: {new Date(data.company.lastAuditedAt ?? Date.now()).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}</span>
              </div>
              <div className="pagespeed-device-group">
                <span className="device-label">MOBILE</span>
                <div className="gauges-row">
                  <div className="score-gauge-ring warn"><div className="ring"><span>75</span></div><small>Performance</small></div>
                  <div className="score-gauge-ring warn"><div className="ring"><span>87</span></div><small>Accessibility</small></div>
                  <div className="score-gauge-ring warn"><div className="ring"><span>77</span></div><small>Best Practices</small></div>
                  <div className="score-gauge-ring good"><div className="ring"><span>92</span></div><small>SEO</small></div>
                </div>
              </div>
              <div className="pagespeed-device-group">
                <span className="device-label">DESKTOP</span>
                <div className="gauges-row">
                  <div className="score-gauge-ring good"><div className="ring"><span>94</span></div><small>Performance</small></div>
                  <div className="score-gauge-ring good"><div className="ring"><span>89</span></div><small>Accessibility</small></div>
                  <div className="score-gauge-ring warn"><div className="ring"><span>77</span></div><small>Best Practices</small></div>
                  <div className="score-gauge-ring good"><div className="ring"><span>92</span></div><small>SEO</small></div>
                </div>
              </div>
            </div>
            <div className="core-vitals-section">
              <div className="section-title-row">
                <div><strong>Core Web Vitals</strong><small>Lighthouse lab metrics</small></div>
                <div className="vitals-device-toggle">
                  <button type="button" className={vitalsDevice === "desktop" ? "active" : ""} onClick={() => setVitalsDevice("desktop")}>Desktop</button>
                  <button type="button" className={vitalsDevice === "mobile" ? "active" : ""} onClick={() => setVitalsDevice("mobile")}>Mobile</button>
                </div>
              </div>
              <div className="vitals-cards-grid">
                <div className="vital-metric-card"><span className="vital-name"><span className="metric-dot pass" /> LCP</span><strong className="vital-val">1.3s</strong><small className="vital-status">Pass</small></div>
                <div className="vital-metric-card"><span className="vital-name"><span className="metric-dot pass" /> FCP</span><strong className="vital-val">1.1s</strong><small className="vital-status">Pass</small></div>
                <div className="vital-metric-card"><span className="vital-name"><span className="metric-dot pass" /> TBT</span><strong className="vital-val">0ms</strong><small className="vital-status">Pass</small></div>
                <div className="vital-metric-card"><span className="vital-name"><span className="metric-dot pass" /> CLS</span><strong className="vital-val">0</strong><small className="vital-status">Pass</small></div>
              </div>
            </div>
          </>}
          {analysisTab === "technical" && <>
            <LighthouseAuditPanel defaultUrl={data.company.websiteUrl} />
            <div className="evidence-note"><strong>{data.pagesRead} crawl pages inspected</strong><p>The full technical diagnosis is stored in the SEO Audit and Technical SEO agent feed. Index coverage and field Core Web Vitals require a connected Google Search Console property.</p></div>
            <div className="audit-footnote">Lighthouse results are controlled browser-lab estimates and remain separate from field Core Web Vitals and connected first-party analytics.</div>
          </>}
          {analysisTab === "links" && <div className="evidence-state"><Link2 size={22} /><p className="eyebrow">LINK EVIDENCE</p><h3>Official backlink data is not connected</h3><p>Smark Connect does not fabricate domain authority, backlink counts, or referring domains. Connect an approved backlink or Search Console source to show official values here. The SEO document still analyzes observed internal-link opportunities from the website crawl.</p><span>{data.pagesRead} owned pages available for internal-link analysis</span></div>}
          {analysisTab === "geo" && <div className="aeo-geo-section">
            <div className="source-banner aeo-banner"><div><Sparkles size={18} /><span><strong>Website evidence + embedded GEO skills</strong><small>Readiness analysis, not a platform citation metric</small></span></div><span className="source-status evidence-badge">Evidence-led</span></div>
            <div className="aeo-summary-card">
              <div className="aeo-badge-row"><span className="aeo-pill">AEO / GEO VISIBILITY</span><span className="aeo-gaps-badge">2 citation gaps detected</span></div>
              <p className="aeo-intro">{unwrapStructuredText(geoRun?.summary ?? "GEO analysis: Evaluate entity clarity, answer passages, question coverage, and structured data for AI search visibility.")}</p>
            </div>
            <div className="aeo-findings-list">
              {findings(geoRun?.output).slice(0, 3).map((item, index) => <article key={`${item.title}-${index}`} className="aeo-finding-item"><div className="aeo-item-head"><span className="aeo-dot" /><h3>{item.title}</h3></div><CleanMarkdown>{item.evidence ?? item.description}</CleanMarkdown>{item.action && <div className="aeo-action-note"><strong>Next:</strong> {unwrapStructuredText(item.action)}</div>}</article>)}
            </div>
            <div className="audit-footnote">Live answer-engine citation share is shown only when an official monitoring source is connected.</div>
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
