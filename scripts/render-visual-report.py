from __future__ import annotations

import base64
import html
import io
import json
import re
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


from __future__ import annotations

import base64
import html
import io
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from jinja2 import Template
from pypdf import PdfReader

try:
    from weasyprint import HTML
    WEASYPRINT_ERROR = ""
except Exception as error:
    HTML = None
    WEASYPRINT_ERROR = str(error)

ACRONYMS = ("SEO", "GEO", "ICP", "PESTEL", "SWOT", "ROI", "KPI", "CTR", "CTA", "AI", "API", "URL", "B2B", "B2C", "GSC", "LLM")

def normalize_acronyms(value: str) -> str:
    value = re.sub(r"[\ud800-\udfff]", "?", value)
    parts = re.split(r"(https?://[^\s)\]>]+)", value, flags=re.I)
    for index in range(0, len(parts), 2):
        for acronym in ACRONYMS:
            parts[index] = re.sub(rf"\b{acronym}\b", acronym, parts[index], flags=re.I)
    return "".join(parts)


def unwrap_structured(value: Any) -> str:
    if not isinstance(value, str):
        if isinstance(value, dict):
            for key in ("contentMarkdown", "content", "text", "summary"):
                if isinstance(value.get(key), str):
                    return unwrap_structured(value[key])
        return ""
    candidate = value.strip().removeprefix("```json").removeprefix("```markdown").removeprefix("```md").removesuffix("```").strip()
    for _ in range(3):
        extracted = None
        for option in (candidate, candidate[candidate.find("{"):] if "{" in candidate else ""):
            if not option:
                continue
            try:
                parsed = json.loads(option)
                if isinstance(parsed, dict):
                    extracted = next((parsed.get(key) for key in ("contentMarkdown", "content", "text", "summary") if isinstance(parsed.get(key), str)), None)
            except Exception:
                pass
            if extracted:
                break
        if not extracted or extracted == candidate:
            break
        candidate = extracted.strip()
    return normalize_acronyms(candidate.replace("\\n", "\n").replace("\\t", "\t"))


def clean_inline(value: str) -> str:
    value = unwrap_structured(value)
    for _ in range(2):
        try:
            repaired = value.encode("cp1252").decode("utf-8")
            if repaired == value:
                break
            value = repaired
        except (UnicodeEncodeError, UnicodeDecodeError):
            break
    for broken, repaired in {"â€”": "—", "â€“": "–", "â€™": "’", "â€œ": "“", "â€ ": "”", "Â®": "®", "Â": ""}.items():
        value = value.replace(broken, repaired)
    value = re.sub(r"(?:â[^\w\s]{1,4})+", " · ", value)
    value = re.sub(r"!\[([^]]*)\]\([^)]*\)", r"\1", value)
    value = re.sub(r"\[([^]]+)\]\((https?://[^)]+)\)", r'<a href="\2">\1</a>', value)
    value = re.sub(r"[\u2500-\u259f\ufffd]+", " · ", value)
    value = re.sub(r"(?:\s*·\s*){2,}", " · ", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"`([^`]+)`", r"<code>\1</code>", value)
    return value.strip()


