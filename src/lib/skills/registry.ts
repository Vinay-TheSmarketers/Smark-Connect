import type { AgentType, DocumentType } from "@prisma/client";

export type SkillRepository = "claude-seo" | "openclaw-marketing-skills" | "social-media-skills";
export type SkillPhase = "foundation" | "research" | "analysis" | "production" | "reporting" | "quality";

export type SkillRef = {
  repository: SkillRepository;
  skill: string;
  phase: SkillPhase;
  reason: string;
};

export type CoreDocumentDefinition = {
  type: DocumentType;
  title: string;
  agentType: AgentType;
  purpose: string;
  instructions: string;
  skills: SkillRef[];
};

export type AgentDefinition = {
  type: AgentType;
  label: string;
  description: string;
  optional: boolean;
  skills: SkillRef[];
  instructions: string;
};

export type InternalOperation = "ai-cmo-chat" | "ai-cmo-synthesis" | "document-edit";

function skill(repository: SkillRepository, name: string, phase: SkillPhase, reason: string): SkillRef {
  return { repository, skill: name, phase, reason };
}

const companyIntelligenceSkills = [
  skill("openclaw-marketing-skills", "product-marketing-context", "foundation", "Extract the offer, category, positioning, proof, and commercial context."),
  skill("social-media-skills", "brand-profile", "analysis", "Turn observed brand signals into a reusable brand foundation."),
  skill("social-media-skills", "voice-builder", "analysis", "Define evidence-backed voice and messaging guardrails."),
  skill("social-media-skills", "content-research-and-sourcing", "quality", "Verify claims, label assumptions, and preserve source provenance."),
];

const seoAuditSkills = [
  skill("claude-seo", "seo-audit", "foundation", "Use the main SEO audit skill as the governing audit workflow and report structure."),
  skill("claude-seo", "seo-technical", "analysis", "Assess crawlability, indexability signals, performance, and technical risk."),
  skill("claude-seo", "seo-page", "analysis", "Inspect page-level titles, descriptions, headings, links, and intent alignment."),
  skill("claude-seo", "seo-content", "analysis", "Evaluate content quality, depth, trust, and search usefulness."),
  skill("claude-seo", "seo-schema", "analysis", "Audit structured-data evidence and valid schema opportunities."),
  skill("claude-seo", "seo-sitemap", "analysis", "Evaluate sitemap coverage and information-discovery paths."),
  skill("claude-seo", "seo-sxo", "analysis", "Connect search findings to user journeys and experience."),
  skill("openclaw-marketing-skills", "seo-audit", "quality", "Apply a second audit lens for prioritization and actionability."),
];

const geoAuditSkills = [
  skill("claude-seo", "seo-geo", "foundation", "Use the SEO/GEO workflow for AI-search readiness and citability."),
  skill("openclaw-marketing-skills", "ai-seo", "analysis", "Assess answer coverage, authority signals, and AI discovery opportunities."),
  skill("social-media-skills", "ai-search-optimization", "analysis", "Evaluate the wider answer-engine source layer."),
  skill("social-media-skills", "content-research-and-sourcing", "quality", "Require source-linked claims and explicit evidence boundaries."),
];

const competitorAnalysisSkills = [
  skill("social-media-skills", "brand-profile", "foundation", "Anchor comparison in the company's actual positioning and proof."),
  skill("social-media-skills", "audience-research", "research", "Frame competitors around the target customer's jobs and alternatives."),
  skill("social-media-skills", "competitor-analysis", "analysis", "Run the public-data SCOUT competitive landscape workflow."),
  skill("openclaw-marketing-skills", "competitor-alternatives", "analysis", "Evaluate alternative categories and comparison-page opportunities."),
  skill("claude-seo", "seo-competitor-pages", "analysis", "Assess search-facing competitor and alternative page opportunities."),
  skill("social-media-skills", "analytics-and-reporting", "reporting", "Turn sourced observations into an honest, decision-led competitor report."),
];

const audienceAnalysisSkills = [
  skill("social-media-skills", "brand-profile", "foundation", "Establish the brand, offer, and initial audience sketch."),
  skill("openclaw-marketing-skills", "product-marketing-context", "foundation", "Connect audiences to offers, use cases, and buying questions."),
  skill("social-media-skills", "audience-research", "research", "Build evidence-backed ICPs, JTBD, objections, and voice-of-customer language."),
  skill("social-media-skills", "data-and-original-research", "analysis", "Separate observed customer evidence from research hypotheses."),
  skill("social-media-skills", "content-research-and-sourcing", "quality", "Validate customer-language sources and flag missing first-party evidence."),
];

const contentAuditSkills = [
  skill("social-media-skills", "content-audit", "foundation", "Inventory and score existing content against a consistent audit method."),
  skill("social-media-skills", "content-research-and-sourcing", "research", "Assess source quality, proof, and freshness."),
  skill("openclaw-marketing-skills", "content-strategy", "analysis", "Connect findings to business goals and funnel needs."),
  skill("claude-seo", "seo-cluster", "analysis", "Map topic clusters and internal relationships."),
  skill("claude-seo", "seo-content-brief", "production", "Convert verified gaps into actionable briefs."),
  skill("social-media-skills", "content-pillars", "production", "Create a focused, audience-led pillar system."),
  skill("social-media-skills", "analytics-and-reporting", "reporting", "Define honest measurement and refresh decisions."),
];

const marketingStrategySkills = [
  skill("openclaw-marketing-skills", "product-marketing-context", "foundation", "Anchor strategy in the offer and market context."),
  skill("social-media-skills", "audience-research", "research", "Prioritize the audience and buying jobs."),
  skill("openclaw-marketing-skills", "marketing-ideas", "analysis", "Generate strategy options from the evidence."),
  skill("openclaw-marketing-skills", "launch-strategy", "production", "Sequence campaigns and launch phases."),
  skill("social-media-skills", "campaign-and-launch-planning", "production", "Map channels, deliverables, dependencies, and ownership."),
  skill("social-media-skills", "goals-and-kpis", "reporting", "Tie the strategy to measurable outcomes and decision rules."),
];

