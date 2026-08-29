from __future__ import annotations

import base64
import html
import io
import json
import math
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from jinja2 import Template
from pypdf import PdfReader
try:
    from weasyprint import HTML
    WEASYPRINT_ERROR = ""
except Exception as error:
    HTML = None
    WEASYPRINT_ERROR = str(error)

PALETTE = {"purple": "#7C3AED", "deep": "#4C1D95", "magenta": "#DB2777", "ink": "#1F1A1D", "slate": "#625A60", "cream": "#FFF9F5", "blush": "#FAECF2", "line": "#E9DDD8", "green": "#087F5B", "blue": "#1769AA", "orange": "#C2410C"}
ACRONYMS = ("SEO", "GEO", "ICP", "PESTEL", "SWOT", "ROI", "KPI", "CTR", "CTA", "AI", "API", "URL", "B2B")
DECISION_WORDS = {"priority": 11, "recommend": 10, "impact": 9, "risk": 9, "gap": 8, "opportunity": 7, "loss": 7, "decline": 7, "growth": 6, "conversion": 6, "revenue": 6, "urgent": 10, "critical": 10}
ACTION_WORDS = re.compile(r"\b(should|must|recommend|prioriti[sz]e|fix|build|publish|improve|reduce|increase|create|launch|replace|consolidate|measure|implement|address|optimi[sz]e|clarify|align|simplify|expand|validate|map|define|sequence|connect)\b", re.I)
STOPWORDS = {"the", "and", "for", "with", "that", "this", "from", "into", "your", "their", "have", "has", "are", "was", "were", "will", "would", "could", "should", "company", "analysis", "audit", "finding", "report"}
MODULE_META = {
    "COMPANY_INTELLIGENCE": ("Company Intelligence", "What the business appears to sell, to whom, and where the current story creates leverage or confusion."),
    "SEO_AUDIT": ("SEO Audit", "How discoverability, technical signals, and search intent translate into qualified demand."),
    "GEO_AUDIT": ("GEO and AI Visibility", "Whether answer engines can identify, trust, and cite the company for the questions buyers actually ask."),
    "COMPETITOR_ANALYSIS": ("Competitor Analysis", "Where real alternatives create positioning pressure—and where the market still leaves whitespace."),
    "AUDIENCE_ANALYSIS": ("Audience and ICP Research", "Which buyer groups feel the problem most acutely and what evidence moves them toward action."),
    "CONTENT_AUDIT": ("Content Audit and Strategy", "Which content earns attention, where the journey breaks, and what deserves production next."),
}

REPORT_PROFILES = {
    "COMPANY_INTELLIGENCE": {"name": "Company intelligence dossier", "kicker": "BUSINESS MODEL · POSITIONING · PROOF", "cover": "A source-of-truth dossier that makes the offer, positioning, proof, and unresolved strategic questions visible at a glance.", "executive": "The company system in one view", "executive_copy": "The strongest evidence is organized around what the business is, how it creates value, and where the story still needs proof.", "roadmap": "Decisions that sharpen the company story", "roadmap_copy": "Sequence foundational clarity before expression: resolve the offer, substantiate the promise, then scale the message.", "accent": "#6D28D9", "deep": "#3B0764", "soft": "#F3E8FF", "layout": "dossier", "visuals": ("stack", "orbit", "ladder")},
    "SEO_AUDIT": {"name": "Search systems diagnostic", "kicker": "CRAWL · INTENT · EXPERIENCE", "cover": "A diagnostic field report that traces how technical health, page intent, authority, and experience combine to create or suppress search opportunity.", "executive": "Where search performance is constrained", "executive_copy": "Priorities are ordered by dependency and observable impact, separating confirmed crawl evidence from measurements that still require connected search data.", "roadmap": "Technical-to-demand remediation path", "roadmap_copy": "Fix constraints in dependency order so later content and authority work can compound instead of masking structural problems.", "accent": "#0369A1", "deep": "#0C4A6E", "soft": "#E0F2FE", "layout": "diagnostic", "visuals": ("journey", "matrix", "network")},
    "GEO_AUDIT": {"name": "Answer-engine visibility map", "kicker": "ENTITY · ANSWERS · CITABILITY", "cover": "An answer-engine readiness map showing whether the company can be understood, trusted, and cited for the questions that shape buyer decisions.", "executive": "What an answer engine can understand and trust", "executive_copy": "The report separates entity clarity, answer coverage, evidence density, and third-party corroboration instead of treating AI visibility as one opaque score.", "roadmap": "Path to citation readiness", "roadmap_copy": "Build a legible entity and answer layer first, then strengthen proof and independent corroboration around priority buyer questions.", "accent": "#0F766E", "deep": "#134E4A", "soft": "#CCFBF1", "layout": "map", "visuals": ("network", "ladder", "orbit")},
    "COMPETITOR_ANALYSIS": {"name": "Competitive landscape atlas", "kicker": "ALTERNATIVES · POSITIONING · WHITESPACE", "cover": "A market atlas that compares real alternatives on shared criteria, exposes crowded claims, and identifies defensible whitespace worth validating.", "executive": "Where the market is crowded—and open", "executive_copy": "Competitors are treated as buyer alternatives, not a logo list. The emphasis is on contrast, proof, and the choices that create a distinct position.", "roadmap": "Moves that create defensible contrast", "roadmap_copy": "Validate whitespace before claiming it, then align offer, proof, and market-facing content around the strongest contrast.", "accent": "#B45309", "deep": "#78350F", "soft": "#FEF3C7", "layout": "atlas", "visuals": ("matrix", "spectrum", "radar")},
    "AUDIENCE_ANALYSIS": {"name": "Audience decision field guide", "kicker": "JOBS · TENSIONS · BUYING ROLES", "cover": "A human decision field guide that distinguishes buyers, users, triggers, anxieties, proof needs, and the language that should be validated next.", "executive": "The tensions behind the buying decision", "executive_copy": "Segments are organized by decisions and jobs rather than decorative personas, with hypotheses kept visibly separate from observed customer language.", "roadmap": "Audience learning and activation plan", "roadmap_copy": "Resolve the most consequential audience unknowns first, then translate validated tensions into offers, proof, journeys, and messages.", "accent": "#BE185D", "deep": "#831843", "soft": "#FCE7F3", "layout": "field-guide", "visuals": ("orbit", "journey", "decision")},
    "CONTENT_AUDIT": {"name": "Content portfolio diagnostic", "kicker": "COVERAGE · QUALITY · MOMENTUM", "cover": "A portfolio view of what to keep, refresh, consolidate, retire, and create—connected to buyer-stage gaps and measurable editorial decisions.", "executive": "What the portfolio should stop, start, and compound", "executive_copy": "Content is judged as a system of decisions, proof, pathways, and reuse—not as a volume count or a generic list of topics.", "roadmap": "Portfolio reset and production sequence", "roadmap_copy": "Recover value from existing assets before expanding the backlog, then build connected clusters around validated audience and demand gaps.", "accent": "#C2410C", "deep": "#7C2D12", "soft": "#FFEDD5", "layout": "portfolio", "visuals": ("matrix", "funnel", "wheel")},
    "MARKETING_STRATEGY": {"name": "Integrated growth playbook", "kicker": "CHOICES · CAMPAIGNS · MEASUREMENT", "cover": "An operating playbook that turns positioning and audience evidence into channel roles, campaign bets, decision rules, and a measurable 90-day cadence.", "executive": "The few strategic choices that organize the plan", "executive_copy": "The strategy privileges coherent bets and explicit trade-offs over a flat checklist of channels and tactics.", "roadmap": "90-day growth operating plan", "roadmap_copy": "Move from foundation to focused experiments to repeatable operating rhythm, with a decision gate at every horizon.", "accent": "#4F46E5", "deep": "#312E81", "soft": "#E0E7FF", "layout": "playbook", "visuals": ("wheel", "journey", "matrix")},
    "DESIGN_GUIDE": {"name": "Brand expression system", "kicker": "TOKENS · COMPOSITION · APPLICATION", "cover": "A production system for consistent visual expression: principles, tokens, composition rules, accessibility, templates, and quality checks.", "executive": "How the brand should feel and behave", "executive_copy": "Observed brand evidence is separated from proposed extensions so the design system can evolve without pretending every choice is already established.", "roadmap": "Design-system adoption path", "roadmap_copy": "Stabilize foundations and accessibility first, then templates, governance, and scalable production patterns.", "accent": "#7C3AED", "deep": "#4C1D95", "soft": "#F5F3FF", "layout": "studio", "visuals": ("spectrum", "blueprint", "stack")},
    "CONTENT_STRATEGY": {"name": "Full-funnel editorial system", "kicker": "PILLARS · JOURNEYS · DISTRIBUTION", "cover": "An editorial system connecting every asset to an audience decision, proof requirement, native format, distribution path, owner, KPI, and refresh trigger.", "executive": "The editorial system—not just the calendar", "executive_copy": "The strongest opportunities are arranged as connected pillars, journeys, and reuse loops so production compounds instead of fragmenting.", "roadmap": "90-day editorial build sequence", "roadmap_copy": "Establish the highest-leverage pillars, prove their distribution loops, then scale only what earns attention and advances a decision.", "accent": "#15803D", "deep": "#14532D", "soft": "#DCFCE7", "layout": "editorial", "visuals": ("orbit", "wheel", "journey")},
    "PRODUCT_INFO": {"name": "Offer and product intelligence book", "kicker": "OFFERS · VALUE · PROOF", "cover": "A commercial source of truth for offer hierarchy, use cases, value, differentiation, proof, objections, buying questions, and validation priorities.", "executive": "How the offer creates—and proves—value", "executive_copy": "The product is mapped from customer job to promised outcome to required proof, exposing gaps that weaken sales and marketing confidence.", "roadmap": "Offer validation and enablement path", "roadmap_copy": "Clarify the offer architecture, close the highest-risk proof gaps, then equip customer-facing teams with consistent decision support.", "accent": "#0E7490", "deep": "#164E63", "soft": "#CFFAFE", "layout": "product-book", "visuals": ("stack", "ladder", "decision")},
    "STRATEGIC_INTELLIGENCE": {"name": "Strategic intelligence synthesis", "kicker": "SYNTHESIS · PRIORITIES · ACTION", "cover": "A cross-functional synthesis that connects company, search, AI visibility, market, audience, and content evidence into one decision system.", "executive": "What materially matters across the system", "executive_copy": "Findings are selected for leverage and non-duplication rather than one-per-module symmetry.", "roadmap": "Impact-ranked roadmap", "roadmap_copy": "Actions compete for priority across modules. Placement reflects evidence, dependencies, and expected leverage.", "accent": "#7C3AED", "deep": "#4C1D95", "soft": "#FAECF2", "layout": "synthesis", "visuals": ("network", "matrix", "journey")},
    "DOCUMENT": {"name": "Decision document", "kicker": "EVIDENCE · INTERPRETATION · ACTION", "cover": "A focused, evidence-led document designed to make the key pattern, implication, and next decision easy to see.", "executive": "What materially matters", "executive_copy": "The strongest non-duplicative findings are surfaced first, with evidence boundaries kept explicit.", "roadmap": "Decision sequence", "roadmap_copy": "Actions are ordered by leverage, dependency, and confidence.", "accent": "#7C3AED", "deep": "#4C1D95", "soft": "#FAECF2", "layout": "brief", "visuals": ("matrix", "journey", "ladder")},
}