def parse_markdown_blocks(markdown: str) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    lines = markdown.splitlines()
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue

        if line.startswith("#"):
            level = len(line.split()[0])
            text = line.lstrip("#").strip()
            blocks.append({"type": f"h{min(level, 4)}", "text": text})
            index += 1
            continue

        if "|" in line and index + 1 < len(lines) and re.match(r"^\s*\|?[-:\s|]+\|?\s*$", lines[index + 1]):
            table_lines = []
            while index < len(lines) and "|" in lines[index]:
                table_lines.append(lines[index])
                index += 1
            rows = []
            for t_line in table_lines:
                if re.match(r"^\s*\|?[-:\s|]+\|?\s*$", t_line):
                    continue
                cells = [cell.strip() for cell in t_line.split("|")]
                if cells and not cells[0]:
                    cells = cells[1:]
                if cells and not cells[-1]:
                    cells = cells[:-1]
                if cells:
                    rows.append(cells)
            if rows:
                blocks.append({"type": "table", "rows": rows})
            continue

        if line.startswith(("- ", "* ", "• ")):
            items = []
            while index < len(lines) and lines[index].strip().startswith(("- ", "* ", "• ")):
                items.append(re.sub(r"^[-*•]\s+", "", lines[index].strip()))
                index += 1
            blocks.append({"type": "bullets", "items": items})
            continue

        if re.match(r"^\d+\.\s+", line):
            items = []
            while index < len(lines) and re.match(r"^\d+\.\s+", lines[index].strip()):
                items.append(re.sub(r"^\d+\.\s+", "", lines[index].strip()))
                index += 1
            blocks.append({"type": "numbered", "items": items})
            continue

        if line.startswith(">"):
            quote_lines = []
            while index < len(lines) and lines[index].strip().startswith(">"):
                quote_lines.append(lines[index].strip().lstrip(">").strip())
                index += 1
            blocks.append({"type": "quote", "text": " ".join(quote_lines)})
            continue

        p_lines = [line]
        index += 1
        while index < len(lines) and lines[index].strip() and not lines[index].strip().startswith(("#", "-", "*", "•", ">", "|")) and not re.match(r"^\d+\.\s+", lines[index].strip()):
            p_lines.append(lines[index].strip())
            index += 1
        blocks.append({"type": "paragraph", "text": " ".join(p_lines)})

    return blocks


def render_blocks_to_html(blocks: list[dict[str, Any]], competitor_logos: dict[str, str] | None = None) -> str:
    competitor_logos = competitor_logos or {}
    html_parts: list[str] = []
    for block in blocks:
        b_type = block["type"]
        if b_type.startswith("h"):
            level = b_type
            html_parts.append(f"<{level}>{clean_inline(block['text'])}</{level}>")
        elif b_type == "paragraph":
            html_parts.append(f"<p>{clean_inline(block['text'])}</p>")
        elif b_type == "quote":
            html_parts.append(f'<blockquote class="callout"><p>{clean_inline(block["text"])}</p></blockquote>')
        elif b_type == "bullets":
            items = "".join(f"<li>{clean_inline(item)}</li>" for item in block["items"])
            html_parts.append(f"<ul>{items}</ul>")
        elif b_type == "numbered":
            items = "".join(f"<li>{clean_inline(item)}</li>" for item in block["items"])
            html_parts.append(f"<ol>{items}</ol>")
        elif b_type == "table":
            rows = block["rows"]
            if not rows:
                continue
            head = "".join(f"<th>{clean_inline(cell)}</th>" for cell in rows[0])
            body_rows = []
            for row in rows[1:]:
                cells = []
                for idx, cell in enumerate(row):
                    logo = next((data for name, data in competitor_logos.items() if idx == 0 and name.lower() in cell.lower()), "")
                    img = f'<img class="table-logo" src="{logo}" alt=""/> ' if logo else ""
                    cells.append(f"<td>{img}{clean_inline(cell)}</td>")
                body_rows.append(f"<tr>{''.join(cells)}</tr>")
            html_parts.append(f'<div class="table-wrap"><table><thead><tr>{head}</tr></thead><tbody>{"".join(body_rows)}</tbody></table></div>')

    return "\n".join(html_parts)