const designGuideSkills = [
  skill("social-media-skills", "brand-profile", "foundation", "Anchor the visual system in observed brand evidence."),
  skill("social-media-skills", "design-and-templates", "production", "Define reusable layouts, hierarchy, and channel templates."),
  skill("social-media-skills", "infographic-and-data-viz", "production", "Specify honest data-display patterns."),
  skill("social-media-skills", "image-prompt", "production", "Create consistent production-ready visual briefs."),
  skill("social-media-skills", "platform-specs-and-validation", "quality", "Validate channel specifications and accessibility requirements."),
];

const contentStrategySkills = [
  skill("social-media-skills", "brand-profile", "foundation", "Use the approved brand and audience foundation."),
  skill("openclaw-marketing-skills", "content-strategy", "analysis", "Define the business-led editorial strategy."),
  skill("claude-seo", "seo-cluster", "analysis", "Create search-connected topic clusters."),
  skill("claude-seo", "seo-content-brief", "production", "Turn topics into evidence-led production briefs."),
  skill("social-media-skills", "content-pillars", "production", "Create channel-relevant content pillars."),
  skill("social-media-skills", "cross-platform-repurposing", "production", "Design native distribution and repurposing flows."),
  skill("social-media-skills", "content-calendar", "production", "Sequence the plan into an executable calendar."),
  skill("social-media-skills", "analytics-and-reporting", "reporting", "Define outcome-led measurement and refresh rules."),
];

const productInfoSkills = [
  skill("openclaw-marketing-skills", "product-marketing-context", "foundation", "Build the offer and product source of truth."),
  skill("social-media-skills", "audience-research", "research", "Connect offer details to customer jobs, pains, and objections."),
  skill("openclaw-marketing-skills", "pricing-strategy", "analysis", "Assess packaging and pricing evidence without invented economics."),
  skill("openclaw-marketing-skills", "sales-enablement", "production", "Create proof-led narratives and objection handling."),
  skill("social-media-skills", "content-research-and-sourcing", "quality", "Verify commercial claims and preserve known unknowns."),
];

export const CORE_DOCUMENTS: CoreDocumentDefinition[] = [
  { type: "COMPANY_INTELLIGENCE", title: "Company Intelligence", agentType: "AI_CMO", purpose: "A factual company foundation covering the offer, category, business model, positioning, differentiators, proof, and brand signals.", skills: companyIntelligenceSkills, instructions: "Build the reusable company source of truth, not a generic strategy report. Separate direct website evidence, public discovery, and hypotheses. Include a visual-ready offer/value stack, a positioning constellation, a proof ladder, brand voice, messaging guardrails, known unknowns, and source notes. Every diagram input must be qualitative or evidence-backed—never an invented score." },
  { type: "SEO_AUDIT", title: "SEO Audit", agentType: "SEO", purpose: "A prioritized technical, on-page, content, schema, sitemap, SXO, and performance audit governed by the main SEO audit skill.", skills: seoAuditSkills, instructions: "Follow the main seo-audit skill first, then apply each specialist in chain order. Structure this as a diagnostic, not a generic strategy report. Never claim indexation, rankings, traffic, backlinks, Lighthouse, or Core Web Vitals without the connected source. Include a crawl-to-demand dependency path, a severity/effort decision matrix, an internal-link or template network, and evidence, owner, dependency, and falsifiable success check for every priority." },
  { type: "GEO_AUDIT", title: "GEO and AI Visibility Audit", agentType: "GEO", purpose: "AI-search readiness, entity clarity, citability, and answer coverage grounded in established search fundamentals.", skills: geoAuditSkills, instructions: "Structure this as an answer-engine visibility map, not a generic strategy report. Evaluate entity clarity, answer passages, question coverage, evidence density, structured-data support, and third-party source opportunities. Include an entity/evidence graph, a citation-readiness ladder, and a buyer-question constellation. Do not invent AI citations, rankings, or readiness scores." },
  { type: "COMPETITOR_ANALYSIS", title: "Competitor Analysis", agentType: "COMPETITOR", purpose: "A source-linked competitive landscape, alternative set, search posture, and positioning-whitespace report.", skills: competitorAnalysisSkills, instructions: "Produce a competitive landscape atlas, not a generic strategy report. Run the ordered chain from company and audience foundation through SCOUT analysis and alternatives, then use analytics-and-reporting as the final report skill. Identify at least six real direct competitors from official company websites; if the niche is narrow, expand to genuine adjacent or indirect alternatives. For each, provide the company name, official website, 1-2 sentence positioning, and the specific attributes on which it competes. Include a shared-criteria matrix, positioning spectrum, and qualitative whitespace map. Never fabricate a name, metric, market share, or private performance." },
  { type: "AUDIENCE_ANALYSIS", title: "Audience and ICP Research", agentType: "AUDIENCE", purpose: "Evidence-backed ICPs, jobs-to-be-done, pains, objections, triggers, decision roles, and voice-of-customer language.", skills: audienceAnalysisSkills, instructions: "Create a human decision field guide, not a generic strategy report. Define one to three sharp segments, separating buyer, user, and follower where necessary. Include a jobs/tensions constellation, trigger-to-decision journey, buying-role decision tree, and explicit validation plan. Quote only customer language present in source evidence; mark every inferred audience statement as a hypothesis." },
  { type: "CONTENT_AUDIT", title: "Content Audit and Strategy", agentType: "CONTENT_AUDIT", purpose: "A content inventory, quality audit, pillar map, topic gaps, briefs, and measurable editorial direction.", skills: contentAuditSkills, instructions: "Create a content portfolio diagnostic, not a generic strategy report. Audit supplied content for coverage, depth, proof, buyer-stage balance, duplication, and freshness. Include a keep/refresh/consolidate/create matrix, buyer-stage coverage funnel, content flywheel, pillar relationships, briefs, and measurement rules. Never invent traffic, conversion, or engagement values." },
];
const pageCroAuditSkills = [
  skill("openclaw-marketing-skills", "page-cro", "foundation", "Audit page architecture, layout, above-the-fold clarity, and conversion bottlenecks."),
  skill("openclaw-marketing-skills", "form-cro", "analysis", "Evaluate input friction, form fields, validation, and micro-conversions."),
  skill("openclaw-marketing-skills", "marketing-psychology", "analysis", "Apply behavioral triggers, loss aversion, and social proof dynamics."),
  skill("openclaw-marketing-skills", "copywriting", "production", "Draft high-converting headlines, value propositions, and CTA copy."),
];