def normalize_acronyms(value: str) -> str:
    value = re.sub(r"[\ud800-\udfff]", "?", value)
    parts = re.split(r"(https?://[^\s)\]>]+)", value, flags=re.I)
    for index in range(0, len(parts), 2):
        for acronym in ACRONYMS: parts[index] = re.sub(rf"\b{acronym}\b", acronym, parts[index], flags=re.I)
    return "".join(parts)


def unwrap_structured(value: Any) -> str:
    if not isinstance(value, str):
        if isinstance(value, dict):
            for key in ("contentMarkdown", "content", "text", "summary"):
                if isinstance(value.get(key), str): return unwrap_structured(value[key])
        return ""
    candidate = value.strip().removeprefix("```json").removeprefix("```markdown").removeprefix("```md").removesuffix("```").strip()
    for _ in range(3):
        extracted = None
        for option in (candidate, candidate[candidate.find("{"):] if "{" in candidate else ""):
            if not option: continue
            try:
                parsed = json.loads(option)
                if isinstance(parsed, dict): extracted = next((parsed.get(key) for key in ("contentMarkdown", "content", "text", "summary") if isinstance(parsed.get(key), str)), None)
            except Exception: pass
            if extracted: break
        if not extracted or extracted == candidate: break
        candidate = extracted.strip()
    return normalize_acronyms(candidate.replace("\\n", "\n").replace("\\t", "\t"))


def clean_inline(value: str) -> str:
    value = unwrap_structured(value)
    for _ in range(2):
        try:
            repaired = value.encode("cp1252").decode("utf-8")
            if repaired == value: break
            value = repaired
        except (UnicodeEncodeError, UnicodeDecodeError): break
    for broken, repaired in {"â€”": "—", "â€“": "–", "â€™": "’", "â€œ": "“", "â€": "”", "Â®": "®", "Â": ""}.items(): value = value.replace(broken, repaired)
    value = re.sub(r"(?:â[^\w\s]{1,4})+", " · ", value)
    value = re.sub(r"!\[([^]]*)\]\([^)]*\)", r"\1", value)
    value = re.sub(r"\[([^]]+)\]\((https?://[^)]+)\)", r"\1 (\2)", value)
    value = re.sub(r"[\u2500-\u259f\ufffd]+", " · ", value)
    value = re.sub(r"(?:\s*·\s*){2,}", " · ", value)
    value = re.sub(r"[*_`]+", "", value)
    return html.escape(value.strip())


def table_cells(line: str) -> list[str]: return [re.sub(r"\\\|", "|", cell).strip() for cell in line.strip().strip("|").split("|")]


def parse_sections(markdown: str) -> list[dict[str, Any]]:
    lines = unwrap_structured(markdown).replace("\r", "").split("\n"); sections: list[dict[str, Any]] = []; current = {"title": "Principal finding", "level": 2, "blocks": []}; paragraph: list[str] = []
    def flush() -> None:
        nonlocal paragraph
        if paragraph: current["blocks"].append({"type": "paragraph", "text": " ".join(paragraph)}); paragraph = []
    def finish() -> None:
        flush()
        if current["blocks"]: sections.append(dict(current))
    index = 0
    while index < len(lines):
        line = lines[index].strip(); heading = re.match(r"^(#{1,4})\s+(.+)$", line)
        if heading: finish(); current = {"title": re.sub(r"[*_`]", "", heading.group(2)).strip(), "level": len(heading.group(1)), "blocks": []}; index += 1; continue
        if not line or line in {"---", "***", "___"}: flush(); index += 1; continue
        if "|" in line and index + 1 < len(lines) and re.match(r"^\s*\|?\s*:?-{3,}", lines[index + 1]):
            flush(); rows = [table_cells(line)]; index += 2
            while index < len(lines) and "|" in lines[index] and lines[index].strip(): rows.append(table_cells(lines[index])); index += 1
            current["blocks"].append({"type": "table", "rows": rows}); continue
        if re.match(r"^\d+[.)]\s+", line):
            flush(); items = []
            while index < len(lines):
                match = re.match(r"^\s*\d+[.)]\s+(.+)$", lines[index])
                if not match: break
                items.append(match.group(1).strip()); index += 1
            current["blocks"].append({"type": "ordered", "items": items}); continue
        if re.match(r"^[-*+]\s+", line):
            flush(); items = []
            while index < len(lines):
                match = re.match(r"^\s*[-*+]\s+(.+)$", lines[index])
                if not match: break
                items.append(match.group(1).strip()); index += 1
            current["blocks"].append({"type": "bullets", "items": items}); continue
        if line.startswith(">"): flush(); current["blocks"].append({"type": "quote", "text": line.lstrip("> ")}); index += 1; continue
        paragraph.append(line); index += 1
    finish(); return sections


def block_text(block: dict[str, Any]) -> str:
    if "text" in block: return block["text"]
    if "items" in block: return " ".join(block["items"])
    if "rows" in block: return " ".join(" ".join(row) for row in block["rows"])
    return ""


def score_text(value: str) -> int:
    lower = value.lower(); score = sum(weight for word, weight in DECISION_WORDS.items() if word in lower) + min(9, len(re.findall(r"\b\d+(?:\.\d+)?%?\b", value)) * 2)
    score += 4 if ACTION_WORDS.search(value) else 0
    if re.search(r"unrendered css|theme code|click publish|elementskit|dynamic-content|mega-menu", lower): score -= 24
    return score


def keywords(value: str) -> set[str]: return {word for word in re.findall(r"[a-z]{4,}", value.lower()) if word not in STOPWORDS}


def concise(value: str, limit: int = 330) -> str:
    text = re.sub(r"\s+", " ", re.sub(r"[*_`#>]", "", unwrap_structured(value))).strip()
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"


def headline_for(sections: list[dict[str, Any]], module_type: str = "") -> str:
    candidates = [(score_text(block_text(block)) + score_text(section["title"]), block_text(block)) for section in sections for block in section["blocks"] if block["type"] != "table" and len(block_text(block)) > 35]
    if module_type == "COMPETITOR_ANALYSIS":
        positioned = [(score_text(block_text(block)) + 18, block_text(block)) for section in sections if re.search(r"compet|position|alternative|landscape|roster", section["title"], re.I) for block in section["blocks"] if block["type"] != "table" and len(block_text(block)) > 35]
        if positioned: candidates = positioned
    return concise(max(candidates, key=lambda item: item[0])[1], 245) if candidates else "The evidence is incomplete enough that validation should precede execution."


def number_value(value: str) -> float | None:
    match = re.search(r"(?<![A-Za-z])(?:[$£€])?(-?\d[\d,]*(?:\.\d+)?)\s*%?", value)
    if not match: return None
    try: return float(match.group(1).replace(",", ""))
    except ValueError: return None


def chart_image(title: str, labels: list[str], values: list[float], time_series: bool) -> str:
    fig, ax = plt.subplots(figsize=(8.7, 4.2), dpi=210); fig.patch.set_facecolor("#FFFFFF"); ax.set_facecolor("#FFFFFF"); labels = [re.sub(r"[*_`]", "", label)[:31] for label in labels]
    if time_series:
        x = list(range(len(values))); ax.plot(x, values, color=PALETTE["purple"], linewidth=3, marker="o", markersize=6); ax.fill_between(x, values, alpha=.08, color=PALETTE["purple"]); ax.set_xticks(x, labels)
    else:
        colors = [PALETTE["purple"], PALETTE["magenta"], PALETTE["blue"], PALETTE["green"], PALETTE["orange"], "#A96BE0", "#D69ABB"]; bars = ax.barh(labels[::-1], values[::-1], color=colors[:len(values)][::-1]); ax.bar_label(bars, fmt="%.1f", padding=4, color=PALETTE["slate"], fontsize=8)
    ax.set_title(clean_inline(title), loc="left", fontsize=12, fontweight="bold", color=PALETTE["ink"], pad=12); ax.spines[["top", "right", "left"]].set_visible(False); ax.spines["bottom"].set_color(PALETTE["line"]); ax.grid(axis="y" if time_series else "x", color=PALETTE["line"], alpha=.7, linewidth=.7); ax.tick_params(axis="both", labelsize=8, colors=PALETTE["slate"], length=0); fig.tight_layout(); buffer = io.BytesIO(); fig.savefig(buffer, format="png", dpi=210, bbox_inches="tight"); plt.close(fig)
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