def render_competitor_cards(competitors: list[dict[str, Any]]) -> str:
    if not competitors:
        return ""
    cards = []
    for competitor in competitors[:8]:
        name = clean_inline(competitor.get("companyName", "Competitor"))
        logo = competitor.get("logoDataUrl") or competitor.get("logoUrl", "")
        media = f'<img src="{logo}" alt="{name} logo" class="comp-card-logo" />' if logo else f'<span class="comp-card-letter">{name[:1].upper()}</span>'
        website = competitor.get("officialWebsite", "")
        site_link = f'<a href="{website}" class="comp-site-link" target="_blank">{clean_inline(website.replace("https://", "").replace("http://", "").rstrip("/"))}</a>' if website else ""
        attrs = "".join(f'<span class="comp-attr-tag">{clean_inline(attr)}</span>' for attr in competitor.get("competitiveAttributes", [])[:4])
        positioning = clean_inline(competitor.get("positioning") or competitor.get("evidence") or "")
        cards.append(f'''
        <article class="competitor-card">
            <div class="comp-card-top">
                <div class="comp-logo-box">{media}</div>
                <div>
                    <h4>{name}</h4>
                    {site_link}
                </div>
            </div>
            {f'<p class="comp-positioning">{positioning}</p>' if positioning else ''}
            {f'<div class="comp-tags">{attrs}</div>' if attrs else ''}
        </article>
        ''')

    return f'''
    <section class="competitors-section">
        <h3>Verified Competitor Intelligence</h3>
        <p class="section-sub">Direct alternatives and category competitors analyzed from public market evidence.</p>
        <div class="competitor-grid">
            {"".join(cards)}
        </div>
    </section>
    '''


REPORT_TEMPLATE = Template(r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{{ title }}</title>
<style>
:root {
    --purple: #7C3AED;
    --deep: #4C1D95;
    --soft: #FAECF2;
    --ink: #1F1A1D;
    --slate: #4B5563;
    --cream: #FFFDFB;
    --line: #E5E7EB;
    --surface: #F9FAFB;
}
@page {
    size: Letter;
    margin: 18mm 16mm 18mm;
    @top-left {
        content: "THE SMARKETERS · SMARK CONNECT";
        font: 700 7px Helvetica, Arial, sans-serif;
        color: #6B7280;
        letter-spacing: 0.08em;
    }
    @top-right {
        content: "{{ company|upper }} · {{ title|upper }}";
        font: 700 7px Helvetica, Arial, sans-serif;
        color: #6B7280;
        letter-spacing: 0.06em;
    }
    @bottom-left {
        content: "CONFIDENTIAL DECISION ARTIFACT";
        font: 7px Helvetica, Arial, sans-serif;
        color: #9CA3AF;
        letter-spacing: 0.06em;
    }
    @bottom-right {
        content: "PAGE " counter(page) " / " counter(pages);
        font: 700 7px Helvetica, Arial, sans-serif;
        color: #6B7280;
    }
}
* { box-sizing: border-box; }
body {
    margin: 0;
    font-family: Helvetica, "SF Pro Text", -apple-system, Arial, sans-serif;
    color: var(--ink);
    font-size: 10.5px;
    line-height: 1.6;
    background: #fff;
}

.cover-page {
    min-height: 225mm;
    padding: 16mm 12mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: radial-gradient(circle at 90% 10%, #F5F3FF 0%, transparent 40%), var(--cream);
    border: 1px solid var(--line);
    border-radius: 12px;
    page-break-after: always;
}
.cover-top { display: flex; flex-direction: column; }
.cover-kicker {
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.14em;
    color: var(--purple);
    text-transform: uppercase;
}
.cover-title {
    font-size: 36px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.04em;
    margin: 16px 0 12px;
    color: var(--deep);
}
.cover-subtitle {
    font-size: 13px;
    color: var(--slate);
    max-width: 140mm;
    line-height: 1.5;
    margin: 0;
}
.cover-brief {
    margin-top: 18px;
    padding: 14px 16px;
    background: #fff;
    border: 1px solid var(--line);
    border-left: 4px solid var(--purple);
    border-radius: 8px;
}
.cover-brief strong {
    display: block;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--deep);
    text-transform: uppercase;
    margin-bottom: 4px;
}
.cover-brief p {
    margin: 0;
    font-size: 10px;
    color: var(--slate);
}
.cover-meta-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 20mm;
}
.cover-meta-item {
    padding: 12px 14px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 8px;
}
.cover-meta-item span {
    display: block;
    font-size: 7.5px;
    font-weight: 800;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}