const onboardingCroAuditSkills = [
  skill("openclaw-marketing-skills", "onboarding-cro", "foundation", "Evaluate user onboarding, time-to-first-value, and activation milestones."),
  skill("openclaw-marketing-skills", "paywall-upgrade-cro", "analysis", "Identify upgrade friction, plan gates, and paywall trigger points."),
  skill("openclaw-marketing-skills", "churn-prevention", "production", "Define proactive retention touchpoints and re-engagement workflows."),
];

const abTestRoadmapSkills = [
  skill("openclaw-marketing-skills", "ab-test-setup", "foundation", "Structure statistically sound A/B test variations and test parameters."),
  skill("openclaw-marketing-skills", "marketing-ideas", "analysis", "Generate high-leverage growth hypotheses and experimentation angles."),
  skill("social-media-skills", "goals-and-kpis", "reporting", "Rank tests by ICE/PIE score and tie to revenue conversion metrics."),
];

const topicClusterSkills = [
  skill("claude-seo", "seo-cluster", "foundation", "Map semantic topic clusters, hub-and-spoke architectures, and internal relationships."),
  skill("claude-seo", "seo-content-brief", "analysis", "Generate production-ready content briefs for each sub-topic node."),
  skill("openclaw-marketing-skills", "content-strategy", "production", "Connect clusters to full-funnel buyer intent and organic search demand."),
  skill("claude-seo", "seo-sxo", "quality", "Align search experience optimization with navigation flow."),
];

const pseoBlueprintSkills = [
  skill("claude-seo", "seo-programmatic", "foundation", "Audit template uniqueness, programmatic URL rules, and index bloat safeguards."),
  skill("claude-seo", "seo-schema", "analysis", "Design structured-data schemas for scaled entity and database pages."),
  skill("claude-seo", "seo-page", "production", "Specify dynamic title/meta templates and internal linking rules."),
  skill("openclaw-marketing-skills", "free-tool-strategy", "quality", "Embed interactive value hooks on programmatic pages."),
];

const backlinkOutreachSkills = [
  skill("claude-seo", "seo-backlinks", "foundation", "Analyze competitor backlink profiles, unlinked brand mentions, and link gaps."),
  skill("social-media-skills", "data-and-original-research", "analysis", "Design linkable assets, benchmark surveys, and original data hooks."),
  skill("openclaw-marketing-skills", "cold-email", "production", "Draft personalized editorial outreach and digital PR pitches."),
];

const localSeoAuditSkills = [
  skill("claude-seo", "seo-local", "foundation", "Audit local search visibility, Google Business Profile readiness, and NAP signals."),
  skill("claude-seo", "seo-maps", "analysis", "Evaluate local map pack ranking factors and review velocity."),
  skill("claude-seo", "seo-schema", "production", "Design LocalBusiness and GeoCoordinates structured data."),
];

const coldOutboundPlaybookSkills = [
  skill("openclaw-marketing-skills", "cold-email", "foundation", "Build cold email frameworks with high deliverability and personalization."),
  skill("openclaw-marketing-skills", "product-marketing-context", "research", "Ground outreach in sharp customer pain points and verified proof points."),
  skill("social-media-skills", "audience-research", "analysis", "Segment messaging by decision maker, power user, and buying trigger."),
  skill("openclaw-marketing-skills", "marketing-psychology", "production", "Apply curiosity hooks, low-friction asks, and 4-step sequence cadences."),
];

const emailLifecycleSkills = [
  skill("openclaw-marketing-skills", "email-sequence", "foundation", "Design welcome, nurture, re-engagement, and onboarding email sequences."),
  skill("openclaw-marketing-skills", "lead-magnets", "analysis", "Align email sequences with opt-in lead magnets and entry channels."),
  skill("social-media-skills", "brand-profile", "production", "Ensure visual and narrative brand alignment across all emails."),
  skill("social-media-skills", "voice-builder", "quality", "Enforce brand voice, tone, and banned phrase guardrails."),
];

const leadMagnetStrategySkills = [
  skill("openclaw-marketing-skills", "lead-magnets", "foundation", "Design high-converting lead magnets, checklists, and templates."),
  skill("openclaw-marketing-skills", "free-tool-strategy", "analysis", "Specify interactive calculators, audit widgets, and free tool architectures."),
  skill("openclaw-marketing-skills", "content-strategy", "production", "Connect lead magnets to organic search and social capture surfaces."),
  skill("openclaw-marketing-skills", "marketing-ideas", "quality", "Formulate distribution angles and promotional hooks."),
];

const paidAdsPlaybookSkills = [
  skill("openclaw-marketing-skills", "paid-ads", "foundation", "Structure Google Search, LinkedIn B2B, and Meta performance ad campaigns."),
  skill("openclaw-marketing-skills", "ad-creative", "production", "Draft search headlines, social display copy, and visual creative briefs."),
  skill("openclaw-marketing-skills", "ab-test-setup", "analysis", "Design creative and audience split-testing matrices."),
  skill("social-media-skills", "goals-and-kpis", "reporting", "Establish ROAS/CAC benchmarks and stop/scale decision thresholds."),
];

const competitorComparisonSkills = [
  skill("openclaw-marketing-skills", "competitor-alternatives", "foundation", "Structure high-intent comparison and alternative page architectures."),
  skill("claude-seo", "seo-competitor-pages", "analysis", "Target 'Alternative to [Competitor]' and '[Brand] vs [Competitor]' search queries."),
  skill("openclaw-marketing-skills", "page-cro", "production", "Design feature matrix layouts, pricing contrast tables, and switch CTAs."),
  skill("social-media-skills", "voice-builder", "quality", "Maintain professional, objective, and defensible comparison copy."),
];

const socialBatchPlanSkills = [
  skill("social-media-skills", "batch-content-plan", "foundation", "Build a 30-day multi-channel content calendar and publishing rhythm."),
  skill("social-media-skills", "content-pillars", "analysis", "Map posts to education, proof, thought leadership, and product pillars."),
  skill("social-media-skills", "carousel-writer", "production", "Draft LinkedIn and Instagram document carousels with slide outlines."),
  skill("social-media-skills", "caption-writer", "production", "Write engaging hooks, body copy, and conversation CTAs."),
];

