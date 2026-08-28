import { Building2, Files, Globe2, Search, Swords, Target } from "lucide-react";

const moduleKinds = {
  COMPANY_INTELLIGENCE: { Icon: Building2, className: "company", label: "Company Intelligence" },
  AI_CMO: { Icon: Building2, className: "company", label: "Company Intelligence" },
  SEO_AUDIT: { Icon: Search, className: "seo", label: "SEO Audit" },
  SEO: { Icon: Search, className: "seo", label: "SEO Audit" },
  TECHNICAL_SEO: { Icon: Search, className: "seo", label: "SEO Audit" },
  GEO_AUDIT: { Icon: Globe2, className: "geo", label: "GEO and AI Visibility" },
  GEO: { Icon: Globe2, className: "geo", label: "GEO and AI Visibility" },
  COMPETITOR_ANALYSIS: { Icon: Swords, className: "competitor", label: "Competitor Analysis" },
  COMPETITOR: { Icon: Swords, className: "competitor", label: "Competitor Analysis" },
  AUDIENCE_ANALYSIS: { Icon: Target, className: "audience", label: "Audience and ICP Research" },
  AUDIENCE: { Icon: Target, className: "audience", label: "Audience and ICP Research" },
  CONTENT_AUDIT: { Icon: Files, className: "content", label: "Content Audit and Strategy" },
} as const;

export function ModuleIcon({ type, size = 16, decorative = true }: { type: string; size?: number; decorative?: boolean }) {
  const item = moduleKinds[type as keyof typeof moduleKinds];
  if (!item) return null;
  const { Icon } = item;
  return <span className={`module-icon module-icon-${item.className}`} title={decorative ? undefined : item.label} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : item.label}><Icon size={size} strokeWidth={2.1} /></span>;
}

export function isCoreModule(type: string) {
  return type in moduleKinds;
}