.cover-meta-item strong {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    color: var(--ink);
}

.report-body {
    padding: 2mm 0;
}
h1 {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--deep);
    margin: 20px 0 10px;
    page-break-after: avoid;
}
h2 {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--deep);
    margin: 18px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--line);
    page-break-after: avoid;
}
h3 {
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
    margin: 14px 0 6px;
    page-break-after: avoid;
}
h4 {
    font-size: 11px;
    font-weight: 700;
    margin: 8px 0 4px;
    page-break-after: avoid;
}
p {
    margin: 0 0 10px;
    color: var(--ink);
}
code {
    font-family: Menlo, Monaco, Consolas, monospace;
    font-size: 9px;
    background: var(--surface);
    padding: 1px 4px;
    border-radius: 4px;
    border: 1px solid var(--line);
}
ul, ol {
    margin: 4px 0 12px;
    padding-left: 20px;
    color: var(--ink);
}
li {
    margin-bottom: 4px;
}
.callout {
    margin: 14px 0;
    padding: 12px 14px;
    background: #F5F3FF;
    border-left: 4px solid var(--purple);
    border-radius: 0 8px 8px 0;
    break-inside: avoid;
}
.callout p {
    margin: 0;
    color: var(--deep);
    font-weight: 500;
}

.table-wrap {
    margin: 12px 0;
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
    break-inside: avoid;
}
table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5px;
}
thead { display: table-header-group; }
tr { break-inside: avoid; }
th {
    padding: 8px 10px;
    background: var(--deep);
    color: #fff;
    font-weight: 700;
    text-align: left;
    letter-spacing: 0.03em;
}
td {
    padding: 7px 10px;
    border-top: 1px solid var(--line);
    vertical-align: top;
    color: var(--ink);
}
tr:nth-child(even) td {
    background: #F9FAFB;
}
.table-logo {
    width: 18px;
    height: 18px;
    object-fit: contain;
    vertical-align: middle;
    margin-right: 5px;
}

.competitors-section {
    margin-top: 20px;
    page-break-before: auto;
}
.section-sub {
    color: var(--slate);
    font-size: 9.5px;
    margin-bottom: 12px;
}
.competitor-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
}
.competitor-card {
    padding: 12px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 8px;
    break-inside: avoid;
}
.comp-card-top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}
.comp-logo-box {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
}
.comp-card-logo {
    width: 24px;
    height: 24px;
    object-fit: contain;
}
.comp-card-letter {
    font-size: 14px;
    font-weight: 800;
    color: var(--purple);
}
.comp-card-top h4 {
    margin: 0;
    font-size: 11px;
    color: var(--deep);
}
.comp-site-link {
    font-size: 8px;
    color: var(--purple);
    text-decoration: none;
}
.comp-positioning {
    font-size: 8.5px;
    color: var(--slate);
    margin: 0 0 8px;
}
.comp-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}
.comp-attr-tag {
    font-size: 7px;
    font-weight: 700;
    padding: 2px 6px;
    background: #F3F4F6;
    border-radius: 4px;
    color: #4B5563;
}
</style>
</head>
<body>

<section class="cover-page">
    <div class="cover-top">
        <div class="cover-kicker">Smark Connect · Executive Intelligence</div>
        <h1 class="cover-title">{{ title }}</h1>
        <p class="cover-subtitle">Evidence-based analysis synthesized from verified public crawl assets, market signals, and strategic skills.</p>
        {% if company_brief %}
        <div class="cover-brief">
            <strong>Subject Company Context</strong>
            <p>{{ company_brief }}</p>
        </div>
        {% endif %}
    </div>

    <div class="cover-meta-grid">
        <div class="cover-meta-item">
            <span>Company</span>
            <strong>{{ company }}</strong>
        </div>
        <div class="cover-meta-item">
            <span>Date</span>
            <strong>{{ updated }}</strong>
        </div>
        <div class="cover-meta-item">
            <span>Evidence</span>
            <strong>{{ source_count }} public sources</strong>
        </div>
    </div>