const shortFormVideoSkills = [
  skill("social-media-skills", "short-form-video-script", "foundation", "Write 15s–60s video scripts for TikTok, Reels, and YouTube Shorts."),
  skill("social-media-skills", "ugc-and-influencer", "analysis", "Structure creator briefs, hook formulas, and visual B-roll directions."),
  skill("social-media-skills", "scripting-and-storyboarding", "production", "Outline visual scene pacing, teleprompter text, and on-screen graphics."),
];

const brandStorytellingSkills = [
  skill("social-media-skills", "behind-the-scenes-and-founder", "foundation", "Craft founder journey, build-in-public, and company origin narratives."),
  skill("social-media-skills", "before-after-and-transformation", "analysis", "Structure customer transformation case studies and ROI stories."),
  skill("social-media-skills", "case-study-and-customer-story", "production", "Write compelling case study narratives and customer proof points."),
];

const analyticsTrackingSkills = [
  skill("openclaw-marketing-skills", "analytics-tracking", "foundation", "Design GA4, PostHog, and CDP event schemas and conversion tagging plans."),
  skill("social-media-skills", "analytics-and-reporting", "analysis", "Define UTM taxonomy, campaign tracking parameters, and channel attribution."),
  skill("social-media-skills", "goals-and-kpis", "reporting", "Map tracking infrastructure to executive marketing OKRs and KPIs."),
];