def chart_caption(labels: list[str], values: list[float], time_series: bool) -> str:
    if time_series:
        direction = "rises" if values[-1] > values[0] else "falls" if values[-1] < values[0] else "remains flat"
        return f"The series {direction} from {labels[0]} to {labels[-1]}; the direction matters more than any isolated point."
    high, low = values.index(max(values)), values.index(min(values)); return f"{labels[high]} leads while {labels[low]} trails, defining the clearest performance gap in the supplied evidence."


def flow_svg(items: list[str]) -> str:
    width, box_h, gap = 920, 82, 31; height = len(items) * box_h + (len(items) - 1) * gap + 18; parts = [f'<svg class="flow-svg" viewBox="0 0 {width} {height}" role="img" aria-label="Sequential process">', '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#7C3AED"/></marker></defs>']
    for index, item in enumerate(items):
        y = 8 + index * (box_h + gap); short = concise(item, 150); wrapped = [short[i:i+75] for i in range(0, len(short), 75)][:2]; parts.append(f'<rect x="44" y="{y}" width="832" height="{box_h}" rx="14" fill="#FBF5FF" stroke="#D9C5F4"/><circle cx="82" cy="{y + box_h/2}" r="20" fill="#7C3AED"/><text x="82" y="{y + box_h/2 + 5}" text-anchor="middle" fill="white" font-size="15" font-weight="700">{index + 1}</text>')
        for line_index, line in enumerate(wrapped): parts.append(f'<text x="118" y="{y + 34 + line_index * 20}" fill="#332C31" font-family="Helvetica,Arial,sans-serif" font-size="15">{clean_inline(line)}</text>')
        if index < len(items) - 1: parts.append(f'<line x1="460" y1="{y + box_h}" x2="460" y2="{y + box_h + gap - 8}" stroke="#7C3AED" stroke-width="3" marker-end="url(#arrow)"/>')
    parts.append("</svg>"); return "".join(parts)


def funnel_svg(items: list[str]) -> str:
    width, height = 900, 360; colors = ["#4C1D95", "#7C3AED", "#A855F7", "#DB2777", "#E879A8"]; parts = [f'<svg class="funnel-svg" viewBox="0 0 {width} {height}" role="img" aria-label="Conversion funnel">']
    for index, item in enumerate(items[:5]):
        inset = index * 54; y = 15 + index * 66; points = f"{inset},{y} {width-inset},{y} {width-inset-35},{y+60} {inset+35},{y+60}"; parts.append(f'<polygon points="{points}" fill="{colors[index]}"/><text x="{width/2}" y="{y+36}" text-anchor="middle" fill="white" font-size="15" font-family="Helvetica,Arial,sans-serif">{clean_inline(concise(item, 80))}</text>')
    parts.append("</svg>"); return "".join(parts)