</section>

<main class="report-body">
    {{ content_html|safe }}
    {{ competitor_html|safe }}
</main>

</body>
</html>
''')


def build_report_html(payload: dict[str, Any]) -> str:
    raw_markdown = payload.get("markdown", "")
    modules = payload.get("modules", [])
    if not raw_markdown and modules:
        raw_markdown = "\n\n".join(f"# {m.get('title', 'Section')}\n\n{m.get('markdown', '')}" for m in modules)

    competitors = []
    for m in modules:
        if isinstance(m, dict) and m.get("competitors"):
            competitors.extend(m["competitors"])
    if not competitors and isinstance(payload.get("competitors"), list):
        competitors = payload["competitors"]

    competitor_logos = {c.get("companyName", ""): c.get("logoDataUrl") or c.get("logoUrl", "") for c in competitors if c.get("companyName")}

    blocks = parse_markdown_blocks(raw_markdown)
    content_html = render_blocks_to_html(blocks, competitor_logos)
    competitor_html = render_competitor_cards(competitors)

    title = normalize_acronyms(payload.get("title", "Strategic Intelligence Report"))
    company = payload.get("companyName", "Target Company")
    company_brief = clean_inline(payload.get("companyBrief") or "")
    source_count = payload.get("sourceCount", 0)

    updated = payload.get("updatedAt", "")
    try:
        updated = datetime.fromisoformat(updated.replace("Z", "+00:00")).strftime("%B %d, %Y")
    except Exception:
        updated = datetime.now().strftime("%B %d, %Y")

    return REPORT_TEMPLATE.render(
        title=title,
        company=company,
        company_brief=company_brief,
        updated=updated,
        source_count=source_count,
        content_html=content_html,
        competitor_html=competitor_html,
    )


def inspect_pdf(path: Path) -> dict[str, Any]:
    reader = PdfReader(str(path))
    issues: list[str] = []
    pages = []
    for idx, page in enumerate(reader.pages):
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        text = (page.extract_text() or "").strip()
        pages.append({"page": idx + 1, "width": round(width, 1), "height": round(height, 1), "characters": len(text)})
        if width < 500 or height < 700:
            issues.append(f"page {idx + 1} has unexpected dimensions")
    return {"pageCount": len(reader.pages), "pages": pages, "issues": issues}


def main() -> None:
    payload = json.load(sys.stdin)
    if payload.get("inspectPdf"):
        qa = inspect_pdf(Path(payload["inspectPdf"]))
        print(json.dumps({"qa": qa}))
        return

    output_pdf = Path(payload["outputPdf"])
    output_html = Path(payload["outputHtml"])
    output_pdf.parent.mkdir(parents=True, exist_ok=True)
    output_html.parent.mkdir(parents=True, exist_ok=True)

    rendered_html = build_report_html(payload)
    output_html.write_text(rendered_html, encoding="utf-8")

    if payload.get("htmlOnly") or HTML is None:
        print(json.dumps({
            "pdf": "",
            "html": str(output_html),
            "renderer": "chromium-fallback",
            "weasyprintError": WEASYPRINT_ERROR,
            "sectionTitles": [],
            "visualMetrics": {},
        }))
        return

    HTML(string=rendered_html, base_url=str(output_html.parent)).write_pdf(str(output_pdf))
    qa = inspect_pdf(output_pdf)
    print(json.dumps({"pdf": str(output_pdf), "html": str(output_html), "qa": {"passes": 1, "final": qa}}))


if __name__ == "__main__":
    main()