export const EXTENDED_DOCUMENTS: CoreDocumentDefinition[] = [
  { type: "MARKETING_STRATEGY", title: "Strategic Intelligence Report", agentType: "CAMPAIGN_PLANNER", purpose: "An executive strategic intelligence report connecting positioning, competitors, priorities, channels, campaigns, measurement, and operating rhythm.", skills: marketingStrategySkills, instructions: "Produce the same decision-led strategic intelligence experience as the executive PDF report rather than a generic analysis: an executive thesis, explicit audience and positioning choices, competitive whitespace, a strategy-on-a-page flywheel, channel-role pathway, campaign prioritization matrix, 30/60/90-day plan, KPIs, decision gates, dependencies, risks, confidence, and source register." },
  { type: "DESIGN_GUIDE", title: "Brand and Visual Design Guide", agentType: "CREATIVE_VISUAL", purpose: "A production-ready brand expression and campaign design system grounded in observed brand evidence.", skills: designGuideSkills, instructions: "Produce a brand expression system rather than a generic analysis. Cover aesthetic principles, color and typography roles, spacing, composition, imagery, iconography, data visualization, social templates, accessibility, examples, asset checklist, and production QA. Include a visual spectrum, token/component blueprint, and foundation-to-application stack. Label observed evidence versus proposed extensions." },
  { type: "CONTENT_STRATEGY", title: "Full-Funnel Content Strategy", agentType: "CONTENT_AUDIT", purpose: "A detailed editorial, search, distribution, repurposing, calendar, and measurement system.", skills: contentStrategySkills, instructions: "Produce a full-funnel editorial system rather than a generic analysis. Connect every asset to an audience, decision, proof requirement, native format, distribution flow, owner, KPI, and refresh trigger. Include pillar orbits, a distribution/repurposing flywheel, a buyer-decision journey, and a prioritized 90-day backlog." },
  { type: "PRODUCT_INFO", title: "Offer and Product Intelligence", agentType: "AI_CMO", purpose: "A detailed offer architecture, value proposition, proof, objections, use cases, packaging hypotheses, and sales-enablement foundation.", skills: productInfoSkills, instructions: "Produce an offer and product intelligence book rather than a generic analysis. Cover offer hierarchy, jobs, use cases, differentiators, proof, objections, buying questions, packaging and pricing evidence, sales narratives, gaps, validation plan, and source register. Include an offer/value stack, proof ladder, and objection/next-step decision tree. Never invent commercial metrics." },
  { type: "PAGE_CRO_AUDIT", title: "Landing Page & Hero CRO Audit", agentType: "AI_CMO", purpose: "Evaluation of headline clarity, above-the-fold friction, CTA strength, social proof placement, and form conversion blockers.", skills: pageCroAuditSkills, instructions: "Perform a rigorous CRO audit on the target landing pages. Break down hero section clarity, cognitive load, objection handling, trust placement, form fields, and CTA resonance. Provide before/after copy revisions and priority wireframe recommendations." },
  { type: "ONBOARDING_CRO_AUDIT", title: "Onboarding & Activation Audit", agentType: "AI_CMO", purpose: "Analysis of user sign-up flow, time-to-value friction, activation milestones, and upgrade trigger points.", skills: onboardingCroAuditSkills, instructions: "Analyze user onboarding and post-signup activation flows. Map the time-to-first-value friction, drop-off risks, paywall gate timing, and email retention triggers." },
  { type: "AB_TEST_ROADMAP", title: "A/B Testing & Experimentation Roadmap", agentType: "CAMPAIGN_PLANNER", purpose: "Hypotheses, test variations, sample size estimates, and prioritized experiment backlog (ICE/PIE scored).", skills: abTestRoadmapSkills, instructions: "Formulate an actionable 90-day experimentation backlog. Structure each test with an evidence-backed hypothesis, control vs variation specifications, target metrics, sample size guidance, and ICE priority ranking." },
  { type: "TOPIC_CLUSTER_BLUEPRINT", title: "Topic Cluster & Pillar Architecture", agentType: "SEO", purpose: "Core pillar topics, sub-topic cluster maps, internal linking hierarchy, and content brief templates.", skills: topicClusterSkills, instructions: "Design a comprehensive semantic topic cluster architecture. Specify pillar pages, 6-12 sub-topic cluster nodes per pillar, anchor text strategies, internal link topologies, and search intent alignment." },
  { type: "PSEO_BLUEPRINT", title: "Programmatic SEO (pSEO) Blueprint", agentType: "PROGRAMMATIC_SEO", purpose: "Template specifications, data schema mapping, URL patterns, and scale architecture for programmatic landing pages.", skills: pseoBlueprintSkills, instructions: "Design a scalable programmatic SEO system. Specify the database attributes, URL path taxonomy, >=40% unique content rules, JSON-LD schemas, canonical policies, and rollout milestones." },
  { type: "BACKLINK_OUTREACH_BLUEPRINT", title: "Backlink & Digital PR Outreach Playbook", agentType: "SEO", purpose: "Unlinked brand mentions, competitor link gap analysis, linkable asset concepts, and outreach pitch templates.", skills: backlinkOutreachSkills, instructions: "Create a backlink acquisition and digital PR roadmap. Outline 3 original research / linkable asset concepts, competitor link gap targets, angle-specific outreach templates, and follow-up cadences." },
  { type: "LOCAL_SEO_AUDIT", title: "Local SEO & Google Business Profile Audit", agentType: "SEO", purpose: "Local citations, NAP consistency, Google Maps rank factors, and localized schema.", skills: localSeoAuditSkills, instructions: "Evaluate local organic search and map pack visibility. Specify Google Business Profile optimizations, local schema markup, citation consistency, and geo-targeted landing page architectures." },
  { type: "COLD_OUTBOUND_PLAYBOOK", title: "Cold Outbound & Account-Based Playbook", agentType: "AUDIENCE", purpose: "ICP persona messaging matrices, personalized 4-step cold email sequences, trigger event hooks, and deliverability guardrails.", skills: coldOutboundPlaybookSkills, instructions: "Build a complete cold outbound playbook. Provide 3 persona-specific 4-step email sequences, subject line variants, trigger-based personalization frameworks, follow-up timelines, and deliverability best practices." },
  { type: "EMAIL_LIFECYCLE_PLAYBOOK", title: "Email Lifecycle & Lead Nurture Architecture", agentType: "EMAIL_NEWSLETTER", purpose: "Welcome sequences, re-engagement workflows, educational nurture cadences, and lead magnet delivery sequences.", skills: emailLifecycleSkills, instructions: "Architect full email lifecycle flows: lead magnet delivery sequence, 5-part welcome & onboarding series, educational nurture cadence, and 30-day re-engagement trigger campaigns with subject lines and preview text." },
  { type: "LEAD_MAGNET_STRATEGY", title: "Lead Magnet & Free Tool Strategy", agentType: "AI_CMO", purpose: "Interactive calculator/tool specs, checklist/template concepts, and high-conversion opt-in architectures.", skills: leadMagnetStrategySkills, instructions: "Design high-converting top-of-funnel lead capture assets. Detail specifications for 2 interactive web tools/calculators, 3 downloadable frameworks/templates, and opt-in landing page wireframes." },
  { type: "PAID_ADS_PLAYBOOK", title: "Multi-Channel Paid Ads Playbook", agentType: "PAID_MEDIA", purpose: "Google Search ad copy & keyword intent match, LinkedIn B2B Sponsored Content briefs, and Meta creative variations.", skills: paidAdsPlaybookSkills, instructions: "Create a multi-channel paid acquisition plan. Draft 10 Google Search ad headlines/descriptions, 3 LinkedIn Sponsored Content angles, and 3 Meta visual ad briefs with audience targeting criteria and budget allocation models." },
  { type: "COMPETITOR_COMPARISON_PLAYBOOK", title: "Competitor Comparison Landing Page Playbook", agentType: "COMPETITOR", purpose: "Alternative to [Competitor] and [Company] vs [Competitor] page layouts, feature matrices, and conversion copy.", skills: competitorComparisonSkills, instructions: "Blueprint high-intent comparison landing pages. Include feature comparison grids, pricing transparency blocks, switcher migration guarantees, and sharp 'How we differ' narrative copy for top competitors." },
  { type: "SOCIAL_BATCH_PLAN", title: "Social Media Batch Content & Calendar Plan", agentType: "LINKEDIN", purpose: "30-day cross-platform content calendar, LinkedIn carousel outlines, and text hook libraries.", skills: socialBatchPlanSkills, instructions: "Build a 30-day multi-channel social content calendar. Provide 15 complete post drafts across thought leadership, customer proof, educational how-tos, and 2 document carousel slide-by-slide outlines." },
  { type: "SHORT_FORM_VIDEO_BLUEPRINT", title: "Short-Form Video & UGC Creative Blueprint", agentType: "UGC_VIDEOS", purpose: "15s–60s video hooks, script teleprompter outlines, visual pacing cues, and creator briefs.", skills: shortFormVideoSkills, instructions: "Draft 5 short-form video scripts (Reels, TikTok, YouTube Shorts). Include hook line, on-screen text, teleprompter voiceover, B-roll visual cues, and CTA for each script." },
  { type: "BRAND_STORYTELLING_GUIDE", title: "Brand Storytelling & Founder Thought Leadership", agentType: "LINKEDIN", purpose: "Founder narrative arcs, customer transformation case study frameworks, and milestone story templates.", skills: brandStorytellingSkills, instructions: "Formulate a brand narrative and founder thought leadership playbook. Define the core origin story, 3 customer transformation case study frameworks, and long-form thought leadership essay outlines." },
  { type: "ANALYTICS_TRACKING_BLUEPRINT", title: "Analytics Tracking & Attribution Blueprint", agentType: "AI_CMO", purpose: "GA4/PostHog event tagging schemas, UTM naming conventions, conversion funnel definitions, and dashboard KPI specifications.", skills: analyticsTrackingSkills, instructions: "Design a complete marketing analytics and attribution blueprint. Define core tracking events, UTM parameter taxonomy, multi-touch attribution models, and executive dashboard KPIs." },
];

export const ALL_DOCUMENTS = [...CORE_DOCUMENTS, ...EXTENDED_DOCUMENTS];

export const AUDIT_PRIORITY_DOCUMENT_TYPES: DocumentType[] = ["COMPETITOR_ANALYSIS", "COMPANY_INTELLIGENCE"];

const AUDIT_DOCUMENT_ORDER: DocumentType[] = [
  ...AUDIT_PRIORITY_DOCUMENT_TYPES,
  "MARKETING_STRATEGY",
  "SEO_AUDIT",
  "GEO_AUDIT",
  "AUDIENCE_ANALYSIS",
  "CONTENT_AUDIT",
  "DESIGN_GUIDE",
  "CONTENT_STRATEGY",
  "PRODUCT_INFO",
];

export const AUDIT_DOCUMENT_QUEUE: CoreDocumentDefinition[] = AUDIT_DOCUMENT_ORDER.map((type) => {
  const definition = ALL_DOCUMENTS.find((document) => document.type === type);
  if (!definition) throw new Error(`Missing audit document definition for ${type}.`);
  return definition;
});

export function getDocumentDefinition(type: DocumentType): CoreDocumentDefinition | undefined {
  return ALL_DOCUMENTS.find((document) => document.type === type);
}

