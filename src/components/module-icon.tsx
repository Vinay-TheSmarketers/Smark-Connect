import {
  Boxes,
  Building2,
  Compass,
  Files,
  Globe2,
  Layers,
  Palette,
  Search,
  Sparkles,
  Swords,
  Target,
  type LucideIcon,
} from "lucide-react";

const moduleKinds: Record<string, { Icon: LucideIcon; className: string; label: string }> = {
  // Core Documents & Associated Agents
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

  // Skill-Generated / Extended Documents
  MARKETING_STRATEGY: { Icon: Compass, className: "strategy", label: "Integrated Marketing Strategy" },
  CAMPAIGN_PLANNER: { Icon: Compass, className: "strategy", label: "Integrated Marketing Strategy" },
  DESIGN_GUIDE: { Icon: Palette, className: "design", label: "Brand and Visual Design Guide" },
  CREATIVE_VISUAL: { Icon: Palette, className: "design", label: "Brand and Visual Design Guide" },
  CONTENT_STRATEGY: { Icon: Layers, className: "content-strategy", label: "Full-Funnel Content Strategy" },
  PRODUCT_INFO: { Icon: Boxes, className: "product", label: "Offer and Product Intelligence" },
  STRATEGIC_INTELLIGENCE: { Icon: Sparkles, className: "strategic", label: "Strategic Intelligence Report" },
};

export function ModuleIcon({ type, size = 16, decorative = true }: { type: string; size?: number; decorative?: boolean }) {
  const item = moduleKinds[type];
  if (!item) return null;
  const { Icon } = item;
  return <span className={`module-icon module-icon-${item.className}`} title={decorative ? undefined : item.label} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : item.label}><Icon size={size} strokeWidth={2.1} /></span>;
}

export function isCoreModule(type: string) {
  return type in moduleKinds;
}
