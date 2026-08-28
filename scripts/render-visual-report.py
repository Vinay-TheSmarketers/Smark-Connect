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
ACTION_WORDS = re.compile(r"\b(should|must|recommend|prioriti[sz]e|fix|build|publish|improve|reduce|increase|create|launch|replace|consolidate|measure|implement|address|optimi[sz]e)\b", re.I)
STOPWORDS = {"the", "and", "for", "with", "that", "this", "from", "into", "your", "their", "have", "has", "are", "was", "were", "will", "would", "could", "should", "company", "analysis", "audit", "finding", "report"}
MODULE_META = {
    "COMPANY_INTELLIGENCE": ("Company Intelligence", "What the business appears to sell, to whom, and where the current story creates leverage or confusion."),
    "SEO_AUDIT": ("SEO Audit", "How discoverability, technical signals, and search intent translate into qualified demand."),
    "GEO_AUDIT": ("GEO and AI Visibility", "Whether answer engines can identify, trust, and cite the company for the questions buyers actually ask."),
    "COMPETITOR_ANALYSIS": ("Competitor Analysis", "Where real alternatives create positioning pressure—and where the market still leaves whitespace."),
    "AUDIENCE_ANALYSIS": ("Audience and ICP Research", "Which buyer groups feel the problem most acutely and what evidence moves them toward action."),
    "CONTENT_AUDIT": ("Content Audit and Strategy", "Which content earns attention, where the journey breaks, and what deserves production next."),
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
    actions = [concise(block_text(block), 260) for block in section["blocks"] if ACTION_WORDS.search(block_text(block))]
    return f'<aside class="implications"><strong>Implications</strong><span>{clean_inline(actions[0])}</span></aside>' if actions else ""


def roadmap(modules: list[dict[str, Any]]) -> list[dict[str, str]]:
    candidates: list[tuple[int, str, str]] = []
    for module in modules:
        for section in module["sections"]:
            for block in section["blocks"]:
                for sentence in re.split(r"(?<=[.!?])\s+|\s*;\s*", block_text(block)):
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


TEMPLATE = Template(r'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>{{ title }}</title><style>
:root{--purple:#7C3AED;--deep:#4C1D95;--magenta:#DB2777;--ink:#1F1A1D;--slate:#625A60;--muted:#8D8288;--cream:#FFF9F5;--blush:#FAECF2;--line:#E9DDD8;--white:#fff;--green:#087F5B;--blue:#1769AA;--orange:#C2410C}@page{size:Letter;margin:18mm 15mm 17mm;@top-left{content:element(reportHeader)}@bottom-left{content:"SMARK CONNECT  ·  SKILL-GOVERNED REPORT";font:700 7px Helvetica,Arial,sans-serif;color:#8D8288;letter-spacing:.08em}@bottom-right{content:"PAGE " counter(page) " / " counter(pages);font:7px Helvetica,Arial,sans-serif;color:#8D8288}}*{box-sizing:border-box}html{font-family:Helvetica,"SF Pro Text",Arial,sans-serif;color:var(--ink);font-size:10.5px;line-height:1.55}body{margin:0;background:#fff}.running-header{position:running(reportHeader);width:100%;padding:0 0 7px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;color:var(--deep);font:700 7px Helvetica,Arial,sans-serif;letter-spacing:.09em}.cover{min-height:225mm;padding:18mm 12mm;display:flex;flex-direction:column;justify-content:space-between;border-radius:18px;background:radial-gradient(circle at 88% 10%,#E9D5FF 0,transparent 32%),radial-gradient(circle at 8% 90%,#FCE7F3 0,transparent 34%),var(--cream);page-break-after:always}.kicker{color:var(--deep);font-size:8px;font-weight:800;letter-spacing:.15em}.cover h1{max-width:158mm;margin:18px 0;font-size:39px;line-height:1;letter-spacing:-.055em}.cover h1 span{color:var(--purple)}.cover-copy{max-width:130mm;color:var(--slate);font-size:13px}.cover-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.cover-meta div{padding:14px;border:1px solid rgba(124,58,237,.16);border-radius:12px;background:rgba(255,255,255,.72)}.cover-meta strong,.cover-meta span{display:block}.cover-meta strong{font-size:8px;color:var(--muted);text-transform:uppercase}.cover-meta span{margin-top:5px;font-size:12px;font-weight:700}.executive{min-height:220mm;padding:8mm 4mm;page-break-after:always}.executive h2{margin:9px 0 7px;font-size:28px;letter-spacing:-.04em}.executive-intro{max-width:140mm;margin:0 0 17px;color:var(--slate);font-size:12px}.executive-list{display:grid;gap:11px}.executive-item{display:grid;grid-template-columns:31px 1fr;gap:12px;padding:13px 15px;border:1px solid var(--line);border-radius:12px;break-inside:avoid}.executive-item>span{width:31px;height:31px;display:grid;place-items:center;border-radius:50%;background:var(--deep);color:#fff;font-weight:800}.executive-item small{display:block;color:var(--purple);font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.executive-item p{margin:3px 0;color:var(--slate)}.module-opener{min-height:220mm;padding:20mm 9mm;display:flex;flex-direction:column;justify-content:center;page-break-before:always;page-break-after:always;background:linear-gradient(140deg,#fff 0 58%,#FBF5FF 58%)}.module-number{font-size:70px;line-height:.9;color:#E9DDF1;font-weight:900;letter-spacing:-.07em}.module-opener h2{max-width:150mm;margin:15px 0 8px;font-size:34px;line-height:1.04;letter-spacing:-.05em}.module-frame{max-width:145mm;color:var(--slate);font-size:13px}.headline{max-width:150mm;margin-top:28px;padding:18px 20px;border-left:5px solid var(--purple);background:#fff;box-shadow:0 9px 32px rgba(76,29,149,.08)}.headline small{display:block;margin-bottom:6px;color:var(--magenta);font-size:8px;font-weight:900;letter-spacing:.1em}.headline p{margin:0;font-size:15px;line-height:1.4;font-weight:700}.module-content{page-break-after:always}.analysis-section{margin:0 0 15px;padding:16px 18px;border-top:1px solid var(--line);break-inside:avoid-page}.analysis-section.prominent{padding:21px 20px;background:var(--cream);border:0;border-radius:14px}.analysis-section h3{margin:4px 0 12px;font-size:19px;line-height:1.2;letter-spacing:-.025em}.analysis-section.prominent h3{font-size:24px}.section-kicker{color:var(--deep);font-size:7px;font-weight:900;letter-spacing:.12em}.prose{margin:0 0 11px;color:var(--slate);font-size:10.5px}.inline-metric{color:var(--deep);font-size:1.13em}.quote{padding:11px 13px;border-left:3px solid var(--purple);background:var(--blush);font-style:italic}ul,ol{margin:8px 0 12px;padding-left:19px;color:var(--slate)}li{margin-bottom:5px}.implications,.connected{margin-top:13px;padding:12px 14px;display:grid;grid-template-columns:92px 1fr;gap:10px;border-radius:10px;break-inside:avoid}.implications{background:#E9F8F2;border-left:4px solid var(--green)}.connected{background:#EDF5FF;border-left:4px solid var(--blue)}.implications strong,.connected strong{font-size:8px;text-transform:uppercase;letter-spacing:.07em}.implications span,.connected span{color:var(--slate)}figure{margin:12px 0;break-inside:avoid}figcaption{margin-top:6px;color:var(--muted);font-size:7.5px;font-style:italic}.chart img{width:100%;height:auto;display:block}.flow-svg,.funnel-svg,.priority-svg{width:100%;height:auto;display:block}.comparison-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.comparison-grid article{padding:13px;border:1px solid var(--line);border-radius:10px;background:#fff}.comparison-grid span{color:var(--deep);font-size:8px;font-weight:800;text-transform:uppercase}.comparison-grid h3{margin:4px 0;font-size:13px}.comparison-grid p{margin:0;color:var(--slate)}.table-wrap{overflow:hidden;border:1px solid var(--line);border-radius:10px}table{width:100%;border-collapse:collapse;font-size:8.1px}thead{display:table-header-group}tr{break-inside:avoid}th{padding:8px;background:var(--deep);color:#fff;text-align:left}td{padding:7px;border-top:1px solid var(--line);vertical-align:top;color:var(--slate)}tr:nth-child(even) td{background:#FCF8FA}.table-logo{width:25px;height:25px;margin-right:7px;object-fit:contain;vertical-align:middle}.competitor-strip>div{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.competitor-strip article{min-height:130px;padding:11px;border:1px solid var(--line);border-radius:10px;background:#fff}.logo-media{width:44px;height:44px;display:grid;place-items:center;margin-bottom:7px;border:1px solid var(--line);border-radius:9px;color:var(--deep);font-size:18px;font-weight:900}.logo-media img{width:36px;height:36px;object-fit:contain}.competitor-strip strong{display:block}.competitor-strip p{margin:4px 0;color:var(--slate);font-size:8px}.competitor-strip small{color:var(--orange);font-size:7px}.roadmap{min-height:220mm;padding:10mm 4mm;page-break-before:always}.roadmap h2{margin:8px 0 5px;font-size:28px;letter-spacing:-.04em}.roadmap-intro{color:var(--slate);margin-bottom:18px}.roadmap-list{display:grid;gap:9px}.roadmap-item{display:grid;grid-template-columns:60px 1fr;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:11px;break-inside:avoid}.roadmap-item>strong{color:var(--deep);font-size:9px}.roadmap-item small{display:block;color:var(--magenta);font-size:7px;font-weight:900;text-transform:uppercase}.roadmap-item p{margin:3px 0;color:var(--slate)}.qa-compact .analysis-section{padding:13px}.qa-compact html{font-size:10px}@media print{.executive-item,.analysis-section,.comparison-grid article,.chart,.diagram,.table-wrap,tr,.competitor-strip article,.roadmap-item,.implications,.connected{break-inside:avoid;page-break-inside:avoid}h1,h2,h3{break-after:avoid;page-break-after:avoid}thead{display:table-header-group}}
</style></head><body class="{{ body_class }}"><div class="running-header"><span>THE SMARKETERS / SMARK CONNECT</span><span>{{ company }}</span></div><section class="cover"><div><div class="kicker">STRATEGIC INTELLIGENCE · SKILL-EXECUTED RESEARCH</div><h1>{{ title_prefix }}<span>{{ title_accent }}</span></h1><p class="cover-copy">A decision-weighted synthesis across the six core modules. Prominence reflects business impact; visuals appear only where the evidence contains a real pattern, comparison, sequence, or gap.</p></div><div class="cover-meta"><div><strong>Company</strong><span>{{ company }}</span></div><div><strong>Updated</strong><span>{{ updated }}</span></div><div><strong>Evidence</strong><span>{{ source_count }} sources</span></div></div></section><section class="executive"><div class="kicker">EXECUTIVE SUMMARY</div><h2>What materially matters</h2><p class="executive-intro">These are the strongest non-duplicative findings across the report—not one item per module for symmetry.</p><div class="executive-list">{% for item in executive %}<article class="executive-item"><span>{{ loop.index }}</span><div><small>{{ item.module }}</small><p>{{ item.text|safe }}</p></div></article>{% endfor %}</div></section>{% for module in modules %}<section class="module-opener"><div class="module-number">{{ '%02d'|format(loop.index) }}</div><div class="kicker">{{ module.label|upper }}</div><h2>{{ module.label }}</h2><p class="module-frame">{{ module.framing }}</p><div class="headline"><small>HEADLINE FINDING</small><p>{{ module.headline }}</p></div></section><main class="module-content">{{ module.logo_strip|safe }}{% for section in module.rendered_sections %}<section class="analysis-section {{ 'prominent' if section.prominent else '' }}"><div class="section-kicker">{{ '%02d'|format(loop.index) }} · {{ 'DECISION PRIORITY' if section.prominent else 'SUPPORTING EVIDENCE' }}</div><h3>{{ section.title }}</h3>{{ section.html|safe }}{{ section.connected|safe }}{{ section.implications|safe }}</section>{% endfor %}</main>{% endfor %}<section class="roadmap"><div class="kicker">CONSOLIDATED RECOMMENDATIONS</div><h2>Impact-ranked roadmap</h2><p class="roadmap-intro">Actions compete for priority across modules. Placement reflects the evidence and expected leverage, not equal module representation.</p><div class="roadmap-list">{% for item in roadmap %}<article class="roadmap-item"><strong>{{ item.horizon }}</strong><div><small>{{ item.module }}</small><p>{{ item.text|safe }}</p></div></article>{% endfor %}</div></section></body></html>''')


def build_modules(payload: dict[str, Any]) -> list[dict[str, Any]]:
    source_modules = payload.get("modules") or [{"type": "DOCUMENT", "title": payload["title"], "markdown": payload["markdown"], "competitors": []}]; modules = []
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
    for module in modules:
        scored = [(score_text(section["title"] + " " + " ".join(block_text(block) for block in section["blocks"])), index) for index, section in enumerate(module["sections"])]; prominent_indexes = {index for _, index in sorted(scored, reverse=True)[:2]}; competitor_logos = {item.get("companyName", ""): item.get("logoDataUrl", "") for item in module["competitors"] if item.get("logoDataUrl")}; rendered = []; seen_sections: list[set[str]] = []
        for index, section in enumerate(module["sections"]):
            terms = keywords(section["title"] + " " + " ".join(block_text(block) for block in section["blocks"]))
            if len(terms) > 4 and any(len(terms & prior) / max(1, min(len(terms), len(prior))) > .72 for prior in seen_sections): continue
            seen_sections.append(terms); rendered.append({"title": clean_inline(section["title"]), "prominent": index in prominent_indexes, "html": "".join(render_block(block, section["title"], competitor_logos) for block in section["blocks"]), "connected": connected_note(section, module, modules) if index in prominent_indexes else "", "implications": implications(section)})
        module["rendered_sections"] = rendered; module["logo_strip"] = competitor_strip(module["competitors"])
    title_words = normalize_acronyms(payload["title"]).split(); split = max(1, len(title_words) - 2); updated = payload.get("updatedAt", "")
    try: updated = datetime.fromisoformat(updated.replace("Z", "+00:00")).strftime("%b %d, %Y")
    except ValueError: pass
    rendered_html = TEMPLATE.render(title=normalize_acronyms(payload["title"]), title_prefix=" ".join(title_words[:split]) + " ", title_accent=" ".join(title_words[split:]), company=payload["companyName"], updated=updated, source_count=payload.get("sourceCount", 0), executive=select_executive(modules), modules=modules, roadmap=roadmap(modules), body_class="qa-compact" if compact else "")
    return rendered_html.replace(".module-content{page-break-after:always}", ".module-content{page-break-after:auto}").replace("across the six core modules", f"across {len(modules)} available core modules")


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
    if payload.get("inspectPdf"): print(json.dumps({"qa": inspect_pdf(Path(payload["inspectPdf"]), payload.get("sectionTitles", []))})); return
    output_pdf = Path(payload["outputPdf"]); output_html = Path(payload["outputHtml"]); output_pdf.parent.mkdir(parents=True, exist_ok=True); output_html.parent.mkdir(parents=True, exist_ok=True); modules = build_modules(payload); titles = [section["title"] for module in modules for section in module["sections"]] + [module["label"] for module in modules] + ["Executive Summary", "Impact-ranked roadmap"]
    if payload.get("htmlOnly") or HTML is None: output_html.write_text(build_html(payload, compact=bool(payload.get("compact"))), encoding="utf-8"); print(json.dumps({"pdf": "", "html": str(output_html), "renderer": "chromium-fallback", "weasyprintError": WEASYPRINT_ERROR, "sectionTitles": titles})); return
    first_html = build_html(payload, compact=False); first_pdf = output_pdf.with_name(output_pdf.stem + "-pass-1.pdf"); HTML(string=first_html, base_url=str(output_html.parent)).write_pdf(str(first_pdf)); first_qa = inspect_pdf(first_pdf, titles); final_html = build_html(payload, compact=bool(first_qa["issues"])); output_html.write_text(final_html, encoding="utf-8"); HTML(string=final_html, base_url=str(output_html.parent)).write_pdf(str(output_pdf)); final_qa = inspect_pdf(output_pdf, titles)
    if not output_pdf.read_bytes().startswith(b"%PDF") or final_qa["pageCount"] < 1: raise RuntimeError("The final PDF failed signature or page-count validation.")
    first_pdf.unlink(missing_ok=True); print(json.dumps({"pdf": str(output_pdf), "html": str(output_html), "qa": {"passes": 2, "first": first_qa, "final": final_qa}}))


if __name__ == "__main__": main()