const socialFoundation = [
  skill("social-media-skills", "brand-profile", "foundation", "Apply the approved brand, audience, proof, and positioning context."),
  skill("social-media-skills", "voice-builder", "foundation", "Keep the output in the brand's credible human voice."),
];
const sourceQuality = skill("social-media-skills", "content-research-and-sourcing", "quality", "Verify public sources, freshness, and claim boundaries before output.");
export const AGENT_DEFINITIONS: AgentDefinition[] = [
  { type: "AI_CMO", label: "AI CMO Director", optional: false, description: "Cross-functional diagnosis and decision sequencing from the company evidence.", skills: [...companyIntelligenceSkills, skill("openclaw-marketing-skills", "marketing-ideas", "analysis", "Generate evidence-led strategic options."), skill("social-media-skills", "goals-and-kpis", "reporting", "Turn recommendations into measurable decisions.")], instructions: "Resolve contradictions across evidence, choose the highest-leverage priorities, and define dependencies, owners, 30/60/90-day actions, success checks, risks, and missing evidence." },
  { type: "SEO", label: "SEO Agent", optional: false, description: "Search opportunities governed by the main SEO audit workflow.", skills: [...seoAuditSkills], instructions: "Apply the ordered SEO skill chain to the latest website and official-source evidence. Return prioritized, source-linked actions without invented rankings or traffic." },
  { type: "TECHNICAL_SEO", label: "Technical SEO Agent", optional: false, description: "Crawlability, page experience, schema, and technical search diagnostics.", skills: [seoAuditSkills[0], seoAuditSkills[1], seoAuditSkills[4], seoAuditSkills[5], seoAuditSkills[6]], instructions: "Focus on observable technical evidence, impact, reproduction or validation steps, and a concrete success check. Distinguish Lighthouse lab data from field metrics." },
  { type: "GEO", label: "GEO Agent", optional: false, description: "AI-search citability, entity clarity, and answer-readiness opportunities.", skills: [...geoAuditSkills], instructions: "Return source-linked answer-engine readiness findings and content actions. Do not claim live citations without monitoring evidence." },
  { type: "COMPETITOR", label: "Competitor Agent", optional: false, description: "Six or more verified competitors, official logos, positioning, and competitive attributes.", skills: [...competitorAnalysisSkills], instructions: "Use current public discovery to identify at least six real relevant companies. Expand into genuine adjacent or indirect alternatives when a narrow niche has fewer direct competitors. Every finding must represent one company and include companyName, officialWebsite, a 1-2 sentence positioning summary, competitiveAttributes, and source URLs from that company's official site. Never fabricate a company or private performance." },
  { type: "AUDIENCE", label: "Audience Agent", optional: false, description: "ICP, buying jobs, objections, and voice-of-customer research.", skills: [...audienceAnalysisSkills], instructions: "Mine only supplied and current public evidence for customer jobs, pains, desired outcomes, objections, and language. Clearly label hypotheses and validation needs." },
  { type: "CONTENT_AUDIT", label: "Content Strategy Agent", optional: false, description: "Content gaps, pillars, briefs, and measurable next actions.", skills: [...contentAuditSkills], instructions: "Turn the current content inventory and public research into explicit keep, refresh, consolidate, and create decisions with briefs and measurement." },
  { type: "X", label: "X Agent", optional: false, description: "Evidence-led opportunity discovery, high-velocity hooks, contrarian POVs, and structured thread creation.", skills: [skill("openclaw-marketing-skills", "product-marketing-context", "foundation", "Extract the commercially important message, offer architecture, and proof points."), skill("social-media-skills", "brand-profile", "foundation", "Define visual and verbal brand consistency."), skill("social-media-skills", "voice-builder", "foundation", "Enforce concise, human tone, vocabulary, and banned phrasing guardrails."), skill("openclaw-marketing-skills", "marketing-ideas", "analysis", "Create strategic content angles and contrarian experiments."), skill("social-media-skills", "goals-and-kpis", "analysis", "Rank opportunities according to commercial and conversation KPIs."), skill("social-media-skills", "x-growth", "analysis", "Apply current X-native engagement and distribution mechanics."), skill("social-media-skills", "thread-writer", "production", "Create structured 5-tweet high-retention threads."), skill("social-media-skills", "hook-writer", "production", "Generate scroll-stopping hooks without clickbait."), skill("social-media-skills", "cross-platform-repurposing", "quality", "Design native repurposing flows for LinkedIn and Instagram."), sourceQuality], instructions: "Build continuous opportunity-discovery and content-generation packages grounded in company memory. Follow the strategist flow: evidence/opportunity first → angle second → writing third. Generate sharp, natural copy, multi-angle scored hooks, 3 distinct variants, structured threads, and cross-channel repurposing plans." },
  { type: "REDDIT", label: "Reddit Customer Research", optional: false, description: "A concise customer-signal readout with sourced threads and safe, useful response drafts.", skills: [...socialFoundation, skill("social-media-skills", "audience-research", "research", "Identify target-customer jobs, pains, objections, and actual language."), skill("social-media-skills", "reddit-marketing", "analysis", "Apply the advisory-only CRED framework and subreddit safeguards."), skill("social-media-skills", "community-management", "production", "Recommend credible manual participation and escalation boundaries."), skill("social-media-skills", "ai-search-optimization", "analysis", "Assess source-layer relevance without fabricated citation claims."), sourceQuality], instructions: "You are the Reddit Opportunity Hunter. Evaluate candidate public discussions for genuine commercial relevance, intent (solution_search, recommendation_request, pain_expression), and promotion safety. For each candidate, determine the exact customer problem, explain why this matters with ICP and product fit, assess spam risk, extract verbatim quote evidence, and generate a natural, transparent, non-promotional response draft in recommendedResponse." },
  { type: "ARTICLES", label: "Articles Agent", optional: false, description: "Evidence-led article opportunities, briefs, and outlines.", skills: [skill("claude-seo", "seo-content-brief", "foundation", "Use the SEO brief workflow."), skill("claude-seo", "seo-content", "analysis", "Apply quality and search-usefulness standards."), skill("openclaw-marketing-skills", "content-strategy", "analysis", "Connect topics to business and funnel needs."), skill("social-media-skills", "educational-content-and-how-to", "production", "Create useful educational structures."), sourceQuality], instructions: "Create three article briefs with intent, audience, buyer stage, evidence requirement, angle, outline, internal-link targets, and source register." },
  { type: "LINKEDIN", label: "LinkedIn Agent", optional: false, description: "A concise page readout, previous-post summary, new drafts, and comment opportunities.", skills: [...socialFoundation, skill("social-media-skills", "linkedin-growth", "analysis", "Apply personal-profile LinkedIn growth strategy."), skill("social-media-skills", "linkedin-company-pages", "analysis", "Route company-page work appropriately."), skill("social-media-skills", "linkedin-post-writer", "production", "Create native LinkedIn drafts."), skill("social-media-skills", "carousel-writer", "production", "Create a document-carousel brief."), sourceQuality], instructions: "You are the LinkedIn Content Opportunity Hunter. Synthesize signals across company memory, SEO/GEO audit discoveries, customer complaints, and competitor gaps. Cluster repeated audience pain points into thought-leadership topics. For each opportunity, define the angle, hook, recommended format (text_post or carousel), why this fits the company's ICP, and generate a complete, publish-ready native post in draftContent." },
  { type: "CAMPAIGN_PLANNER", label: "Campaign Planner", optional: true, description: "A goal-led multi-channel campaign and execution sequence.", skills: [skill("social-media-skills", "campaign-and-launch-planning", "foundation", "Use the campaign planning framework."), skill("openclaw-marketing-skills", "launch-strategy", "analysis", "Structure launch phases and dependencies."), skill("social-media-skills", "goals-and-kpis", "reporting", "Map the campaign to decision-ready KPIs."), sourceQuality], instructions: "Plan one coherent campaign with one goal, audience, proposition, phases, channel roles, deliverables, measurement, and dependencies." },
  { type: "INSTAGRAM", label: "Instagram Agent", optional: true, description: "Continuous opportunity discovery, multi-format planning, Reels, Carousels, Stories, and engagement intelligence.", skills: [skill("openclaw-marketing-skills", "product-marketing-context", "foundation", "Extract the commercially important message, offer architecture, and proof points."), skill("social-media-skills", "brand-profile", "foundation", "Define visual and verbal brand consistency."), skill("social-media-skills", "voice-builder", "foundation", "Enforce caption, hook, and CTA guardrails."), skill("openclaw-marketing-skills", "marketing-ideas", "analysis", "Create strategic concepts and experimental angles."), skill("social-media-skills", "goals-and-kpis", "analysis", "Determine whether the opportunity supports acquisition, awareness, engagement, or leads."), skill("social-media-skills", "instagram-growth", "analysis", "Apply current Instagram growth mechanics."), skill("social-media-skills", "instagram-seo", "analysis", "Map discoverability, search tags, and keyword surfaces."), skill("social-media-skills", "carousel-writer", "production", "Create slide-by-slide saveable carousel briefs."), skill("social-media-skills", "reels-script", "production", "Create native 0-3s hook to CTA Reel storyboards."), skill("social-media-skills", "story-writer", "production", "Design interactive Story sequences with stickers and polls."), skill("social-media-skills", "caption-writer", "production", "Draft high-converting captions with clear CTAs."), skill("social-media-skills", "hook-writer", "production", "Generate multi-angle scroll-stopping hooks."), skill("social-media-skills", "social-proof-and-testimonials", "quality", "Structure verified customer transformation and proof posts."), skill("social-media-skills", "cross-platform-repurposing", "quality", "Design native repurposing flows for Stories, LinkedIn, and X."), sourceQuality], instructions: "Build continuous opportunity-discovery, content-planning, and engagement-intelligence packages grounded in company memory. Generate multi-angle scored opportunities, complete slide-by-slide Carousels, Reel storyboards (0-3s Hook to CTA), interactive Stories, and cross-channel repurposing plans." },
  { type: "YOUTUBE", label: "YouTube Agent", optional: true, description: "Long-form, Shorts, packaging, retention, and metadata opportunities.", skills: [...socialFoundation, skill("social-media-skills", "youtube-long-form", "analysis", "Create long-form packaging and retention structure."), skill("social-media-skills", "youtube-shorts", "production", "Create Shorts concepts."), skill("social-media-skills", "youtube-publishing-and-metadata", "production", "Create honest metadata and publishing guidance."), skill("social-media-skills", "thumbnail-design", "production", "Brief the thumbnail concept."), sourceQuality], instructions: "Create one long-form concept, two Shorts, packaging, thumbnail direction, retention plan, and metadata. Do not claim search volume without data." },
  { type: "CREATIVE_VISUAL", label: "Creative and Visual Agent", optional: true, description: "On-brand campaign visual systems and production briefs.", skills: [...designGuideSkills], instructions: "Define one cohesive visual direction and three production-ready asset briefs grounded in observed brand evidence and validated platform specifications." },
  { type: "UGC_VIDEOS", label: "UGC Video Agent", optional: true, description: "Authentic UGC concepts, scripts, shot lists, and disclosure guidance.", skills: [...socialFoundation, skill("social-media-skills", "ugc-and-influencer", "analysis", "Apply UGC authenticity, rights, and disclosure requirements."), skill("social-media-skills", "short-form-video-script", "production", "Create native short-form scripts."), skill("social-media-skills", "scripting-and-storyboarding", "production", "Create usable shot and story plans."), sourceQuality], instructions: "Create three authentic UGC concepts with creator archetype, hook, script, shots, proof, usage rights, and disclosure. Do not invent creators or testimonials." },
  { type: "INFLUENCER", label: "Influencer Research Agent", optional: true, description: "Creator archetypes, qualification, outreach logic, and risk controls.", skills: [...socialFoundation, skill("social-media-skills", "ugc-and-influencer", "analysis", "Define fit, rights, disclosure, and creator safeguards."), skill("social-media-skills", "collabs-and-cross-promotion", "analysis", "Assess audience and partnership fit."), skill("social-media-skills", "social-proof-and-testimonials", "quality", "Keep proof and permissions accurate."), sourceQuality], instructions: "Recommend creator archetypes and qualification criteria, not invented people. Include outreach angles, deliverables, rights, disclosure, brand-safety checks, and measurement." },
  { type: "UGC_INFLUENCER", label: "UGC and Influencer Planner", optional: true, description: "Combined creator and UGC campaign architecture.", skills: [...socialFoundation, skill("social-media-skills", "ugc-and-influencer", "analysis", "Plan the creator and UGC system."), skill("social-media-skills", "campaign-and-launch-planning", "production", "Sequence the program."), skill("social-media-skills", "goals-and-kpis", "reporting", "Define outcome-led measurement."), sourceQuality], instructions: "Create a disclosure-aware UGC and influencer program with archetypes, briefs, outreach, rights, campaign phases, KPIs, and approval gates." },
  { type: "EMAIL_NEWSLETTER", label: "Email and Newsletter Agent", optional: true, description: "Lifecycle, newsletter, and campaign-email opportunities.", skills: [skill("openclaw-marketing-skills", "product-marketing-context", "foundation", "Anchor messages in the offer and audience."), skill("openclaw-marketing-skills", "email-sequence", "analysis", "Design the sequence and triggers."), skill("social-media-skills", "email-and-newsletter", "production", "Apply newsletter-native craft."), skill("openclaw-marketing-skills", "copywriting", "production", "Create clear conversion copy."), sourceQuality], instructions: "Create an email opportunity map with audience, trigger, objective, sequence, subject angles, proof, CTA, and measurement. Distinguish lifecycle from cold outbound." },
  { type: "PAID_MEDIA", label: "Paid Media Agent", optional: true, description: "Channel, audience, creative, landing-page, and testing recommendations.", skills: [skill("openclaw-marketing-skills", "paid-ads", "foundation", "Choose channels and structure from evidence."), skill("openclaw-marketing-skills", "ad-creative", "production", "Create compliant creative concepts."), skill("openclaw-marketing-skills", "ab-test-setup", "analysis", "Design valid tests and decision rules."), skill("social-media-skills", "goals-and-kpis", "reporting", "Map spend decisions to available KPIs."), sourceQuality], instructions: "Recommend a paid test plan with channel rationale, audiences, messages, creative variants, landing-page dependencies, success metrics, and stop/scale rules. Never invent CPC, CPA, or ROAS." },
  { type: "COMMUNITY", label: "Community and Engagement Agent", optional: true, description: "A sustainable engagement, response, and escalation operating rhythm.", skills: [...socialFoundation, skill("social-media-skills", "engagement-routine", "analysis", "Create a sustainable human engagement cadence."), skill("social-media-skills", "reply-and-comment-writer", "production", "Create useful response patterns."), skill("social-media-skills", "community-management", "quality", "Apply moderation and escalation safeguards.")], instructions: "Create a weekly engagement system, conversation priorities, response principles, escalation rules, and reusable reply patterns." },
  { type: "PROGRAMMATIC_SEO", label: "Programmatic SEO Agent", optional: true, description: "Template-driven pages, content uniqueness gates, hub-and-spoke linking, and index bloat safeguards.", skills: [skill("claude-seo", "seo-programmatic", "foundation", "Audit scaled and template-generated page structures against Google quality guidelines."), skill("claude-seo", "seo-cluster", "analysis", "Map topic cluster architectures and internal relationship graphs."), skill("openclaw-marketing-skills", "content-strategy", "analysis", "Connect scaled page assets to intent and conversion value."), sourceQuality], instructions: "Audit existing URL patterns, template uniqueness, and data-driven page expansion opportunities. Enforce the >=40% unique content threshold to guard against scaled content penalties, recommend hub-and-spoke internal linking density, and outline programmatic rollout gates with canonical safeguards." },
];