def priority_svg(rows: list[list[str]], headers: list[str]) -> str:
    parts = ['<svg class="priority-svg" viewBox="0 0 880 500" role="img" aria-label="Impact and effort priority matrix"><rect width="880" height="500" fill="#fff"/><rect x="70" y="30" width="380" height="205" fill="#E9F8F2"/><rect x="450" y="30" width="380" height="205" fill="#FFF4E8"/><rect x="70" y="235" width="380" height="205" fill="#F4EFFA"/><rect x="450" y="235" width="380" height="205" fill="#F8ECEF"/><line x1="450" y1="30" x2="450" y2="440" stroke="#D8CBC5"/><line x1="70" y1="235" x2="830" y2="235" stroke="#D8CBC5"/><text x="90" y="58" font-size="15" font-weight="700" fill="#087F5B">QUICK WINS</text><text x="470" y="58" font-size="15" font-weight="700" fill="#C2410C">MAJOR BETS</text><text x="90" y="263" font-size="15" font-weight="700" fill="#4C1D95">FILL-INS</text><text x="470" y="263" font-size="15" font-weight="700" fill="#9F1239">DEPRIORITIZE</text>']; impact_index = next((i for i, h in enumerate(headers) if "impact" in h.lower()), 1); effort_index = next((i for i, h in enumerate(headers) if "effort" in h.lower()), 2)
    for index, row in enumerate(rows[:8]):
        impact = "high" in row[impact_index].lower() if impact_index < len(row) else index < 4; effort = "high" in row[effort_index].lower() if effort_index < len(row) else index % 2 == 1; base_x = 470 if effort else 90; base_y = 75 if impact else 280; x = base_x + (index % 2) * 165; y = base_y + (index // 2 % 3) * 52; parts.append(f'<circle cx="{x}" cy="{y}" r="13" fill="#7C3AED"/><text x="{x+22}" y="{y+5}" font-size="12" fill="#332C31">{clean_inline(concise(row[0], 26))}</text>')
    parts.append('<text x="450" y="482" text-anchor="middle" font-size="12" fill="#625A60">EFFORT →</text><text x="22" y="235" transform="rotate(-90 22 235)" text-anchor="middle" font-size="12" fill="#625A60">IMPACT →</text></svg>'); return "".join(parts)


def svg_lines(value: str, limit: int = 27, maximum: int = 2) -> list[str]:
    words = re.sub(r"\s+", " ", re.sub(r"[*_`#>]", "", value)).strip().split(); lines: list[str] = []; current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and len(candidate) > limit:
            lines.append(current); current = word
            if len(lines) == maximum: break
        else: current = candidate
    if current and len(lines) < maximum: lines.append(current)
    return lines[:maximum] or ["Evidence gap"]


def visual_items(section: dict[str, Any] | None, module: dict[str, Any], maximum: int = 5) -> list[tuple[str, str]]:
    candidates: list[tuple[str, str]] = []
    source_sections = [section] if section else module.get("sections", [])
    for candidate in source_sections:
        if not candidate: continue
        detail = next((concise(block_text(block), 115) for block in candidate["blocks"] if len(block_text(block)) > 20), "Evidence boundary to validate")
        candidates.append((concise(candidate["title"], 48), detail))
        if len(candidates) >= maximum: break
    while len(candidates) < min(4, maximum):
        label, detail = [("Observed signal", "What the supplied evidence establishes"), ("Strategic tension", "The consequential choice or unresolved trade-off"), ("Validation gate", "What must be learned before scaling"), ("Next decision", "The smallest useful action that changes confidence")][len(candidates)]
        candidates.append((label, detail))
    return candidates[:maximum]


def label_at(parts: list[str], x: float, y: float, value: str, color: str = "#332C31", anchor: str = "middle", size: int = 13, width: int = 27) -> None:
    for index, line in enumerate(svg_lines(value, width)):
        parts.append(f'<text x="{x}" y="{y + index * 17}" text-anchor="{anchor}" fill="{color}" font-family="Helvetica,Arial,sans-serif" font-size="{size}">{clean_inline(line)}</text>')


def signature_svg(kind: str, title: str, items: list[tuple[str, str]], accent: str, deep: str, soft: str) -> str:
    width, height = 920, 390; parts = [f'<svg class="signature-svg" viewBox="0 0 {width} {height}" role="img" aria-label="{clean_inline(title)}"><rect width="920" height="390" rx="22" fill="#FFFFFF"/><text x="40" y="38" fill="{deep}" font-family="Helvetica,Arial,sans-serif" font-size="18" font-weight="700">{clean_inline(concise(title, 68))}</text>']
    labels = [item[0] for item in items]
    if kind == "stack":
        for index, label in enumerate(labels[:4]):
            inset = 60 + index * 62; y = 290 - index * 60; parts.append(f'<path d="M{inset} {y} H{width-inset} L{width-inset-32} {y+48} H{inset+32} Z" fill="{accent}" opacity="{.28 + index * .18:.2f}"/>'); label_at(parts, width/2, y+29, label, deep, size=13, width=48)
    elif kind == "orbit":
        parts.append(f'<circle cx="460" cy="215" r="66" fill="{accent}"/><circle cx="460" cy="215" r="145" fill="none" stroke="{accent}" opacity=".25" stroke-width="2" stroke-dasharray="8 8"/>'); label_at(parts, 460, 210, labels[0], "#FFFFFF", size=13, width=19)
        positions = [(460,70),(690,195),(460,350),(230,195)]
        for (x,y), label in zip(positions, labels[1:5]): parts.append(f'<circle cx="{x}" cy="{y}" r="42" fill="{soft}" stroke="{accent}"/><line x1="460" y1="215" x2="{x}" y2="{y}" stroke="{accent}" opacity=".35"/>'); label_at(parts, x, y-5, label, deep, size=11, width=16)
    elif kind == "journey":
        for index, label in enumerate(labels[:4]):
            x = 45 + index * 216; fill = deep if index == 0 else accent; opacity = 1 - index * .12; parts.append(f'<path d="M{x} 120 H{x+175} L{x+205} 215 L{x+175} 310 H{x} L{x+28} 215 Z" fill="{fill}" opacity="{opacity:.2f}"/>'); label_at(parts, x+102, 205, label, "#FFFFFF", size=12, width=21)
    elif kind == "matrix":
        colors = [soft, "#E0F2FE", "#DCFCE7", "#FFEDD5"]
        for index, label in enumerate(labels[:4]):
            x = 70 + (index % 2) * 395; y = 65 + (index // 2) * 150; parts.append(f'<rect x="{x}" y="{y}" width="365" height="125" rx="14" fill="{colors[index]}" stroke="{accent}" opacity=".95"/>'); label_at(parts, x+182, y+49, label, deep, size=13, width=35); label_at(parts, x+182, y+86, items[index][1], "#625A60", size=10, width=52)
    elif kind == "network":
        parts.append(f'<rect x="357" y="166" width="206" height="98" rx="24" fill="{deep}"/>'); label_at(parts, 460, 207, labels[0], "#FFFFFF", size=13, width=22)
        positions = [(150,105),(150,310),(770,105),(770,310)]
        for (x,y), label in zip(positions, labels[1:5]): parts.append(f'<line x1="460" y1="215" x2="{x}" y2="{y}" stroke="{accent}" stroke-width="3" opacity=".45"/><rect x="{x-105}" y="{y-42}" width="210" height="84" rx="42" fill="{soft}" stroke="{accent}"/>'); label_at(parts, x, y-4, label, deep, size=11, width=24)
    elif kind == "ladder":
        for index, label in enumerate(labels[:4]):
            x = 70 + index * 205; y = 288 - index * 64; parts.append(f'<rect x="{x}" y="{y}" width="185" height="{330-y}" rx="12" fill="{accent}" opacity="{.34 + index * .18:.2f}"/>'); label_at(parts, x+92, y+31, label, deep if index < 2 else "#FFFFFF", size=11, width=20)
    elif kind == "spectrum":
        colors = ["#DBEAFE", soft, "#FCE7F3", "#FFEDD5"]
        for index, label in enumerate(labels[:4]):
            x = 55 + index * 205; parts.append(f'<rect x="{x}" y="105" width="205" height="190" fill="{colors[index]}"/><circle cx="{x+102}" cy="160" r="31" fill="{accent}" opacity="{.35 + index * .16:.2f}"/>'); label_at(parts, x+102, 220, label, deep, size=12, width=22)
        parts.append(f'<line x1="55" y1="320" x2="875" y2="320" stroke="{deep}" stroke-width="3"/><text x="55" y="350" fill="#625A60" font-size="11">FAMILIAR</text><text x="875" y="350" text-anchor="end" fill="#625A60" font-size="11">DISTINCTIVE</text>')
    elif kind == "radar":
        parts.append(f'<path d="M460 70 L745 180 L635 335 L285 335 L175 180 Z" fill="{soft}" stroke="{accent}" stroke-width="2"/><path d="M460 125 L660 200 L585 290 L335 290 L260 200 Z" fill="none" stroke="{accent}" stroke-dasharray="7 6"/>')
        positions = [(460,65),(785,180),(660,360),(260,360),(135,180)]
        for (x,y), label in zip(positions, labels[:5]): label_at(parts, x, y, label, deep, size=11, width=20)
        parts.append('<text x="460" y="215" text-anchor="middle" fill="#625A60" font-size="11">QUALITATIVE CONTRAST MAP</text>')
    elif kind == "funnel":
        colors = [deep, accent, "#A855F7", "#DB2777"]
        for index, label in enumerate(labels[:4]):
            inset = 95 + index * 66; y = 72 + index * 70; parts.append(f'<path d="M{inset} {y} H{width-inset} L{width-inset-38} {y+58} H{inset+38} Z" fill="{colors[index]}"/>'); label_at(parts, width/2, y+33, label, "#FFFFFF", size=12, width=50)
    elif kind == "wheel":
        parts.append(f'<circle cx="460" cy="215" r="76" fill="{deep}"/>'); label_at(parts,460,210,labels[0],"#FFFFFF",size=13,width=20)
        positions=[(460,77),(682,215),(460,352),(238,215)]
        for index, ((x,y), label) in enumerate(zip(positions, labels[1:5])): parts.append(f'<path d="M460 215 L{x} {y}" stroke="{accent}" stroke-width="16" opacity=".28"/><circle cx="{x}" cy="{y}" r="50" fill="{soft}" stroke="{accent}" stroke-width="2"/>'); label_at(parts,x,y-5,label,deep,size=11,width=18)
    elif kind == "decision":
        parts.append(f'<rect x="335" y="62" width="250" height="72" rx="36" fill="{deep}"/>'); label_at(parts,460,92,labels[0],"#FFFFFF",size=12,width=28)
        positions=[(225,225),(695,225),(225,340),(695,340)]
        for index, ((x,y), label) in enumerate(zip(positions, labels[1:5])):
            parent_x = 460 if index < 2 else positions[index-2][0]; parent_y = 134 if index < 2 else positions[index-2][1]+38; parts.append(f'<line x1="{parent_x}" y1="{parent_y}" x2="{x}" y2="{y-38}" stroke="{accent}" stroke-width="3"/><rect x="{x-130}" y="{y-38}" width="260" height="76" rx="12" fill="{soft}" stroke="{accent}"/>'); label_at(parts,x,y-7,label,deep,size=11,width=28)
    else:
        for index, label in enumerate(labels[:4]):
            x = 55 + (index % 2) * 415; y = 70 + (index // 2) * 150; parts.append(f'<rect x="{x}" y="{y}" width="385" height="125" rx="10" fill="{soft}" stroke="{accent}"/><rect x="{x}" y="{y}" width="13" height="125" rx="6" fill="{accent}"/>'); label_at(parts,x+38,y+43,label,deep,anchor="start",size=13,width=36); label_at(parts,x+38,y+81,items[index][1],"#625A60",anchor="start",size=10,width=54)
    parts.append("</svg>"); return "".join(parts)


def signature_figure(kind: str, title: str, items: list[tuple[str, str]], profile: dict[str, Any], caption: str) -> str:
    return f'<figure class="signature-figure" data-visual-kind="{kind}">{signature_svg(kind, title, items, profile["accent"], profile["deep"], profile["soft"])}<figcaption>{clean_inline(caption)}</figcaption></figure>'


VISUAL_NAMES = {"stack": "value architecture", "orbit": "relationship constellation", "ladder": "proof progression", "journey": "dependency pathway", "matrix": "decision matrix", "network": "entity and evidence graph", "spectrum": "positioning spectrum", "radar": "qualitative contrast web", "funnel": "decision funnel", "wheel": "operating flywheel", "decision": "decision tree", "blueprint": "system blueprint"}
VISUAL_CAPTIONS = {"stack": "Read from foundation to promise: every upper layer becomes fragile when the evidence beneath it is weak.", "orbit": "The center is the organizing idea; surrounding nodes show the relationships that must reinforce it rather than compete with it.", "ladder": "Progress depends on earning the next level of confidence, not simply adding more claims or activity.", "journey": "The sequence exposes dependency: a break early in the path compounds across every downstream decision.", "matrix": "The quadrants force unlike issues onto shared decision criteria, making trade-offs and missing evidence more visible.", "network": "The graph highlights how clarity and trust emerge from connected signals, not from any isolated page or claim.", "spectrum": "The spectrum is a hypothesis about meaningful contrast; validate it with buyers before treating distinctiveness as established.", "radar": "This is a qualitative contrast map, not a measured score. It surfaces dimensions worth validating with consistent evidence.", "funnel": "The narrowing view shows where attention, proof, or readiness can be lost before the intended next decision.", "wheel": "The loop is useful only when each motion feeds the next; disconnected activity creates volume without compounding learning.", "decision": "Each branch represents a question that changes the appropriate response, proof, or next action.", "blueprint": "The blueprint separates foundations, reusable rules, and applications so production can scale without losing coherence."}


def visual_title(profile: dict[str, Any], kind: str) -> str:
    return f'{profile["name"]}: {VISUAL_NAMES.get(kind, "evidence map")}'


def render_table(rows: list[list[str]], competitor_logos: dict[str, str] | None = None) -> str:
    if not rows: return ""
    competitor_logos = competitor_logos or {}; head = "".join(f"<th>{clean_inline(cell)}</th>" for cell in rows[0]); body_parts = []
    for row in rows[1:]:
        cells = []
        for index, cell in enumerate(row):
            logo = next((data for name, data in competitor_logos.items() if index == 0 and name.lower() in cell.lower()), ""); image = f'<img class="table-logo" src="{logo}" alt=""/>' if logo else ""; cells.append(f"<td>{image}{clean_inline(cell)}</td>")
        body_parts.append("<tr>" + "".join(cells) + "</tr>")
    return f'<div class="table-wrap"><table><thead><tr>{head}</tr></thead><tbody>{"".join(body_parts)}</tbody></table></div>'


def render_block(block: dict[str, Any], section_title: str, competitor_logos: dict[str, str]) -> str:
    kind = block["type"]
    if kind == "table":
        rows = block["rows"]; headers = rows[0] if rows else []
        if any("impact" in h.lower() for h in headers) and any("effort" in h.lower() for h in headers) and 3 <= len(rows) <= 9: return f'<figure class="diagram">{priority_svg(rows[1:], headers)}<figcaption>Upper-left actions create the strongest near-term leverage; upper-right items warrant deliberate investment.</figcaption></figure>'
        if len(rows) == 3 and len(headers) <= 5:
            cards = "".join(f'<article><span>{clean_inline(row[0])}</span><h3>{clean_inline(row[1] if len(row)>1 else row[0])}</h3><p>{clean_inline(" · ".join(row[2:]))}</p></article>' for row in rows[1:]); return f'<figure class="comparison-figure"><div class="comparison-grid">{cards}</div><figcaption>The side-by-side view exposes the meaningful distinction between the two alternatives.</figcaption></figure>'
        numeric = [(row[0], number_value(" ".join(row[1:]))) for row in rows[1:] if row]; numeric = [(label, value) for label, value in numeric if value is not None]
        if 3 <= len(numeric) <= 7:
            labels, values = list(zip(*numeric)); time_series = all(re.search(r"\b(?:20\d{2}|Q[1-4]|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b", label, re.I) for label in labels); caption = chart_caption(list(labels), list(values), time_series); return f'<figure class="chart"><img src="{chart_image(section_title, list(labels), list(values), time_series)}" alt="Data comparison for {clean_inline(section_title)}"/><figcaption>{clean_inline(caption)}</figcaption></figure>'
        return f'<figure class="table-figure">{render_table(rows, competitor_logos)}<figcaption>The matrix makes shared criteria explicit, so differences can be judged without relying on narrative emphasis.</figcaption></figure>'
    if kind == "ordered":
        items = block["items"]
        if 3 <= len(items) <= 5:
            is_funnel = any(word in " ".join(items).lower() for word in ("awareness", "consideration", "conversion", "funnel", "stage", "retention")); visual = funnel_svg(items) if is_funnel else flow_svg(items); caption = "The funnel narrows attention toward conversion, making the highest-leakage stage the priority for diagnosis." if is_funnel else "The sequence shows where progress depends on the preceding step—and where a break compounds downstream."; return f'<figure class="diagram">{visual}<figcaption>{caption}</figcaption></figure>'
        return "<ol>" + "".join(f"<li>{clean_inline(item)}</li>" for item in items) + "</ol>"
    if kind == "bullets": return "<ul>" + "".join(f"<li>{clean_inline(item)}</li>" for item in block["items"]) + "</ul>"
    text = block.get("text", ""); numbers = re.findall(r"(?<![A-Za-z])(?:[$£€])?\d[\d,]*(?:\.\d+)?\s*%?", text); rendered = clean_inline(text)
    if kind == "paragraph" and len(numbers) == 1: rendered = rendered.replace(clean_inline(numbers[0]), f'<strong class="inline-metric">{clean_inline(numbers[0])}</strong>', 1)
    return f'<p class="{"quote" if kind == "quote" else "prose"}">{rendered}</p>'


def select_executive(modules: list[dict[str, Any]]) -> list[dict[str, str]]:
    candidates: list[tuple[int, str, str]] = []
    for module in modules:
        for section in module["sections"]:
            for block in section["blocks"]:
                if block["type"] == "table": continue
                text = concise(block_text(block), 285)
                if len(text) > 55: candidates.append((score_text(text) + score_text(section["title"]), module["label"], text))
    chosen: list[dict[str, str]] = []; seen: list[set[str]] = []
    for _, module, text in sorted(candidates, reverse=True):
        terms = keywords(text)
        if any(len(terms & prior) / max(1, min(len(terms), len(prior))) > .55 for prior in seen): continue
        chosen.append({"module": module, "text": clean_inline(text)}); seen.append(terms)
        if len(chosen) == 5: break
    return chosen


def connected_note(section: dict[str, Any], module: dict[str, Any], modules: list[dict[str, Any]]) -> str:
    terms = keywords(section["title"] + " " + " ".join(block_text(block) for block in section["blocks"])); best: tuple[int, str, str] | None = None
    for other in modules:
        if other["type"] == module["type"]: continue
        for candidate in other["sections"]:
            overlap = len(terms & keywords(candidate["title"] + " " + " ".join(block_text(block) for block in candidate["blocks"])))
            if overlap >= 3 and (best is None or overlap > best[0]): best = (overlap, other["label"], candidate["title"])
    return f'<aside class="connected"><strong>Connected finding</strong><span>This reinforces <b>{clean_inline(best[2])}</b> in {clean_inline(best[1])}; treat the two symptoms as one underlying issue.</span></aside>' if best else ""


def implications(section: dict[str, Any]) -> str:
    actions = [concise(block_text(block), 260) for block in section["blocks"] if block["type"] != "table" and ACTION_WORDS.search(block_text(block))]
    return f'<aside class="implications"><strong>Implications</strong><span>{clean_inline(actions[0])}</span></aside>' if actions else ""


def roadmap(modules: list[dict[str, Any]], report_model: dict[str, Any] | None = None) -> list[dict[str, str]]:
    model_recommendations = (report_model or {}).get("recommendations", [])
    if model_recommendations:
        return [{
            "horizon": "NOW" if index < 3 else "NEXT" if index < 6 else "LATER",
            "module": item.get("id", "ACTION"),
            "text": clean_inline(concise(item.get("detail", ""), 230)),
        } for index, item in enumerate(model_recommendations[:8])]
    candidates: list[tuple[int, str, str]] = []
    for module in modules:
        for section in module["sections"]:
            for block in section["blocks"]:
                values = [" · ".join(row) for row in block.get("rows", [])[1:]] if block["type"] == "table" else [block_text(block)]
                for value in values:
                    for sentence in re.split(r"(?<=[.!?])\s+|\s*;\s*", value):
                        if ACTION_WORDS.search(sentence) and 28 <= len(sentence) <= 360: candidates.append((score_text(sentence), module["label"], concise(sentence, 230)))
    chosen: list[dict[str, str]] = []; seen: list[set[str]] = []
    for score, module, text in sorted(candidates, reverse=True):
        terms = keywords(text)
        if any(len(terms & prior) >= 5 for prior in seen): continue
        horizon = "NOW" if score >= 18 or len(chosen) < 2 else "NEXT" if len(chosen) < 5 else "LATER"; chosen.append({"horizon": horizon, "module": module, "text": clean_inline(text)}); seen.append(terms)
        if len(chosen) == 8: break
    return chosen


def competitor_strip(competitors: list[dict[str, Any]]) -> str:
    if not competitors: return ""
    cards = []
    for competitor in competitors[:10]:
        name = clean_inline(competitor.get("companyName", "Competitor")); logo = competitor.get("logoDataUrl", ""); media = f'<img src="{logo}" alt="{name} official logo"/>' if logo else f'<span>{name[:1]}</span>'; attrs = " · ".join(competitor.get("competitiveAttributes", [])[:3]); cards.append(f'<article><div class="logo-media">{media}</div><strong>{name}</strong><p>{clean_inline(concise(competitor.get("positioning", ""), 125))}</p><small>{clean_inline(attrs)}</small></article>')
    return f'<figure class="competitor-strip"><div>{"".join(cards)}</div><figcaption>Official company assets are rendered at equal visual weight; positioning—not logo size—drives comparison.</figcaption></figure>'


CATEGORY_TEMPLATE = Template(r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>{{ title }}</title>
<style>
:root{--purple:#7C3AED;--deep:#4C1D95;--soft:#FAECF2;--ink:#1F1A1D;--slate:#625A60;--muted:#8D8288;--cream:#FFF9F5;--line:#E9DDD8;--green:#087F5B;--blue:#1769AA;--orange:#C2410C}
@page{size:Letter;margin:18mm 15mm 17mm;@top-left{content:element(reportHeader)}@bottom-left{content:"SMARK CONNECT · {{ profile.name|upper }}";font:700 7px Helvetica,Arial,sans-serif;color:#8D8288;letter-spacing:.07em}@bottom-right{content:"PAGE " counter(page) " / " counter(pages);font:7px Helvetica,Arial,sans-serif;color:#8D8288}}
*{box-sizing:border-box}html{font-family:Helvetica,"SF Pro Text",Arial,sans-serif;color:var(--ink);font-size:10.5px;line-height:1.55}body{margin:0;background:#fff}.running-header{position:running(reportHeader);width:100%;padding:0 0 7px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;color:var(--deep);font:700 7px Helvetica,Arial,sans-serif;letter-spacing:.09em}
.cover{min-height:225mm;padding:14mm 12mm;display:flex;flex-direction:column;justify-content:space-between;border-radius:18px;background:radial-gradient(circle at 88% 10%,var(--soft) 0,transparent 34%),radial-gradient(circle at 8% 90%,var(--soft) 0,transparent 36%),var(--cream);page-break-after:always}.kicker{color:var(--deep);font-size:8px;font-weight:800;letter-spacing:.15em}.cover h1{max-width:158mm;margin:14px 0;font-size:38px;line-height:1;letter-spacing:-.055em}.cover h1 span{color:var(--purple)}.cover-copy{max-width:150mm;margin:0;color:var(--slate);font-size:12.5px}.cover-visual{height:74mm;margin:10px 0 5px;overflow:hidden;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.78)}.cover-visual .signature-figure{margin:0;border:0;box-shadow:none;background:transparent}.cover-visual figcaption{display:none}.cover-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.cover-meta div{padding:13px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.76)}.cover-meta strong,.cover-meta span{display:block}.cover-meta strong{font-size:7px;color:var(--muted);text-transform:uppercase}.cover-meta span{margin-top:4px;font-size:11px;font-weight:700}
.contents{min-height:220mm;padding:12mm 5mm;page-break-after:always}.contents-head{display:grid;grid-template-columns:1fr 48mm;gap:18mm;align-items:end;margin-bottom:22mm}.contents h2{max-width:120mm;margin:8px 0 0;font-size:34px;line-height:1.02;letter-spacing:-.05em}.contents-head p{margin:0;padding:12px;border-top:4px solid var(--purple);color:var(--slate);font-size:10px}.contents-list{display:grid;gap:0}.contents-list article{min-height:18mm;padding:11px 0;display:grid;grid-template-columns:22mm 1fr 38mm;gap:10px;align-items:center;border-top:1px solid var(--line)}.contents-list b{color:var(--soft);font-size:28px;line-height:1}.contents-list strong{font-size:14px}.contents-list span{color:var(--deep);font-size:8px;font-weight:800;text-align:right;text-transform:uppercase;letter-spacing:.08em}
.decision-dashboard{min-height:220mm;padding:9mm 5mm;page-break-after:always}.decision-dashboard h2{max-width:155mm;margin:8px 0 8px;font-size:30px;line-height:1.04;letter-spacing:-.045em}.dashboard-intro{max-width:150mm;margin:0 0 18px;color:var(--slate);font-size:11.5px}.dashboard-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.dashboard-metrics article{min-height:34mm;padding:15px;border-top:5px solid var(--purple);background:var(--soft);break-inside:avoid}.dashboard-metrics strong,.dashboard-metrics span{display:block}.dashboard-metrics strong{color:var(--deep);font-size:28px;line-height:1}.dashboard-metrics span{margin-top:8px;color:var(--slate);font-size:8px}.dashboard-priorities{margin-top:18px;display:grid;gap:8px}.dashboard-priorities article{padding:11px 13px;display:grid;grid-template-columns:18mm 1fr 25mm;gap:10px;align-items:start;border:1px solid var(--line);border-left:5px solid var(--purple);border-radius:10px;break-inside:avoid}.dashboard-priorities b{color:var(--deep);font-size:9px}.dashboard-priorities p{margin:0;color:var(--slate)}.dashboard-priorities em{color:var(--purple);font-size:7px;font-style:normal;font-weight:900;text-align:right;text-transform:uppercase}.dashboard-visual-language{margin-top:15px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;border-radius:10px;color:#fff;background:var(--deep)}.dashboard-visual-language span{font-size:8px;font-weight:800;letter-spacing:.1em}.dashboard-visual-language strong{font-size:10px}
.executive{min-height:220mm;padding:8mm 4mm;page-break-after:always}.executive h2,.visual-atlas h2,.roadmap h2{margin:8px 0 6px;font-size:28px;letter-spacing:-.04em}.executive-intro,.visual-atlas>p,.roadmap-intro{max-width:150mm;margin:0 0 16px;color:var(--slate);font-size:11.5px}.company-context{margin:0 0 14px;padding:13px 15px;border:1px solid var(--line);border-left:4px solid var(--purple);border-radius:0 12px 12px 0;background:var(--soft);break-inside:avoid}.company-context>span{display:block;color:var(--deep);font-size:7px;font-weight:900;letter-spacing:.12em}.company-context p{margin:5px 0 0;color:var(--slate);font-size:10.5px;line-height:1.55}.skill-system{margin:0 0 14px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:#fff;break-inside:avoid}.skill-system>span{display:block;margin-bottom:8px;color:var(--deep);font-size:7px;font-weight:900;letter-spacing:.12em}.skill-system>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.skill-system article{min-width:0;padding:8px;border-radius:8px;background:var(--cream)}.skill-system strong,.skill-system small{display:block;overflow-wrap:anywhere}.skill-system strong{font-family:var(--font-family-primary);font-size:var(--font-size-skill-title);font-weight:var(--font-weight-skill-title);line-height:var(--line-height-skill);letter-spacing:var(--letter-spacing-skill)}.skill-system small{margin-top:3px;color:var(--slate);font-family:var(--font-family-primary);font-size:var(--font-size-skill-meta);line-height:var(--line-height-skill)}.executive-list{display:grid;gap:10px}.executive-item{display:grid;grid-template-columns:31px 1fr;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;break-inside:avoid}.executive-item>span{width:31px;height:31px;display:grid;place-items:center;border-radius:50%;background:var(--deep);color:#fff;font-weight:800}.executive-item small{display:block;color:var(--purple);font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.executive-item p{margin:3px 0;color:var(--slate)}
.module-opener{min-height:220mm;padding:20mm 9mm;display:flex;flex-direction:column;justify-content:center;page-break-before:always;page-break-after:always;background:linear-gradient(140deg,#fff 0 58%,var(--soft) 58%)}.module-number{font-size:70px;line-height:.9;color:var(--soft);font-weight:900;letter-spacing:-.07em}.module-opener h2{max-width:150mm;margin:15px 0 8px;font-size:34px;line-height:1.04;letter-spacing:-.05em}.module-frame{max-width:145mm;color:var(--slate);font-size:13px}.headline{max-width:150mm;margin-top:28px;padding:18px 20px;border-left:5px solid var(--purple);background:#fff;box-shadow:0 9px 32px rgba(31,26,29,.08)}.headline small{display:block;margin-bottom:6px;color:var(--purple);font-size:8px;font-weight:900;letter-spacing:.1em}.headline p{margin:0;font-size:15px;line-height:1.4;font-weight:700}
.visual-atlas{min-height:220mm;padding:5mm 4mm;page-break-after:always}.visual-grid{display:grid;gap:6px}.signature-figure{margin:0;padding:5px 8px;border:1px solid var(--line);border-radius:14px;background:#fff;box-shadow:0 7px 24px rgba(31,26,29,.05)}.signature-svg{width:100%;height:auto;max-height:47mm;display:block}.cover-visual .signature-svg{max-height:68mm}.signature-figure figcaption{margin:2px 2px 0}.module-content{page-break-after:always}.analysis-section{margin:0 0 15px;padding:16px 18px;border-top:1px solid var(--line);break-inside:avoid-page}.analysis-section.prominent{padding:21px 20px;background:var(--cream);border:0;border-radius:14px}.analysis-section h3{margin:4px 0 12px;font-size:19px;line-height:1.2;letter-spacing:-.025em}.analysis-section.prominent h3{font-size:24px}.section-kicker{color:var(--deep);font-size:7px;font-weight:900;letter-spacing:.12em}.prose{margin:0 0 11px;color:var(--slate);font-size:10.5px}.inline-metric{color:var(--deep);font-size:1.13em}.quote{padding:11px 13px;border-left:3px solid var(--purple);border-radius:0 10px 10px 0;background:var(--soft);font-style:italic}ul,ol{margin:8px 0 12px;padding-left:19px;color:var(--slate)}li{margin-bottom:5px}.implications,.connected{margin-top:13px;padding:12px 14px;display:grid;grid-template-columns:92px 1fr;gap:10px;border-radius:10px;break-inside:avoid}.implications{background:#E9F8F2;border-left:4px solid var(--green)}.connected{background:#EDF5FF;border-left:4px solid var(--blue)}.implications strong,.connected strong{font-size:8px;text-transform:uppercase;letter-spacing:.07em}.implications span,.connected span{color:var(--slate)}
figure{margin:12px 0;break-inside:avoid}figcaption{margin-top:6px;color:var(--muted);font-size:7.5px;font-style:italic}.chart img,.flow-svg,.funnel-svg,.priority-svg{width:100%;height:auto;display:block}.comparison-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.comparison-grid article{padding:13px;border:1px solid var(--line);border-radius:10px;background:#fff}.comparison-grid span{color:var(--deep);font-size:8px;font-weight:800;text-transform:uppercase}.comparison-grid h3{margin:4px 0;font-size:13px}.comparison-grid p{margin:0;color:var(--slate)}.table-wrap{overflow:hidden;border:1px solid var(--line);border-radius:10px}table{width:100%;border-collapse:collapse;font-size:8.1px}thead{display:table-header-group}tr{break-inside:avoid}th{padding:8px;background:var(--deep);color:#fff;text-align:left}td{padding:7px;border-top:1px solid var(--line);vertical-align:top;color:var(--slate)}tr:nth-child(even) td{background:#FCF8FA}.table-logo{width:25px;height:25px;margin-right:7px;object-fit:contain;vertical-align:middle}
.competitor-strip>div{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.competitor-strip article{min-height:130px;padding:11px;border:1px solid var(--line);border-radius:10px;background:#fff}.logo-media{width:44px;height:44px;display:grid;place-items:center;margin-bottom:7px;border:1px solid var(--line);border-radius:9px;color:var(--deep);font-size:18px;font-weight:900}.logo-media img{width:36px;height:36px;object-fit:contain}.competitor-strip strong{display:block}.competitor-strip p{margin:4px 0;color:var(--slate);font-size:8px}.competitor-strip small{color:var(--orange);font-size:7px}.roadmap{min-height:220mm;padding:10mm 4mm;page-break-before:always}.roadmap-list{display:grid;gap:9px}.roadmap-item{display:grid;grid-template-columns:60px 1fr;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:11px;break-inside:avoid}.roadmap-item>strong{color:var(--deep);font-size:9px}.roadmap-item small{display:block;color:var(--purple);font-size:7px;font-weight:900;text-transform:uppercase}.roadmap-item p{margin:3px 0;color:var(--slate)}
body.report-diagnostic .cover{border-radius:0;background:linear-gradient(rgba(3,105,161,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(3,105,161,.055) 1px,transparent 1px),#F7FCFF;background-size:12mm 12mm}body.report-diagnostic .module-opener{color:#fff;background:linear-gradient(145deg,var(--deep),#082F49)}body.report-diagnostic .module-opener .module-number{color:rgba(255,255,255,.12)}body.report-diagnostic .module-opener .kicker,body.report-diagnostic .module-opener .module-frame{color:#BAE6FD}body.report-diagnostic .analysis-section{border-top-color:var(--purple)}
body.report-atlas .cover{background:linear-gradient(155deg,#fff 0 56%,var(--soft) 56%)}body.report-atlas .cover-visual{border-radius:2px;box-shadow:9px 9px 0 var(--deep)}body.report-atlas .module-opener{background:linear-gradient(155deg,var(--soft) 0 42%,#fff 42%)}body.report-atlas .decision-dashboard{background:linear-gradient(90deg,transparent 0 67%,var(--soft) 67%)}
body.report-field-guide .cover{border-radius:32px;background:radial-gradient(circle at 80% 22%,var(--soft) 0 22%,transparent 22%),#FFF9FC}body.report-field-guide .executive-item{border-radius:24px}body.report-field-guide .module-opener{background:radial-gradient(circle at 82% 50%,var(--soft) 0 28%,transparent 28%),#fff}body.report-field-guide .dashboard-metrics article{border-radius:30px}
body.report-map .cover{background:radial-gradient(circle at 50% 42%,#fff 0 18%,transparent 18%),radial-gradient(circle at 50% 42%,transparent 0 34%,rgba(15,118,110,.12) 34% 35%,transparent 35%),var(--soft)}body.report-map .visual-atlas{background:linear-gradient(180deg,#fff,var(--soft))}
body.report-playbook .cover{border-radius:4px;background:linear-gradient(125deg,var(--deep) 0 33%,var(--soft) 33% 36%,#fff 36%)}body.report-playbook .cover h1,body.report-playbook .cover-copy,body.report-playbook .cover .kicker{max-width:112mm;margin-left:56mm}body.report-playbook .roadmap-item{border-left:5px solid var(--purple)}body.report-playbook .decision-dashboard{border-left:8mm solid var(--deep)}
body.report-portfolio .cover{background:linear-gradient(180deg,#fff 0 50%,var(--soft) 50%)}body.report-portfolio .visual-grid{grid-template-columns:repeat(2,1fr)}body.report-portfolio .visual-grid .signature-figure:first-child{grid-column:1/-1}
body.report-dossier .cover{background:linear-gradient(90deg,var(--soft) 0 14%,#fff 14%)}body.report-dossier .module-opener{border-left:18mm solid var(--deep)}
body.report-studio .analysis-section.prominent{background:linear-gradient(135deg,#fff,var(--soft))}body.report-studio .cover-visual{border:3px solid var(--deep);box-shadow:12px 12px 0 var(--soft)}body.report-editorial .section-kicker,body.report-product-book .section-kicker{text-transform:uppercase}.qa-compact .analysis-section{padding:13px}.qa-compact html{font-size:10px}
@media print{.executive-item,.analysis-section,.comparison-grid article,.chart,.diagram,.signature-figure,.table-wrap,tr,.competitor-strip article,.roadmap-item,.implications,.connected{break-inside:avoid;page-break-inside:avoid}h1,h2,h3{break-after:avoid;page-break-after:avoid}thead{display:table-header-group}}
</style></head>
<body class="report-{{ profile.layout }} {{ body_class }}" style="--purple:{{ profile.accent }};--deep:{{ profile.deep }};--soft:{{ profile.soft }};--blush:{{ profile.soft }};--font-family-primary:Helvetica,Arial,sans-serif;--font-size-skill-title:8px;--font-size-skill-description:7px;--font-size-skill-meta:6.5px;--font-weight-skill-title:800;--font-weight-skill-description:500;--line-height-skill:1.4;--letter-spacing-skill:0">
<div class="running-header"><span>THE SMARKETERS / SMARK CONNECT</span><span>{{ company }}</span></div>
<section class="cover"><div><div class="kicker">{{ profile.kicker }}</div><h1>{{ title_prefix }}<span>{{ title_accent }}</span></h1><p class="cover-copy">{{ profile.cover }}</p></div><div class="cover-visual">{{ cover_visual|safe }}</div><div class="cover-meta"><div><strong>Company</strong><span>{{ company }}</span></div><div><strong>Document form</strong><span>{{ profile.name }}</span></div><div><strong>Evidence</strong><span>{{ source_count }} sources · {{ updated }}</span></div></div></section>
<section class="contents"><div class="contents-head"><div><div class="kicker">REPORT MAP</div><h2>Every page has one analytical purpose.</h2></div><p>This report uses a {{ profile.name|lower }} visual language. Detail lives here; leadership compression lives in the companion presentation.</p></div><div class="contents-list"><article><b>01</b><strong>Executive readout</strong><span>Decide</span></article><article><b>02</b><strong>Decision dashboard</strong><span>Prioritize</span></article>{% for module in modules %}<article><b>{{ '%02d'|format(loop.index + 2) }}</b><strong>{{ module.label }}</strong><span>{{ module.visual_label }}</span></article>{% endfor %}<article><b>{{ '%02d'|format(modules|length + 3) }}</b><strong>Sequenced roadmap</strong><span>Act</span></article></div></section>
<section class="decision-dashboard"><div class="kicker">DECISION DASHBOARD</div><h2>The evidence, priorities, and visual system in one view.</h2><p class="dashboard-intro">Use this page to orient the discussion before entering the detailed analytical chapters.</p><div class="dashboard-metrics">{% for metric in dashboard_metrics %}<article><strong>{{ metric.value }}</strong><span>{{ metric.label }}</span></article>{% endfor %}</div><div class="dashboard-priorities">{% for item in dashboard_priorities %}<article><b>{{ item.id }}</b><p>{{ item.detail }}</p><em>{{ item.priority }}</em></article>{% endfor %}</div><div class="dashboard-visual-language"><span>SUBJECT-SPECIFIC VISUAL LANGUAGE</span><strong>{{ visual_language }}</strong></div></section>
<section class="executive"><div class="kicker">EXECUTIVE READOUT</div><h2>{{ profile.executive }}</h2><p class="executive-intro">{{ profile.executive_copy }}</p><aside class="company-context"><span>COMPANY CONTEXT</span><p>{{ company_brief }}</p></aside>{% if skills %}<aside class="skill-system"><span>SKILLS APPLIED TO THIS REPORT</span><div>{% for item in skills %}<article><strong>{{ item.skill }}</strong><small>{{ item.phase }}{% if item.reason %} · {{ item.reason }}{% endif %}</small></article>{% endfor %}</div></aside>{% endif %}<div class="executive-list">{% for item in executive %}<article class="executive-item"><span>{{ loop.index }}</span><div><small>{{ item.module }}</small><p>{{ item.text|safe }}</p></div></article>{% endfor %}</div></section>
{% for module in modules %}<section class="module-opener"><div class="module-number">{{ '%02d'|format(loop.index) }}</div><div class="kicker">{{ module.label|upper }}</div><h2>{{ module.label }}</h2><p class="module-frame">{{ module.framing }}</p><div class="headline"><small>HEADLINE FINDING</small><p>{{ module.headline }}</p></div></section>
<section class="visual-atlas"><div class="kicker">VISUAL THESIS · {{ module.label|upper }}</div><h2>{{ module.visual_title }}</h2><p>{{ module.visual_intro }}</p><div class="visual-grid">{% for visual in module.signature_visuals %}{{ visual|safe }}{% endfor %}</div></section>
<main class="module-content">{{ module.logo_strip|safe }}{% for section in module.rendered_sections %}<section class="analysis-section {{ 'prominent' if section.prominent else '' }}"><div class="section-kicker">{{ '%02d'|format(loop.index) }} · {{ 'DECISION PRIORITY' if section.prominent else 'SUPPORTING EVIDENCE' }}</div><h3>{{ section.title }}</h3>{{ section.html|safe }}{{ section.connected|safe }}{{ section.implications|safe }}</section>{% endfor %}</main>{% endfor %}
<section class="roadmap"><div class="kicker">DECISION SEQUENCE</div><h2>{{ profile.roadmap }}</h2><p class="roadmap-intro">{{ profile.roadmap_copy }}</p><div class="roadmap-list">{% for item in roadmap %}<article class="roadmap-item"><strong>{{ item.horizon }}</strong><div><small>{{ item.module }}</small><p>{{ item.text|safe }}</p></div></article>{% endfor %}</div></section>
</body></html>''')


def build_modules(payload: dict[str, Any]) -> list[dict[str, Any]]:
    source_modules = payload.get("modules") or [{"type": payload.get("documentType", "DOCUMENT"), "title": payload["title"], "markdown": payload["markdown"], "competitors": []}]; modules = []
    for item in source_modules:
        module_type = item.get("type", "DOCUMENT"); label, framing = MODULE_META.get(module_type, (normalize_acronyms(item.get("title", "Analysis")), "The most decision-relevant evidence in this module.")); sections = parse_sections(item.get("markdown", ""))
        appendix_index = next((index for index, section in enumerate(sections) if re.search(r"\b(coverage scorecard|complete page inventory|research appendix|evidence appendix|source register)\b", section["title"], re.I)), None)
        if appendix_index is not None: sections = sections[:appendix_index]
        sections = [section for section in sections if not re.fullmatch(r"(?:last updated|updated|date)", section["title"].strip(), re.I)]
        sections = [section for section in sections if len(re.sub(r"\s+", " ", " ".join(block_text(block) for block in section["blocks"])).strip()) >= 24]
        modules.append({"type": module_type, "label": label, "framing": framing, "sections": sections, "headline": clean_inline(headline_for(sections, module_type)), "competitors": item.get("competitors", [])})
    return modules


def build_html(payload: dict[str, Any], compact: bool = False) -> str:
    modules = build_modules(payload)
    report_type = "STRATEGIC_INTELLIGENCE" if len(modules) > 1 else payload.get("documentType") or (modules[0]["type"] if modules else "DOCUMENT")
    profile = REPORT_PROFILES.get(report_type, REPORT_PROFILES["DOCUMENT"])
    for module in modules:
        module_profile = REPORT_PROFILES.get(module["type"], profile)
        scored = [(score_text(section["title"] + " " + " ".join(block_text(block) for block in section["blocks"])), index) for index, section in enumerate(module["sections"])]; prominent_indexes = {index for _, index in sorted(scored, reverse=True)[:2]}; competitor_logos = {item.get("companyName", ""): item.get("logoDataUrl", "") for item in module["competitors"] if item.get("logoDataUrl")}; rendered = []; seen_sections: list[set[str]] = []
        for index, section in enumerate(module["sections"]):
            terms = keywords(section["title"] + " " + " ".join(block_text(block) for block in section["blocks"]))
            if len(terms) > 4 and any(len(terms & prior) / max(1, min(len(terms), len(prior))) > .72 for prior in seen_sections): continue
            seen_sections.append(terms); rendered.append({"title": clean_inline(section["title"]), "prominent": index in prominent_indexes, "html": "".join(render_block(block, section["title"], competitor_logos) for block in section["blocks"]), "connected": connected_note(section, module, modules) if index in prominent_indexes else "", "implications": implications(section), "source": section, "score": score_text(section["title"] + " " + " ".join(block_text(block) for block in section["blocks"]))})
        visual_target = math.ceil(len(rendered) * .30); visualized = {index for index, item in enumerate(rendered) if "<figure" in item["html"]}
        for visual_index, section_index in enumerate(sorted(range(len(rendered)), key=lambda value: rendered[value]["score"], reverse=True)):
            if len(visualized) >= visual_target: break
            if section_index in visualized: continue
            item = rendered[section_index]; kind = module_profile["visuals"][visual_index % len(module_profile["visuals"])]
            item["html"] += signature_figure(kind, visual_title(module_profile, kind), visual_items(item["source"], module), module_profile, VISUAL_CAPTIONS[kind]); visualized.add(section_index)
        for item in rendered: item.pop("source", None); item.pop("score", None)
        module["rendered_sections"] = rendered; module["logo_strip"] = competitor_strip(module["competitors"])
        module["visual_title"] = f'{module_profile["name"]}: three ways to see the decision system'
        module["visual_label"] = " · ".join(VISUAL_NAMES.get(kind, kind) for kind in module_profile["visuals"][:2])
        module["visual_intro"] = "These diagrams are qualitative views derived from the supplied evidence. They expose relationships, dependencies, and validation questions without inventing measurements."
        overview_items = visual_items(None, module)
        module["signature_visuals"] = [signature_figure(kind, visual_title(module_profile, kind), overview_items[index:] + overview_items[:index], module_profile, VISUAL_CAPTIONS[kind]) for index, kind in enumerate(module_profile["visuals"])]
    title_words = normalize_acronyms(payload["title"]).split(); split = max(1, len(title_words) - 2); updated = payload.get("updatedAt", "")
    try: updated = datetime.fromisoformat(updated.replace("Z", "+00:00")).strftime("%b %d, %Y")
    except ValueError: pass
    cover_visual = modules[0]["signature_visuals"][0] if modules else ""
    def skill_name(value: str) -> str:
        acronyms = {"abm", "ai", "api", "b2b", "b2c", "geo", "html", "icp", "kpi", "pdf", "roi", "seo", "ugc", "url", "xlsx"}; special = {"kpis": "KPIs"}
        return " ".join(special.get(word.lower(), word.upper() if word.lower() in acronyms else word.capitalize()) for word in re.split(r"[\s_/-]+", value.strip()) if word)
    skills = [{"skill": skill_name(clean_inline(item.get("skill", "Skill"))), "phase": clean_inline(item.get("phase") or item.get("repository", "Method")), "reason": clean_inline(concise(item.get("reason", ""), 110))} for item in payload.get("skills", [])[:8] if isinstance(item, dict)]
    report_model = payload.get("reportModel") if isinstance(payload.get("reportModel"), dict) else {}
    raw_metrics = report_model.get("metrics", []) if isinstance(report_model, dict) else []
    dashboard_metrics = [{"value": clean_inline(str(item.get("value", "—"))), "label": clean_inline(concise(item.get("context") or item.get("label", "Reported measure"), 74))} for item in raw_metrics[:3] if isinstance(item, dict)]
    if len(dashboard_metrics) < 3:
        dashboard_metrics = [
            {"value": str(len(report_model.get("findings", []))), "label": "Analytical findings organized for decision-making"},
            {"value": str(len(report_model.get("recommendations", []))), "label": "Traceable recommendations in the operating sequence"},
            {"value": str(max(payload.get("sourceCount", 0), len(report_model.get("sources", [])))), "label": "Evidence sources recorded in the report model"},
        ]
    raw_priorities = report_model.get("recommendations", []) if isinstance(report_model, dict) else []
    dashboard_priorities = [{"id": clean_inline(item.get("id", f"REC-{index + 1:03d}")), "detail": clean_inline(concise(item.get("detail") or item.get("title", "Validate the next decision."), 180)), "priority": clean_inline(item.get("priority", "validate"))} for index, item in enumerate(raw_priorities[:5]) if isinstance(item, dict)]
    if not dashboard_priorities:
        dashboard_priorities = [{"id": f"REC-{index + 1:03d}", "detail": item["text"], "priority": item["horizon"]} for index, item in enumerate(roadmap(modules, report_model)[:5])]
    visual_language = " · ".join(VISUAL_NAMES.get(kind, kind).upper() for kind in profile["visuals"])
    return CATEGORY_TEMPLATE.render(title=normalize_acronyms(payload["title"]), title_prefix=" ".join(title_words[:split]) + " ", title_accent=" ".join(title_words[split:]), company=payload["companyName"], company_brief=clean_inline(payload.get("companyBrief") or "Company information was not available for this section."), skills=skills, updated=updated, source_count=payload.get("sourceCount", 0), executive=select_executive(modules), modules=modules, roadmap=roadmap(modules, report_model), profile=profile, cover_visual=cover_visual, dashboard_metrics=dashboard_metrics, dashboard_priorities=dashboard_priorities, visual_language=visual_language, body_class="qa-compact" if compact else "")


def html_visual_metrics(rendered_html: str, payload: dict[str, Any]) -> dict[str, Any]:
    sections = re.findall(r'<section class="analysis-section[^>]*>(.*?)</section>', rendered_html, re.S)
    visualized_sections = sum(1 for section in sections if "<figure" in section)
    report_type = "STRATEGIC_INTELLIGENCE" if payload.get("modules") and len(payload["modules"]) > 1 else payload.get("documentType", "DOCUMENT")
    profile = REPORT_PROFILES.get(report_type, REPORT_PROFILES["DOCUMENT"])
    return {"visualizationCount": rendered_html.count("<figure"), "visualSectionShare": round(100 * visualized_sections / max(1, len(sections))), "reportProfile": profile["name"]}


def inspect_pdf(path: Path, section_titles: list[str]) -> dict[str, Any]:
    reader = PdfReader(str(path)); issues: list[str] = []; pages = []
    for index, page in enumerate(reader.pages):
        width = float(page.mediabox.width); height = float(page.mediabox.height); text = (page.extract_text() or "").strip(); pages.append({"page": index + 1, "width": round(width, 1), "height": round(height, 1), "characters": len(text)})
        if width < 600 or height < 780: issues.append(f"page {index + 1} has unexpected dimensions")
        if index > 0 and len(text) < 85: issues.append(f"page {index + 1} may be nearly empty")
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        for heading in section_titles:
            matches = [line_index for line_index, line in enumerate(lines) if line.lower() == heading.lower()]
            if matches and len(" ".join(lines[matches[-1] + 1:])) < 38: issues.append(f"page {index + 1} may end with an orphaned heading: {heading[:50]}")
    return {"pageCount": len(reader.pages), "pages": pages, "issues": sorted(set(issues))}


def main() -> None:
    payload = json.load(sys.stdin)
    if payload.get("inspectPdf"):
        qa = inspect_pdf(Path(payload["inspectPdf"]), payload.get("sectionTitles", [])); qa.update(payload.get("visualMetrics", {})); print(json.dumps({"qa": qa})); return
    output_pdf = Path(payload["outputPdf"]); output_html = Path(payload["outputHtml"]); output_pdf.parent.mkdir(parents=True, exist_ok=True); output_html.parent.mkdir(parents=True, exist_ok=True); modules = build_modules(payload); titles = [section["title"] for module in modules for section in module["sections"]] + [module["label"] for module in modules]
    if payload.get("htmlOnly") or HTML is None:
        rendered_html = build_html(payload, compact=bool(payload.get("compact"))); metrics = html_visual_metrics(rendered_html, payload); output_html.write_text(rendered_html, encoding="utf-8"); print(json.dumps({"pdf": "", "html": str(output_html), "renderer": "chromium-fallback", "weasyprintError": WEASYPRINT_ERROR, "sectionTitles": titles, "visualMetrics": metrics})); return
    first_html = build_html(payload, compact=False); first_pdf = output_pdf.with_name(output_pdf.stem + "-pass-1.pdf"); HTML(string=first_html, base_url=str(output_html.parent)).write_pdf(str(first_pdf)); first_qa = inspect_pdf(first_pdf, titles); final_html = build_html(payload, compact=bool(first_qa["issues"])); output_html.write_text(final_html, encoding="utf-8"); HTML(string=final_html, base_url=str(output_html.parent)).write_pdf(str(output_pdf)); final_qa = inspect_pdf(output_pdf, titles)
    final_qa.update(html_visual_metrics(final_html, payload))
    if final_qa["visualSectionShare"] < 30: final_qa["issues"].append("visual section share fell below the required 30 percent")
    if not output_pdf.read_bytes().startswith(b"%PDF") or final_qa["pageCount"] < 1: raise RuntimeError("The final PDF failed signature or page-count validation.")
    first_pdf.unlink(missing_ok=True); print(json.dumps({"pdf": str(output_pdf), "html": str(output_html), "qa": {"passes": 2, "first": first_qa, "final": final_qa}}))


if __name__ == "__main__": main()