export const INITIAL_AGENT_TYPES: AgentType[] = ["X", "REDDIT", "ARTICLES", "LINKEDIN", "INSTAGRAM"];

export const INTERNAL_OPERATIONS: Record<InternalOperation, { label: string; skills: SkillRef[]; instructions: string }> = {
  "ai-cmo-chat": { label: "AI CMO conversation", skills: [skill("openclaw-marketing-skills", "product-marketing-context", "foundation", "Interpret requests against the company and offer context."), skill("openclaw-marketing-skills", "marketing-psychology", "analysis", "Evaluate buyer behavior without manipulation."), skill("openclaw-marketing-skills", "marketing-ideas", "production", "Generate practical strategic options."), skill("social-media-skills", "goals-and-kpis", "quality", "Connect advice to measurable decisions."), sourceQuality], instructions: "Every answer must follow a structured two-phase synthesis: 1) First, answer using the exact methodology and strategic frameworks from the installed repository skills (product marketing context, behavioral psychology, CRO, SEO/GEO principles, campaign planning). 2) Second, ground and apply the recommendations directly against the latest company news, recent product updates, crawled website pages, and live competitive discoveries." },
  "ai-cmo-synthesis": { label: "AI CMO synthesis", skills: [skill("openclaw-marketing-skills", "product-marketing-context", "foundation", "Use the shared commercial foundation."), skill("claude-seo", "seo-plan", "analysis", "Sequence search and site priorities."), skill("openclaw-marketing-skills", "marketing-ideas", "analysis", "Generate cross-channel strategic options."), skill("social-media-skills", "goals-and-kpis", "reporting", "Turn priorities into measurable decisions."), skill("social-media-skills", "analytics-and-reporting", "quality", "Close the loop with honest reporting rules.")], instructions: "Resolve contradictions across specialist outputs and produce a sequenced executive decision set with dependencies, KPIs, risks, and evidence gaps." },
  "document-edit": { label: "Skill-governed document editing", skills: [skill("openclaw-marketing-skills", "copy-editing", "production", "Apply the requested edit without damaging meaning."), skill("social-media-skills", "writing-style-and-tone", "production", "Preserve a consistent professional voice."), sourceQuality], instructions: "Preserve all supported facts, citations, tables, and unrelated sections while applying the requested edit." },
};

export function skillLabel(ref: SkillRef): string {
  return `${ref.repository}/${ref.skill}`;
}

export function mergeSkillChains(...chains: SkillRef[][]): SkillRef[] {
  return chains.flat().filter((ref, index, values) => values.findIndex((candidate) => candidate.repository === ref.repository && candidate.skill === ref.skill) === index);
}

export function getAgentDefinition(type: AgentType): AgentDefinition | undefined {
  return AGENT_DEFINITIONS.find((agent) => agent.type === type);
}

export function getInternalOperation(operation: InternalOperation) {
  return INTERNAL_OPERATIONS[operation];
}
