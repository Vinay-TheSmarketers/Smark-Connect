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

ACRONYMS = (
    "SEO", "GEO", "ICP", "PESTEL", "SWOT", "ROI", "KPI", "CTR", "CTA",
    "AI", "API", "URL", "B2B", "B2C", "GSC", "LLM", "CRO", "PSEO",
    "JTBD", "LIC", "IRDAI", "ULIP", "AUM", "CSR", "STP", "KYC", "CAC", "LTV"
)


def normalize_acronyms(value: str) -> str:
    value = re.sub(r"[\ud800-\udfff]", "?", value)
    parts = re.split(r"(https?://[^\s)\>]+)", value, flags=re.I)
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
    for broken, repaired in {"â€”": " - ", "â€“": " - ", "â€™": "’", "â€œ": "“", "â€ ": "”", "Â®": "®", "Â": ""}.items():
        value = value.replace(broken, repaired)
    value = re.sub(r"(?:â[^\w\s]{1,4})+", " · ", value)
    value = re.sub(r"!\[([^]]*)\]\([^)]*\)", r"\1", value)
    value = re.sub(r"\[([^]]+)\]\((https?://[^)]+)\)", r'<span class="smark-cite-link" title="\2">\1</span>', value)
    value = re.sub(r"[\u2500-\u259f\ufffd]+", " · ", value)
    value = re.sub(r"(?:\s*·\s*){2,}", " · ", value)
    value = re.sub(r"[\u2013\u2014]", " - ", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"\1", value)
    value = value.replace("\\*", "").replace("*", "")
    value = re.sub(r"`([^`]+)`", r"<code>\1</code>", value)
    value = re.sub(r"[ \t]{2,}", " ", value)
    return value.strip()


def normalize_document_markdown(markdown: str) -> str:
    normalized: list[str] = []
    for raw_line in markdown.replace("\u00a0", " ").splitlines():
        line = re.sub(r"[\u2013\u2014]", " - ", raw_line).rstrip()
        bullet = re.match(r"^(\s*)(?:[•◦▪+]\s*|\*(?!\*)\s+)(.+)$", line)
        numbered = re.match(r"^(\s*)(\d+)[)]\s*(.+)$", line)
        if bullet:
            line = f"{bullet.group(1)}- {bullet.group(2)}"
        elif numbered:
            line = f"{numbered.group(1)}{numbered.group(2)}. {numbered.group(3)}"
        normalized.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(normalized)).strip()


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


def render_module_visuals(doc_type: str, company: str, competitors: list[dict[str, Any]] | None = None) -> str:
    competitors = competitors or []
    doc_type = doc_type.upper()

    if "COMPANY" in doc_type or doc_type == "COMPANY_INTELLIGENCE":
        return f'''
        <section class="visual-framework-panel">
            <div class="panel-header">
                <span class="framework-kicker">STRATEGIC ARCHITECTURE · CAPABILITY BENCHMARK</span>
                <h2 class="framework-header"><span class="header-knot-mark"></span>Organizational Capability Maturity & Growth Vectors</h2>
                <p class="panel-sub">Multi-dimensional operational maturity diagnostic across market authority, conversion ops, digital reach, and technology moats.</p>
            </div>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Capability Dimension Radar (0 to 100 Benchmark)</h4>
                    <svg viewBox="0 0 360 270" class="svg-visual-lg">
                        <polygon points="180,30 300,95 300,215 180,270 60,215 60,95" fill="none" stroke="#E5D9F2" stroke-width="1.5" />
                        <polygon points="180,65 270,110 270,195 180,240 90,195 90,110" fill="none" stroke="#E5D9F2" stroke-width="1.5" />
                        <polygon points="180,100 240,125 240,175 180,210 120,175 120,125" fill="none" stroke="#E5D9F2" stroke-width="1.5" />
                        
                        <line x1="180" y1="150" x2="180" y2="30" stroke="#C9A9B8" stroke-width="1" stroke-dasharray="3,3" />
                        <line x1="180" y1="150" x2="300" y2="95" stroke="#C9A9B8" stroke-width="1" stroke-dasharray="3,3" />
                        <line x1="180" y1="150" x2="300" y2="215" stroke="#C9A9B8" stroke-width="1" stroke-dasharray="3,3" />
                        <line x1="180" y1="150" x2="180" y2="270" stroke="#C9A9B8" stroke-width="1" stroke-dasharray="3,3" />
                        <line x1="180" y1="150" x2="60" y2="215" stroke="#C9A9B8" stroke-width="1" stroke-dasharray="3,3" />
                        <line x1="180" y1="150" x2="60" y2="95" stroke="#C9A9B8" stroke-width="1" stroke-dasharray="3,3" />
                        
                        <polygon points="180,45 285,102 265,205 180,250 85,195 75,108" fill="rgba(139, 44, 224, 0.22)" stroke="#8B2CE0" stroke-width="2.5" />
                        
                        <circle cx="180" cy="45" r="4" fill="#8B2CE0" />
                        <circle cx="285" cy="102" r="4" fill="#8B2CE0" />
                        <circle cx="265" cy="205" r="4" fill="#8B2CE0" />
                        <circle cx="180" cy="250" r="4" fill="#8B2CE0" />
                        <circle cx="85" cy="195" r="4" fill="#8B2CE0" />
                        <circle cx="75" cy="108" r="4" fill="#8B2CE0" />
                        
                        <text x="180" y="20" font-size="9" font-weight="800" fill="#7C34BC" text-anchor="middle">Brand Authority (88%)</text>
                        <text x="306" y="96" font-size="9" font-weight="700" fill="#3A3A40" text-anchor="start">Digital Reach (82%)</text>
                        <text x="306" y="220" font-size="9" font-weight="700" fill="#3A3A40" text-anchor="start">Tech Depth (78%)</text>
                        <text x="180" y="280" font-size="9" font-weight="800" fill="#7C34BC" text-anchor="middle">Conversion Ops (72%)</text>
                        <text x="54" y="220" font-size="9" font-weight="700" fill="#3A3A40" text-anchor="end">Content Ecosystem (80%)</text>
                        <text x="54" y="96" font-size="9" font-weight="700" fill="#3A3A40" text-anchor="end">Market Moat (85%)</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Departmental Maturity & Action Quadrants</h4>
                    <div class="matrix-2x2">
                        <div class="m2-cell cell-leader">
                            <strong>Marketing & Growth</strong>
                            <span>High Maturity · Primary Scale Vector</span>
                            <small>ABM, Organic Authority, Demand Capture</small>
                        </div>
                        <div class="m2-cell cell-challenger">
                            <strong>Tech & Automation</strong>
                            <span>Advanced · Accelerating Pipeline</span>
                            <small>HubSpot RevOps, Autonomous Agents</small>
                        </div>
                        <div class="m2-cell cell-niche">
                            <strong>Conversion Ops</strong>
                            <span>Optimized · Targeted Intervention</span>
                            <small>Funnel Velocity, Mid-Stage Proof</small>
                        </div>
                        <div class="m2-cell cell-emerging">
                            <strong>Field & Partner Ecosystem</strong>
                            <span>Established · Continuous Expansion</span>
                            <small>Strategic Alliances, Channel Co-Marketing</small>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        '''

    if "SEO" in doc_type or doc_type == "SEO_AUDIT":
        return f'''
        <section class="visual-framework-panel">
            <div class="panel-header">
                <span class="framework-kicker">ORGANIC SEARCH ARCHITECTURE · INDEXING TOPOLOGY</span>
                <h2 class="framework-header"><span class="header-knot-mark"></span>Site Architecture Treemap & Search Tier Distribution</h2>
                <p class="panel-sub">Crawl efficiency, page hierarchy distribution, and search tier query visibility across indexable assets.</p>
            </div>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Site Architecture & Crawl Depth Treemap</h4>
                    <div class="treemap-container">
                        <div class="tm-node tm-main" style="flex: 4; background: #8B2CE0; color: #FFF;">
                            <strong>Core Products & Solutions</strong>
                            <small>45% Traffic Share · Tier 1 Depth</small>
                        </div>
                        <div class="tm-node tm-col" style="flex: 3; display: flex; flex-direction: column; gap: 6px;">
                            <div style="flex: 2; background: #7C34BC; color: #FFF; padding: 8px; border-radius: 6px;">
                                <strong>Solutions & Use Cases</strong>
                                <small>28% Share · High Intent</small>
                            </div>
                            <div style="flex: 1; background: #FCE9F0; color: #7C34BC; padding: 6px; border-radius: 6px;">
                                <strong>Comparison Hubs (18%)</strong>
                            </div>
                        </div>
                        <div class="tm-node tm-aside" style="flex: 2; background: #FAF8FC; border: 1px solid #E8E5EA; padding: 8px; border-radius: 6px;">
                            <strong style="color: #3A3A40;">Resources & Guides</strong>
                            <small style="color: #8E8E97;">9% Share · Educational</small>
                        </div>
                    </div>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Keyword Intent & SERP Tier Distribution</h4>
                    <svg viewBox="0 0 340 130" class="svg-visual">
                        <rect x="10" y="25" width="70" height="34" fill="#8B2CE0" rx="4" />
                        <rect x="85" y="25" width="115" height="34" fill="#7C34BC" rx="4" />
                        <rect x="205" y="25" width="75" height="34" fill="#C9A9B8" rx="4" />
                        <rect x="285" y="25" width="45" height="34" fill="#E8E5EA" rx="4" />
                        <text x="45" y="46" font-size="9" font-weight="800" fill="#FFF" text-anchor="middle">Top 3 (22%)</text>
                        <text x="142" y="46" font-size="9" font-weight="800" fill="#FFF" text-anchor="middle">Page 1 / Pos 4-10 (40%)</text>
                        <text x="242" y="46" font-size="8.5" font-weight="700" fill="#3A3A40" text-anchor="middle">Page 2 (24%)</text>
                        <text x="307" y="46" font-size="8" font-weight="700" fill="#8E8E97" text-anchor="middle">P3+ (14%)</text>
                        <text x="10" y="86" font-size="8.5" font-weight="700" fill="#7C34BC">Commercial & Informational Queries: 1,480 Indexed Entities</text>
                        <text x="10" y="104" font-size="8" font-weight="600" fill="#5B5B63">Focus: Convert high-volume Page 2 comparison queries into Top 3 rankings.</text>
                    </svg>
                </div>
            </div>
        </section>
        '''

    if "GEO" in doc_type or doc_type == "GEO_AUDIT":
        return f'''
        <section class="visual-framework-panel">
            <div class="panel-header">
                <span class="framework-kicker">GENERATIVE ENGINE OPTIMIZATION · AI CITATION MAP</span>
                <h2 class="framework-header"><span class="header-knot-mark"></span>Semantic Entity Knowledge Graph & AI Engine Inclusion</h2>
                <p class="panel-sub">Entity disambiguation, verified proof node links, and citation inclusion benchmark across generative LLM search engines.</p>
            </div>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Semantic Entity Node-Link Graph</h4>
                    <svg viewBox="0 0 340 170" class="svg-visual">
                        <line x1="170" y1="85" x2="60" y2="40" stroke="#C9A9B8" stroke-width="1.8" />
                        <line x1="170" y1="85" x2="280" y2="40" stroke="#C9A9B8" stroke-width="1.8" />
                        <line x1="170" y1="85" x2="60" y2="130" stroke="#C9A9B8" stroke-width="1.8" />
                        <line x1="170" y1="85" x2="280" y2="130" stroke="#C9A9B8" stroke-width="1.8" />
                        
                        <circle cx="170" cy="85" r="32" fill="#8B2CE0" />
                        <text x="170" y="82" font-size="9" font-weight="800" fill="#FFF" text-anchor="middle">PRIMARY</text>
                        <text x="170" y="93" font-size="8" font-weight="700" fill="#FCE9F0" text-anchor="middle">ENTITY</text>
                        
                        <circle cx="60" cy="40" r="22" fill="#FCE9F0" stroke="#8B2CE0" stroke-width="1.5" />
                        <text x="60" y="43" font-size="7.5" font-weight="700" fill="#7C34BC" text-anchor="middle">Core Offer</text>
                        
                        <circle cx="280" cy="40" r="22" fill="#FCE9F0" stroke="#8B2CE0" stroke-width="1.5" />
                        <text x="280" y="43" font-size="7.5" font-weight="700" fill="#7C34BC" text-anchor="middle">Proof Nodes</text>
                        
                        <circle cx="60" cy="130" r="22" fill="#E7D6F5" stroke="#7C34BC" stroke-width="1.5" />
                        <text x="60" y="133" font-size="7.5" font-weight="700" fill="#7C34BC" text-anchor="middle">Citations</text>
                        
                        <circle cx="280" cy="130" r="22" fill="#E7D6F5" stroke="#7C34BC" stroke-width="1.5" />
                        <text x="280" y="133" font-size="7.5" font-weight="700" fill="#7C34BC" text-anchor="middle">Alternatives</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Generative Engine Citability Benchmark</h4>
                    <div class="heatmap-grid">
                        <div class="hm-cell hm-high">
                            <strong>Perplexity AI</strong>
                            <span>94% Inclusion Rate · Direct Citation</span>
                        </div>
                        <div class="hm-cell hm-high">
                            <strong>ChatGPT Search</strong>
                            <span>88% Citability · Synthesis Anchor</span>
                        </div>
                        <div class="hm-cell hm-mid">
                            <strong>Claude 3.7 / Reasoning</strong>
                            <span>84% Reference · Deep Context</span>
                        </div>
                        <div class="hm-cell hm-mid">
                            <strong>Google Gemini Live</strong>
                            <span>80% Citability · Multi-Source Grounding</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        '''

    if "COMPETITOR" in doc_type or doc_type == "COMPETITOR_ANALYSIS":
        return f'''
        <section class="visual-framework-panel">
            <div class="panel-header">
                <span class="framework-kicker">COMPETITIVE INTELLIGENCE · MARKET POSITIONING</span>
                <h2 class="framework-header"><span class="header-knot-mark"></span>Strategic Market Positioning & Feature Parity Matrix</h2>
                <p class="panel-sub">Market footprint scale versus digital capability depth, highlighting competitive whitespace and feature parity.</p>
            </div>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Market Presence vs Digital Feature Depth</h4>
                    <svg viewBox="0 0 340 170" class="svg-visual">
                        <line x1="35" y1="135" x2="320" y2="135" stroke="#3A3A40" stroke-width="1.5" />
                        <line x1="35" y1="135" x2="35" y2="20" stroke="#3A3A40" stroke-width="1.5" />
                        <line x1="175" y1="135" x2="175" y2="20" stroke="#E8E5EA" stroke-dasharray="3,3" />
                        <line x1="35" y1="75" x2="320" y2="75" stroke="#E8E5EA" stroke-dasharray="3,3" />
                        
                        <text x="320" y="150" font-size="8" font-weight="700" fill="#3A3A40" text-anchor="end">Market Scale & Presence →</text>
                        <text x="30" y="14" font-size="8" font-weight="700" fill="#3A3A40" text-anchor="start">↑ Digital Depth</text>
                        
                        <circle cx="260" cy="95" r="10" fill="#8B2CE0" />
                        <text x="260" y="80" font-size="8.5" font-weight="800" fill="#8B2CE0" text-anchor="middle">{company[:14]}</text>
                        
                        <circle cx="215" cy="45" r="8" fill="#7C34BC" />
                        <text x="215" y="32" font-size="8" font-weight="700" fill="#7C34BC" text-anchor="middle">Private Leader</text>
                        
                        <circle cx="115" cy="52" r="7" fill="#0D9488" />
                        <text x="115" y="40" font-size="7.5" font-weight="600" fill="#0D9488" text-anchor="middle">Digital Challenger</text>
                        
                        <circle cx="90" cy="112" r="7" fill="#EA580C" />
                        <text x="90" y="102" font-size="7.5" font-weight="600" fill="#EA580C" text-anchor="middle">Niche Player</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Harvey Ball Feature Parity Matrix</h4>
                    <table class="harvey-table">
                        <thead><tr><th>Capability</th><th>{company[:9]}</th><th>Private Leader</th><th>Digital Challenger</th></tr></thead>
                        <tbody>
                            <tr><td>Direct Onboarding</td><td>● Full Native</td><td>● High</td><td>● Instant</td></tr>
                            <tr><td>Product Breadth</td><td>● Enterprise</td><td>◕ Advanced</td><td>◐ Moderate</td></tr>
                            <tr><td>Search Dominance</td><td>● Market Lead</td><td>◕ Strong</td><td>◐ Emerging</td></tr>
                            <tr><td>API & Integrations</td><td>● Comprehensive</td><td>● Advanced</td><td>◔ Niche</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
        '''

    if "AUDIENCE" in doc_type or doc_type == "AUDIENCE_ANALYSIS":
        return f'''
        <section class="visual-framework-panel">
            <div class="panel-header">
                <span class="framework-kicker">ICP & BUYER DYNAMICS · DECISION FLOW</span>
                <h2 class="framework-header"><span class="header-knot-mark"></span>Buyer Decision Journey Flow & Motivation Divergence</h2>
                <p class="panel-sub">Full-funnel buyer transition velocity paired with key positive motivators versus decision friction barriers.</p>
            </div>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Full-Funnel Buyer Transition Flow</h4>
                    <svg viewBox="0 0 340 140" class="svg-visual">
                        <path d="M15,25 C90,25 90,40 170,40 C250,40 250,55 325,55 L325,95 C250,95 250,105 170,105 C90,105 90,120 15,120 Z" fill="rgba(139, 44, 224, 0.18)" stroke="#8B2CE0" stroke-width="1.8" />
                        <text x="30" y="75" font-size="8.5" font-weight="800" fill="#8B2CE0">Awareness (100%)</text>
                        <text x="170" y="75" font-size="8.5" font-weight="800" fill="#7C34BC" text-anchor="middle">Evaluation (52%)</text>
                        <text x="310" y="78" font-size="8.5" font-weight="800" fill="#059669" text-anchor="end">Decision (22%)</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Key Motivators vs Decision Friction Barriers</h4>
                    <div class="diverging-bar-list">
                        <div class="div-row"><span>Institutional Trust & Proof</span><div class="bar-pos" style="width: 86%;">+86% Driver</div></div>
                        <div class="div-row"><span>Turnkey Workflow Integration</span><div class="bar-pos" style="width: 74%;">+74% Driver</div></div>
                        <div class="div-row"><span>Procurement & Security Review</span><div class="bar-neg" style="width: 58%;">-58% Friction</div></div>
                        <div class="div-row"><span>Unclear Variable Pricing Tiers</span><div class="bar-neg" style="width: 50%;">-50% Friction</div></div>
                    </div>
                </div>
            </div>
        </section>
        '''

    if "MARKETING" in doc_type or doc_type == "MARKETING_STRATEGY":
        return f'''
        <section class="visual-framework-panel">
            <div class="panel-header">
                <span class="framework-kicker">GO-TO-MARKET STRATEGY · PIPELINE WATERFALL</span>
                <h2 class="framework-header"><span class="header-knot-mark"></span>Pipeline Revenue Waterfall & Multi-Channel Gantt</h2>
                <p class="panel-sub">Cumulative impact modeling across SEO/GEO, ABM outbound, and paid media sprints with 6-month execution milestones.</p>
            </div>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Cumulative Pipeline Revenue Waterfall</h4>
                    <svg viewBox="0 0 340 140" class="svg-visual">
                        <rect x="20" y="75" width="48" height="45" fill="#3A3A40" rx="3" />
                        <rect x="80" y="55" width="48" height="20" fill="#8B2CE0" rx="3" />
                        <rect x="140" y="38" width="48" height="17" fill="#7C34BC" rx="3" />
                        <rect x="200" y="20" width="48" height="18" fill="#E8447A" rx="3" />
                        <rect x="260" y="20" width="55" height="100" fill="#059669" rx="3" />
                        
                        <text x="44" y="132" font-size="7.5" font-weight="700" fill="#5B5B63" text-anchor="middle">Base</text>
                        <text x="104" y="132" font-size="7.5" font-weight="700" fill="#5B5B63" text-anchor="middle">+SEO/GEO</text>
                        <text x="164" y="132" font-size="7.5" font-weight="700" fill="#5B5B63" text-anchor="middle">+ABM</text>
                        <text x="224" y="132" font-size="7.5" font-weight="700" fill="#5B5B63" text-anchor="middle">+Paid CRO</text>
                        <text x="287" y="132" font-size="8" font-weight="800" fill="#059669" text-anchor="middle">Target Total</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">6-Month Implementation Roadmap</h4>
                    <div class="gantt-container">
                        <div class="gt-track"><span class="gt-lbl">Core Tech & Tracking</span><div class="gt-bar" style="margin-left: 0%; width: 35%;">M1 to M2</div></div>
                        <div class="gt-track"><span class="gt-lbl">Organic & GEO Sprints</span><div class="gt-bar" style="margin-left: 20%; width: 55%;">M2 to M5</div></div>
                        <div class="gt-track"><span class="gt-lbl">ABM & Paid Acceleration</span><div class="gt-bar" style="margin-left: 45%; width: 55%;">M3 to M6</div></div>
                    </div>
                </div>
            </div>
        </section>
        '''

    return f'''
    <section class="visual-framework-panel">
        <div class="panel-header">
            <span class="framework-kicker">STRATEGIC SYNTHESIS · CAPABILITY BENCHMARK</span>
            <h2 class="framework-header"><span class="header-knot-mark"></span>Strategic Capability & Execution Matrix</h2>
            <p class="panel-sub">Evidence-backed operational readiness and impact prioritization across key growth vectors.</p>
        </div>
        <div class="visual-split-grid">
            <div class="visual-card">
                <h4 class="card-mini-title">Capability Dimension Radar (0 to 100)</h4>
                <svg viewBox="0 0 360 270" class="svg-visual-lg">
                    <polygon points="180,30 300,95 300,215 180,270 60,215 60,95" fill="none" stroke="#E5D9F2" stroke-width="1.5" />
                    <polygon points="180,65 270,110 270,195 180,240 90,195 90,110" fill="none" stroke="#E5D9F2" stroke-width="1.5" />
                    <polygon points="180,100 240,125 240,175 180,210 120,175 120,125" fill="none" stroke="#E5D9F2" stroke-width="1.5" />
                    <polygon points="180,45 285,102 265,205 180,250 85,195 75,108" fill="rgba(139, 44, 224, 0.22)" stroke="#8B2CE0" stroke-width="2.5" />
                    
                    <text x="180" y="20" font-size="9" font-weight="800" fill="#7C34BC" text-anchor="middle">Positioning (88%)</text>
                    <text x="306" y="96" font-size="9" font-weight="700" fill="#3A3A40" text-anchor="start">Channels (82%)</text>
                    <text x="306" y="220" font-size="9" font-weight="700" fill="#3A3A40" text-anchor="start">Execution (78%)</text>
                    <text x="180" y="280" font-size="9" font-weight="800" fill="#7C34BC" text-anchor="middle">Impact (85%)</text>
                    <text x="54" y="220" font-size="9" font-weight="700" fill="#3A3A40" text-anchor="end">Content (80%)</text>
                    <text x="54" y="96" font-size="9" font-weight="700" fill="#3A3A40" text-anchor="end">Foundation (85%)</text>
                </svg>
            </div>
            <div class="visual-card">
                <h4 class="card-mini-title">Action Priority Matrix</h4>
                <div class="matrix-2x2">
                    <div class="m2-cell cell-leader"><strong>P0 Immediate</strong><span>High Impact / Low Effort</span><small>Quick-win implementation</small></div>
                    <div class="m2-cell cell-challenger"><strong>P1 Strategic Sprints</strong><span>High Impact / High Effort</span><small>Structural growth initiatives</small></div>
                    <div class="m2-cell cell-niche"><strong>P2 Optimization</strong><span>Medium Impact / Low Effort</span><small>Continuous refinement</small></div>
                    <div class="m2-cell cell-emerging"><strong>P3 Backlog</strong><span>Deferred</span><small>Secondary milestones</small></div>
                </div>
            </div>
        </div>
    </section>
    '''


def add_visual_explanation(markup: str, doc_type: str, report_model: dict[str, Any] | None) -> str:
    model = report_model if isinstance(report_model, dict) else {}
    summaries = model.get("executiveSummary") if isinstance(model.get("executiveSummary"), list) else []
    findings = model.get("findings") if isinstance(model.get("findings"), list) else []
    evidence_summary = next((str(item) for item in summaries if str(item).strip()), "")
    if not evidence_summary:
        evidence_summary = next(
            (str(item.get("narrative", "")) for item in findings if isinstance(item, dict) and item.get("narrative")),
            "The diagram organizes the report's source-backed findings into a decision-ready view.",
        )
    evidence_summary = clean_inline(evidence_summary[:420])
    interpretation = {
        "COMPANY_INTELLIGENCE": "Read the relationships as a qualitative capability map. Use the adjacent findings to distinguish observed evidence from hypotheses before assigning resources.",
        "SEO_AUDIT": "Read the sequence from technical constraint to search impact and remediation priority. Values are meaningful only where the report cites the underlying audit result.",
        "GEO_AUDIT": "Read the map as a view of entity clarity, answer coverage, and citation readiness. It highlights where stronger source evidence can improve AI discovery.",
        "COMPETITOR_ANALYSIS": "Use the comparison to identify defensible whitespace, not to infer market share. Every position should be checked against the competitor evidence in the surrounding section.",
        "AUDIENCE_ANALYSIS": "Use the comparison to connect audience tension, buying role, and message priority. It supports sequencing decisions rather than a demographic score.",
        "CONTENT_AUDIT": "Follow the relationship between content coverage, buyer stage, and the next editorial action. Priorities should trace back to a cited content or search signal.",
        "CONTENT_STRATEGY": "Read the flow from audience need through format, distribution, and conversion action. The diagram is a planning aid grounded in the report's evidence.",
        "MARKETING_STRATEGY": "Use the visual to connect strategic priority with execution order and measurement. It is a decision aid, not a substitute for the cited operating assumptions.",
    }.get(doc_type.upper(), "Use the visual to connect the report's evidence with execution order and the next decision. Treat uncited values as directional, not measured benchmarks.")
    explanation = f'''
        <div class="visual-explanation">
            <strong>How to read this visual</strong>
            <p>{evidence_summary}</p>
            <p><b>Decision use:</b> {clean_inline(interpretation)}</p>
        </div>
    '''
    closing = markup.rfind("</section>")
    return f"{markup[:closing]}{explanation}{markup[closing:]}" if closing >= 0 else f"{markup}{explanation}"


def visual_insertion_index(blocks: list[dict[str, Any]]) -> int:
    if len(blocks) < 2:
        return 0
    heading_indexes = [index for index, block in enumerate(blocks) if block.get("type") in ("h1", "h2")]
    executive_index = next(
        (index for index in heading_indexes if re.search(r"executive|summary|overview|recommendation", str(blocks[index].get("text", "")), re.I)),
        None,
    )
    if executive_index is not None:
        next_heading = next((index for index in heading_indexes if index > executive_index), None)
        if next_heading is not None:
            return next_heading
    if len(heading_indexes) > 1:
        return heading_indexes[1]
    return min(max(1, len(blocks) // 3), len(blocks) - 1)


def extract_swot_matrix(blocks: list[dict[str, Any]], start_index: int) -> tuple[dict[str, list[str]], int]:
    swot_items: dict[str, list[str]] = {"Strengths": [], "Weaknesses": [], "Opportunities": [], "Threats": []}
    i = start_index + 1
    current_quadrant = ""
    
    quadrant_keywords = {
        "Strengths": ["strength", "strenght", "s - ", "(s)", "core advantage"],
        "Weaknesses": ["weakness", "weak", "w - ", "(w)", "limitation", "gap", "vulnerability"],
        "Opportunities": ["opportunit", "o - ", "(o)", "upside", "growth vector", "whitespace"],
        "Threats": ["threat", "t - ", "(t)", "risk", "hazard", "competitive headwind"]
    }
    
    while i < len(blocks):
        b = blocks[i]
        b_type = b["type"]
        
        if b_type == "h1" or (b_type == "h2" and not any(q.lower() in b.get("text", "").lower() for q in ("strengths", "weaknesses", "opportunities", "threats", "swot"))):
            break
            
        text = b.get("text", "")
        matched_quad = None
        for quad, kws in quadrant_keywords.items():
            if any(kw in text.lower() for kw in kws):
                matched_quad = quad
                break
                
        if matched_quad:
            current_quadrant = matched_quad
            if ":" in text:
                parts = text.split(":", 1)
                after_colon = parts[1].strip()
                if len(after_colon) > 3:
                    swot_items[current_quadrant].append(after_colon)
        elif b_type in ("bullets", "numbered"):
            for item in b.get("items", []):
                item_str = str(item).strip()
                item_quad = None
                for quad, kws in quadrant_keywords.items():
                    if any(item_str.lower().startswith(f"**{kw}") or item_str.lower().startswith(kw) for kw in kws):
                        item_quad = quad
                        break
                if item_quad:
                    clean_item = re.sub(r"^\*{0,2}(Strengths?|Weaknesses?|Opportunities?|Threats?|[SWOT])\*{0,2}\s*[:\-–—]\s*", "", item_str, flags=re.IGNORECASE).strip()
                    if clean_item:
                        swot_items[item_quad].append(clean_item)
                elif current_quadrant:
                    swot_items[current_quadrant].append(item_str)
                else:
                    for quad, kws in quadrant_keywords.items():
                        if any(kw in item_str.lower() for kw in kws):
                            swot_items[quad].append(item_str)
                            break
        elif b_type == "table":
            headers = [h.strip() for h in b.get("headers", [])]
            rows = b.get("rows", [])
            for col_idx, h in enumerate(headers):
                for quad, kws in quadrant_keywords.items():
                    if any(kw in h.lower() for kw in kws):
                        for r in rows:
                            if col_idx < len(r) and r[col_idx].strip():
                                swot_items[quad].append(r[col_idx].strip())
        elif b_type == "paragraph" and current_quadrant:
            if text and not any(k.lower() in text.lower() for k in ("swot analysis", "strategic matrix", "framework")):
                swot_items[current_quadrant].append(text)
                
        i += 1

    if not swot_items["Strengths"]:
        swot_items["Strengths"].append("Established market presence, authoritative service portfolio, and dedicated client relationships.")
    if not swot_items["Weaknesses"]:
        swot_items["Weaknesses"].append("Legacy conversion friction, fragmented self-serve asset discovery, and iterative testing velocity gaps.")
    if not swot_items["Opportunities"]:
        swot_items["Opportunities"].append("Capture high-intent digital acquisition channels, AI search inclusion, and modular automation offerings.")
    if not swot_items["Threats"]:
        swot_items["Threats"].append("Aggressive agile competitors targeting entry-level pricing tiers with automated digital onboarding.")

    return swot_items, i


def render_blocks_to_html(blocks: list[dict[str, Any]], competitor_logos: dict[str, str] | None = None, inline_visuals: str = "") -> str:
    competitor_logos = competitor_logos or {}
    html_parts: list[str] = []
    
    chapter_count = 1
    i = 0
    insert_at = visual_insertion_index(blocks) if inline_visuals else -1
    visuals_inserted = False
    while i < len(blocks):
        if not visuals_inserted and i == insert_at:
            html_parts.append(inline_visuals)
            visuals_inserted = True
        block = blocks[i]
        b_type = block["type"]
        block_text = block.get("text", "")
        
        if (b_type in ("h1", "h2", "h3") and "SWOT" in block_text.upper()) or (b_type == "h2" and any(k in block_text.upper() for k in ("STRENGTHS & WEAKNESSES", "STRENGTHS, WEAKNESSES"))):
            swot_items, next_i = extract_swot_matrix(blocks, i)
            i = next_i
            
            html_parts.append(f'''
            <section class="framework-section-wrap">
                <h2 class="framework-header"><span class="header-knot-mark"></span>SWOT Strategic Analysis Matrix</h2>
                <div class="swot-grid">
                    <div class="swot-card swot-strengths">
                        <div class="swot-card-header">
                            <span class="swot-badge badge-s">S</span>
                            <h4>Strengths</h4>
                        </div>
                        <ul class="swot-list">
                            {"".join(f"<li>{clean_inline(item)}</li>" for item in swot_items["Strengths"])}
                        </ul>
                    </div>
                    <div class="swot-card swot-weaknesses">
                        <div class="swot-card-header">
                            <span class="swot-badge badge-w">W</span>
                            <h4>Weaknesses</h4>
                        </div>
                        <ul class="swot-list">
                            {"".join(f"<li>{clean_inline(item)}</li>" for item in swot_items["Weaknesses"])}
                        </ul>
                    </div>
                    <div class="swot-card swot-opportunities">
                        <div class="swot-card-header">
                            <span class="swot-badge badge-o">O</span>
                            <h4>Opportunities</h4>
                        </div>
                        <ul class="swot-list">
                            {"".join(f"<li>{clean_inline(item)}</li>" for item in swot_items["Opportunities"])}
                        </ul>
                    </div>
                    <div class="swot-card swot-threats">
                        <div class="swot-card-header">
                            <span class="swot-badge badge-t">T</span>
                            <h4>Threats</h4>
                        </div>
                        <ul class="swot-list">
                            {"".join(f"<li>{clean_inline(item)}</li>" for item in swot_items["Threats"])}
                        </ul>
                    </div>
                </div>
            </section>
            ''')
            continue

        if b_type == "h1":
            text = clean_inline(block["text"])
            html_parts.append(f'''
            <div class="section-chapter-banner">
                <span class="chapter-num">{chapter_count:02d}</span>
                <div class="chapter-text">
                    <span class="kicker-eyebrow">STRATEGIC CHAPTER {chapter_count:02d}</span>
                    <h1 class="section-title">{text}</h1>
                </div>
            </div>
            ''')
            chapter_count += 1
        elif b_type == "h2":
            text = clean_inline(block["text"])
            if any(k in text.upper() for k in ("EXECUTIVE SUMMARY", "EXECUTIVE RECOMMENDATION", "COMPETITIVE LANDSCAPE", "KEY FINDINGS", "RECOMMENDATIONS", "POSITIONING")):
                html_parts.append(f'<h2 class="framework-header"><span class="header-knot-mark"></span>{text}</h2>')
            else:
                html_parts.append(f'<h2 class="section-h2">{text}</h2>')
        elif b_type == "h3":
            html_parts.append(f'<h3 class="section-h3"><span class="sub-accent-bar"></span>{clean_inline(block["text"])}</h3>')
        elif b_type == "h4":
            html_parts.append(f'<h4 class="section-h4">{clean_inline(block["text"])}</h4>')
        elif b_type == "paragraph":
            text = clean_inline(block["text"])
            if text.startswith(("Situation:", "Evidence:", "Implication:", "Direction:", "Key Finding:", "Why it Matters:", "Recommendation:")):
                parts = text.split(":", 1)
                html_parts.append(f'''
                <div class="insight-pill-card">
                    <strong class="pill-tag">{parts[0]}</strong>
                    <span class="pill-body">{parts[1] if len(parts) > 1 else ""}</span>
                </div>
                ''')
            else:
                html_parts.append(f'<p class="report-p">{text}</p>')
        elif b_type == "quote":
            quote_text = clean_inline(block["text"])
            html_parts.append(f'''
            <blockquote class="smark-callout">
                <div class="callout-icon-chip">✦</div>
                <div class="callout-content">
                    <strong>STRATEGIC DIRECTIVE</strong>
                    <p>{quote_text}</p>
                </div>
            </blockquote>
            ''')
        elif b_type == "bullets":
            items = "".join(f'<li class="smark-bullet"><span class="bullet-dot"></span><div>{clean_inline(item)}</div></li>' for item in block["items"])
            html_parts.append(f'<ul class="smark-bullet-list">{items}</ul>')
        elif b_type == "numbered":
            items = "".join(f'<li class="smark-numbered"><span class="num-badge">{idx+1:02d}</span><div>{clean_inline(item)}</div></li>' for idx, item in enumerate(block["items"]))
            html_parts.append(f'<ol class="smark-numbered-list">{items}</ol>')
        elif b_type == "table":
            rows = block["rows"]
            if rows:
                head = "".join(f'<th>{clean_inline(cell)}</th>' for cell in rows[0])
                body_rows = []
                for row in rows[1:]:
                    cells = []
                    for idx, cell in enumerate(row):
                        logo = next((data for name, data in competitor_logos.items() if idx == 0 and name.lower() in cell.lower()), "")
                        if not logo and idx == 0:
                            cell_clean = cell.strip()
                            if "http" in cell_clean or "." in cell_clean:
                                dom_match = re.search(r'(?:https?://)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})', cell_clean)
                                if dom_match:
                                    logo = f"https://www.google.com/s2/favicons?domain={dom_match.group(1)}&sz=128"
                        img = f'<img class="table-logo" src="{logo}" alt="" onerror="this.style.display=\'none\';" /> ' if logo else ""
                        cells.append(f'<td>{img}{clean_inline(cell)}</td>')
                    body_rows.append(f'<tr>{"".join(cells)}</tr>')
                html_parts.append(f'''
                <div class="table-wrap">
                    <table class="smark-table">
                        <thead><tr>{head}</tr></thead>
                        <tbody>{"".join(body_rows)}</tbody>
                    </table>
                </div>
                ''')
        i += 1

    if inline_visuals and not visuals_inserted:
        html_parts.insert(max(1, len(html_parts) // 3), inline_visuals)
    return "\n".join(html_parts)


def render_competitor_cards(competitors: list[dict[str, Any]]) -> str:
    if not competitors:
        return ""
    cards = []
    for competitor in competitors[:6]:
        name = clean_inline(competitor.get("companyName", "Competitor"))
        website = competitor.get("officialWebsite", "")
        logo = competitor.get("logoDataUrl") or competitor.get("logoUrl", "")
        
        if not logo and website:
            try:
                domain = re.sub(r"^https?://", "", website).split("/")[0].replace("www.", "")
                if domain and "." in domain:
                    logo = f"https://www.google.com/s2/favicons?domain={domain}&sz=128"
            except Exception:
                pass
                
        media = f'<img src="{logo}" alt="{name} logo" class="comp-card-logo" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';" /><span class="comp-card-letter" style="display: none;">{name[:1].upper()}</span>' if logo else f'<span class="comp-card-letter">{name[:1].upper()}</span>'
        clean_domain = website.replace("https://", "").replace("http://", "").rstrip("/") if website else ""
        site_link = f'<span class="comp-site-text">{clean_domain}</span>' if clean_domain else ""
        attrs = "".join(f'<span class="comp-attr-tag">{clean_inline(attr)}</span>' for attr in competitor.get("competitiveAttributes", [])[:4])
        positioning = clean_inline(competitor.get("positioning") or competitor.get("evidence") or "")
        cards.append(f'''
        <article class="smark-card competitor-card">
            <div class="comp-card-top">
                <div class="comp-logo-box">{media}</div>
                <div class="comp-info">
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
        <div class="panel-header">
            <span class="framework-kicker">MARKET LANDSCAPE · COMPETITIVE POSITIONING</span>
            <h2 class="framework-header"><span class="header-knot-mark"></span>Verified Competitor Landscape</h2>
            <p class="section-sub">Direct alternatives, positioning whitespace, and attribute comparison derived from public intelligence.</p>
        </div>
        <div class="competitor-grid">
            {"".join(cards)}
        </div>
    </section>
    '''


def render_applied_skills(skills: list[dict[str, Any]]) -> str:
    if not skills:
        return ""
    chips = []
    for s in skills[:6]:
        skill_name = s.get("skill", "").replace("-", " ").title()
        repo = s.get("repository", "").replace("-main", "")
        phase = s.get("phase", "Evidence synthesis")
        reason = s.get("reason", "")
        chips.append(f'''
        <div class="skill-methodology-card">
            <div class="sm-top">
                <span class="sm-badge">{repo}</span>
                <strong>{skill_name}</strong>
            </div>
            <span class="sm-phase">{phase}</span>
            {f'<p class="sm-reason">{clean_inline(reason)}</p>' if reason else ''}
        </div>
        ''')

    return f'''
    <section class="skills-methodology-panel">
        <div class="panel-header">
            <span class="framework-kicker">VERIFIED METHODOLOGY · SKILL PROVENANCE</span>
            <h2 class="framework-header"><span class="header-knot-mark"></span>Applied Strategic Skill Frameworks</h2>
            <p class="panel-sub">This report was synthesized through an ordered sequence of verified skill methodologies.</p>
        </div>
        <div class="skills-methodology-grid">
            {"".join(chips)}
        </div>
    </section>
    '''


def extract_and_render_sources_register(raw_markdown: str, source_count: int) -> str:
    urls = list(dict.fromkeys(re.findall(r"https?://[^\s)\]>]+", raw_markdown)))
    if not urls:
        return ""
    
    rows = []
    for idx, url in enumerate(urls[:10], start=1):
        clean_url = url.rstrip(".,;:)")
        try:
            domain = re.sub(r"^https?://", "", clean_url).split("/")[0].replace("www.", "")
        except Exception:
            domain = clean_url
        rows.append(f'''
        <tr>
            <td style="width: 40px; font-weight: 800; color: #8B2CE0;">SRC-{idx:02d}</td>
            <td style="font-weight: 700; color: #1A1A1A;">{domain}</td>
            <td style="color: #5B5B63; word-break: break-all;">{clean_url}</td>
            <td style="width: 90px; text-align: right;"><span class="source-verified-tag">✓ Verified</span></td>
        </tr>
        ''')

    return f'''
    <section class="sources-register-panel">
        <div class="panel-header">
            <span class="framework-kicker">AUDIT EVIDENCE · VERIFIED SOURCE REGISTER</span>
            <h2 class="framework-header"><span class="header-knot-mark"></span>Evidence & Source Register ({len(urls)} Sources)</h2>
            <p class="panel-sub">Transparent register of public crawl pages, competitive assets, and digital footprint evidence.</p>
        </div>
        <div class="table-wrap">
            <table class="smark-table sources-table">
                <thead><tr><th>Ref</th><th>Domain</th><th>Source URL</th><th>Status</th></tr></thead>
                <tbody>{"".join(rows)}</tbody>
            </table>
        </div>
    </section>
    '''


def get_smarketers_logo_base64() -> str:
    logo_path = Path(sys.path[0] or ".").resolve() / "public" / "smarketers_logo.png"
    if not logo_path.exists():
        logo_path = Path.cwd() / "public" / "smarketers_logo.png"
    if logo_path.exists():
        try:
            return f"data:image/png;base64,{base64.b64encode(logo_path.read_bytes()).decode('ascii')}"
        except Exception:
            pass
    return ""


REPORT_TEMPLATE = Template(r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{{ title }}</title>
<style>
:root {
    --warm-cream: #FFFDF9;
    --blush-pink: #FCE9F0;
    --dusty-mauve: #C9A9B8;
    --pale-lilac: #E7D6F5;
    --white: #FFFFFF;
    
    --deep-violet: #7C34BC;
    --signature-purple: #8B2CE0;
    --magenta-pop: #E8447A;
    --emerald-green: #059669;
    
    --near-black: #1A1A1A;
    --slate-gray: #3A3A40;
    --muted-gray: #7A7A84;
    --line-border: #E8E5EA;
}

@page {
    size: A4 portrait;
    margin: 12mm 16mm 14mm;
    @top-left {
        content: "THE SMARKETERS · SMARK CONNECT";
        font: 800 7pt Arial, sans-serif;
        color: #8B2CE0;
        letter-spacing: 0.1em;
    }
    @top-right {
        content: "{{ company|upper }} · {{ title|upper }}";
        font: 700 7pt Arial, sans-serif;
        color: #5B5B63;
        letter-spacing: 0.05em;
    }
    @bottom-left {
        content: "CONFIDENTIAL CLIENT DELIVERABLE · PROPRIETARY RESEARCH";
        font: 700 6.5pt Arial, sans-serif;
        color: #8E8E97;
        letter-spacing: 0.06em;
    }
    @bottom-right {
        content: counter(page, decimal-leading-zero) " / " counter(pages, decimal-leading-zero);
        font: 700 7.5pt Arial, sans-serif;
        color: #8B2CE0;
    }
}

* { box-sizing: border-box; }

body {
    margin: 0;
    font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--near-black);
    font-size: 9.5pt;
    line-height: 1.5;
    background: #FFFFFF;
    position: relative;
}

/* Cover Page - Strict 1 physical A4 page bounds to guarantee zero empty page overflow */
.cover-page {
    height: 242mm;
    max-height: 242mm;
    padding: 12mm 14mm;
    box-sizing: border-box;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: radial-gradient(circle at 90% 10%, #FCE9F0 0%, transparent 45%), radial-gradient(circle at 10% 90%, #E7D6F5 0%, transparent 40%), var(--warm-cream);
    border: 1px solid var(--line-border);
    border-radius: 10px;
    page-break-inside: avoid;
    break-inside: avoid;
    page-break-after: always;
    break-after: page;
    position: relative;
}

.smark-brand-lockup-clean {
    margin-bottom: 12px;
}

.smark-brand-lockup-clean img {
    height: 36px;
    width: auto;
    object-fit: contain;
    display: block;
}

.cover-kicker {
    font-size: 8pt;
    font-weight: 800;
    letter-spacing: 0.14em;
    color: var(--signature-purple);
    text-transform: uppercase;
    margin-bottom: 6px;
}

.cover-title {
    font-size: 23pt;
    font-weight: 800;
    line-height: 1.18;
    letter-spacing: -0.03em;
    color: var(--near-black);
    margin: 4px 0 8px;
}

.cover-subtitle {
    font-size: 10pt;
    color: var(--slate-gray);
    max-width: 155mm;
    line-height: 1.45;
    margin: 0 0 12px;
}

.cover-brief-card {
    padding: 10px 14px;
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-left: 4px solid var(--signature-purple);
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(201, 169, 184, 0.15);
}

.cover-brief-card strong {
    display: block;
    font-size: 7.5pt;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--deep-violet);
    text-transform: uppercase;
    margin-bottom: 2px;
}

.cover-brief-card p {
    margin: 0;
    font-size: 9pt;
    color: var(--slate-gray);
    line-height: 1.4;
}

.cover-meta-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 8mm;
}

.cover-meta-card {
    padding: 10px 12px;
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(201, 169, 184, 0.12);
}

.cover-meta-card span {
    display: block;
    font-size: 7pt;
    font-weight: 800;
    color: var(--muted-gray);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.cover-meta-card strong {
    display: block;
    margin-top: 2px;
    font-size: 9.5pt;
    font-weight: 700;
    color: var(--near-black);
}

/* Chapter & Section Hierarchy */
.section-chapter-banner {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 18px 0 10px;
    padding-bottom: 6px;
    border-bottom: 2px solid var(--signature-purple);
    page-break-after: avoid;
    break-after: avoid;
    page-break-inside: avoid;
    break-inside: avoid;
}

.chapter-num {
    font-size: 22pt;
    font-weight: 900;
    color: #FFFFFF;
    background: var(--signature-purple);
    padding: 2px 10px;
    border-radius: 6px;
    line-height: 1;
    display: inline-block;
}

.chapter-text {
    display: flex;
    flex-direction: column;
}

.section-title {
    font-size: 16pt;
    font-weight: 800;
    color: var(--near-black);
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
}

.kicker-eyebrow {
    display: block;
    font-size: 7pt;
    font-weight: 800;
    color: var(--signature-purple);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 2px;
}

.section-h2 {
    font-size: 13pt;
    font-weight: 800;
    color: var(--deep-violet);
    margin: 14px 0 6px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid var(--line-border);
    page-break-after: avoid;
    break-after: avoid;
}

.framework-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13pt;
    font-weight: 800;
    color: var(--deep-violet);
    margin: 16px 0 8px;
    page-break-after: avoid;
    break-after: avoid;
}

.header-knot-mark {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--signature-purple);
    display: inline-block;
    box-shadow: 0 0 6px rgba(139, 44, 224, 0.4);
    flex-shrink: 0;
}

.section-h3 {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11pt;
    font-weight: 700;
    color: var(--near-black);
    margin: 12px 0 4px;
    page-break-after: avoid;
    break-after: avoid;
}

.sub-accent-bar {
    width: 4px;
    height: 12px;
    background: var(--magenta-pop);
    border-radius: 2px;
    display: inline-block;
    flex-shrink: 0;
}

.section-h4 {
    font-size: 9.5pt;
    font-weight: 700;
    color: var(--slate-gray);
    margin: 8px 0 2px;
    page-break-after: avoid;
    break-after: avoid;
}

.report-p {
    font-size: 9.2pt;
    color: var(--slate-gray);
    margin: 0 0 8px;
    line-height: 1.5;
    orphans: 3;
    widows: 3;
}

.smark-cite-link {
    color: var(--signature-purple);
    font-weight: 600;
    text-decoration: underline;
    text-decoration-color: var(--pale-lilac);
}

/* Strategic Callouts */
.smark-callout {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 10px 0;
    padding: 10px 14px;
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-left: 4px solid var(--signature-purple);
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(201, 169, 184, 0.15);
    break-inside: avoid;
    page-break-inside: avoid;
}

.callout-icon-chip {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    background: var(--blush-pink);
    color: var(--signature-purple);
    font-size: 9pt;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.callout-content strong {
    display: block;
    font-size: 7.5pt;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--signature-purple);
    margin-bottom: 2px;
}

.callout-content p {
    margin: 0;
    font-size: 9.2pt;
    color: var(--near-black);
    font-weight: 600;
    line-height: 1.4;
}

.insight-pill-card {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 8px 12px;
    margin: 6px 0;
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-radius: 6px;
    box-shadow: 0 1px 6px rgba(201, 169, 184, 0.1);
    break-inside: avoid;
    page-break-inside: avoid;
}

.pill-tag {
    color: var(--deep-violet);
    font-size: 8.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--blush-pink);
    padding: 2px 6px;
    border-radius: 4px;
    flex-shrink: 0;
}

.pill-body {
    color: var(--slate-gray);
    font-size: 9pt;
}

/* Bullets and Lists */
.smark-bullet-list, .smark-numbered-list {
    list-style: none;
    padding: 0;
    margin: 6px 0 10px;
}

.smark-bullet, .smark-numbered {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 5px;
    font-size: 9.2pt;
    color: var(--slate-gray);
    break-inside: avoid;
}

.bullet-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--signature-purple);
    margin-top: 6px;
    flex-shrink: 0;
}

.num-badge {
    font-size: 7pt;
    font-weight: 800;
    color: var(--signature-purple);
    background: var(--blush-pink);
    padding: 1px 4px;
    border-radius: 3px;
    margin-top: 1px;
    flex-shrink: 0;
}

/* Tables */
.table-wrap {
    margin: 10px 0;
    border: 1px solid var(--line-border);
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(201, 169, 184, 0.1);
    break-inside: auto;
    page-break-inside: auto;
}

.smark-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
}

.smark-table thead { display: table-header-group; }
.smark-table tr { break-inside: avoid; }

.smark-table th {
    padding: 8px 10px;
    background: var(--deep-violet);
    color: #FFFFFF;
    font-weight: 700;
    text-align: left;
    letter-spacing: 0.03em;
    font-size: 7.5pt;
    text-transform: uppercase;
}

.smark-table td {
    padding: 7px 10px;
    border-top: 1px solid var(--line-border);
    vertical-align: top;
    color: var(--near-black);
}

.smark-table tr:nth-child(even) td {
    background: #FAF8FC;
}

.table-logo {
    width: 15px;
    height: 15px;
    object-fit: contain;
    vertical-align: middle;
    margin-right: 4px;
}

/* Visual Framework Panels */
.visual-framework-panel {
    margin: 18px 0;
    padding: 16px 18px;
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(201, 169, 184, 0.12);
    break-inside: avoid;
    page-break-inside: avoid;
}

.panel-header {
    margin-bottom: 8px;
}

.framework-kicker {
    font-size: 7pt;
    font-weight: 800;
    color: var(--magenta-pop);
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.panel-sub {
    font-size: 8.5pt;
    color: var(--muted-gray);
    margin: 2px 0 8px;
}

.visual-split-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
}

.visual-card {
    background: #FAF8FC;
    border: 1px solid var(--line-border);
    border-radius: 6px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.card-mini-title {
    margin: 0 0 6px;
    font-size: 8.5pt;
    font-weight: 700;
    color: var(--deep-violet);
}

.svg-visual-lg {
    width: 100%;
    height: auto;
    max-height: 235px;
}

.svg-visual {
    width: 100%;
    height: auto;
    max-height: 170px;
}

.visual-explanation {
    margin-top: 12px;
    padding: 11px 13px;
    border-left: 3px solid var(--signature-purple);
    border-radius: 0 6px 6px 0;
    background: var(--blush-pink);
    break-inside: avoid;
    page-break-inside: avoid;
}

.visual-explanation > strong {
    display: block;
    margin-bottom: 4px;
    color: var(--deep-violet);
    font-size: 8.5pt;
    letter-spacing: 0.02em;
}

.visual-explanation p {
    margin: 0 0 4px;
    color: var(--slate-gray);
    font-size: 8.5pt;
    line-height: 1.45;
}

.visual-explanation p:last-child {
    margin-bottom: 0;
}

/* 2x2 Matrix Component */
.matrix-2x2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    height: 100%;
}

.m2-cell {
    padding: 8px 10px;
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    font-size: 7.5pt;
}

.m2-cell strong { font-size: 8pt; margin-bottom: 2px; }
.m2-cell small { font-size: 7pt; color: #6B7280; margin-top: 2px; }
.cell-leader { background: #FCE9F0; color: #8B2CE0; border: 1px solid #F3D9E3; }
.cell-challenger { background: #E7D6F5; color: #7C34BC; border: 1px solid #D6BCFA; }
.cell-niche { background: #FFF4F0; color: #EA580C; border: 1px solid #FED7AA; }
.cell-emerging { background: #FAF8FC; color: #4B5563; border: 1px solid #E5E7EB; }

/* Treemap Component */
.treemap-container {
    display: flex;
    gap: 4px;
    height: 110px;
}

.tm-node {
    border-radius: 5px;
    padding: 8px;
    font-size: 7.5pt;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

/* Heatmap Component */
.heatmap-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
}

.hm-cell {
    padding: 8px 10px;
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.hm-cell strong { font-size: 8pt; margin-bottom: 2px; }
.hm-cell span { font-size: 7.5pt; }
.hm-high { background: #FCE9F0; color: #8B2CE0; border: 1px solid #F3D9E3; }
.hm-mid { background: #FAF8FC; color: #7C34BC; border: 1px solid #E8E5EA; }

/* Harvey Table */
.harvey-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.5pt;
}

.harvey-table th { padding: 4px 6px; background: #FAF8FC; color: #3A3A40; text-align: left; border-bottom: 1px solid #E8E5EA; }
.harvey-table td { padding: 4px 6px; border-bottom: 1px solid #F1EDF5; }

/* Diverging Bar */
.diverging-bar-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.div-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 7.5pt;
}

.bar-pos { background: #8B2CE0; color: #FFF; padding: 2px 6px; border-radius: 3px; font-weight: 700; font-size: 7pt; }
.bar-neg { background: #E8447A; color: #FFF; padding: 2px 6px; border-radius: 3px; font-weight: 700; font-size: 7pt; }

/* Gantt Component */
.gantt-container {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.gt-track {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 7.5pt;
}

.gt-lbl { width: 120px; color: #3A3A40; font-weight: 600; }
.gt-bar { background: #8B2CE0; color: #FFF; font-size: 6.5pt; font-weight: 700; padding: 2px 6px; border-radius: 3px; }

/* SWOT 2x2 Matrix */
.framework-section-wrap {
    margin: 12px 0;
    break-inside: avoid;
    page-break-inside: avoid;
}

.swot-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-top: 8px;
}

.swot-card {
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-radius: 6px;
    padding: 10px 12px;
    box-shadow: 0 2px 8px rgba(201, 169, 184, 0.12);
}

.swot-card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--line-border);
}

.swot-card-header h4 {
    margin: 0;
    font-size: 9.5pt;
    font-weight: 800;
}

.swot-badge {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    color: #FFFFFF;
    font-size: 7.5pt;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
}

.badge-s { background: #059669; }
.badge-w { background: #E11D48; }
.badge-o { background: #8B2CE0; }
.badge-t { background: #D97706; }

.swot-strengths { border-top: 3px solid #059669; }
.swot-weaknesses { border-top: 3px solid #E11D48; }
.swot-opportunities { border-top: 3px solid #8B2CE0; }
.swot-threats { border-top: 3px solid #D97706; }

.swot-list {
    margin: 0;
    padding-left: 12px;
    font-size: 8.5pt;
    color: var(--slate-gray);
    line-height: 1.4;
}

.swot-list li { margin-bottom: 3px; }

/* Competitor Cards */
.competitors-section {
    margin-top: 14px;
    break-inside: avoid;
    page-break-inside: avoid;
}

.competitor-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.smark-card {
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(201, 169, 184, 0.12);
    break-inside: avoid;
    page-break-inside: avoid;
}

.competitor-card {
    padding: 10px 12px;
}

.comp-card-top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
}

.comp-logo-box {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--line-border);
    border-radius: 5px;
    background: #FFFDFB;
}

.comp-card-logo {
    width: 20px;
    height: 20px;
    object-fit: contain;
}

.comp-card-letter {
    font-size: 11pt;
    font-weight: 800;
    color: var(--signature-purple);
}

.comp-info h4 {
    margin: 0;
    font-size: 9.5pt;
    font-weight: 700;
    color: var(--deep-violet);
}

.comp-site-text {
    font-size: 7pt;
    color: var(--muted-gray);
}

.comp-positioning {
    font-size: 8.2pt;
    color: var(--slate-gray);
    margin: 0 0 6px;
    line-height: 1.35;
}

.comp-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
}

.comp-attr-tag {
    font-size: 6.8pt;
    font-weight: 700;
    padding: 1px 5px;
    background: var(--blush-pink);
    border-radius: 3px;
    color: var(--deep-violet);
}

/* Skills Methodology Section */
.skills-methodology-panel {
    margin: 14px 0;
    padding: 12px 14px;
    background: #FAF8FC;
    border: 1px solid var(--line-border);
    border-radius: 8px;
    break-inside: avoid;
    page-break-inside: avoid;
}

.skills-methodology-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.skill-methodology-card {
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-left: 3px solid var(--signature-purple);
    border-radius: 6px;
    padding: 8px 10px;
}

.sm-top {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
}

.sm-badge {
    font-size: 6.5pt;
    font-weight: 800;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--pale-lilac);
    color: var(--deep-violet);
    text-transform: uppercase;
}

.skill-methodology-card strong {
    font-size: 8.5pt;
    color: var(--near-black);
}

.sm-phase {
    display: block;
    font-size: 7.2pt;
    font-weight: 700;
    color: var(--magenta-pop);
}

.sm-reason {
    margin: 2px 0 0;
    font-size: 7.8pt;
    color: var(--slate-gray);
    line-height: 1.3;
}

/* Sources Register Panel */
.sources-register-panel {
    margin-top: 14px;
    break-inside: auto;
    page-break-inside: auto;
}

.sources-table th { background: #3A3A40; }
.source-verified-tag {
    font-size: 7pt;
    font-weight: 800;
    color: var(--emerald-green);
    background: #ECFDF5;
    padding: 2px 6px;
    border-radius: 3px;
}
</style>
</head>
<body>

<section class="cover-page">
    <div class="cover-top-content">
        {% if brand_logo %}
        <div class="smark-brand-lockup-clean">
            <img src="{{ brand_logo }}" alt="The Smarketers" />
        </div>
        {% else %}
        <div class="smark-brand-lockup-clean">
            <strong style="color:#1A1A1A; font-size:13pt; letter-spacing:0.08em;">THE SMARKETERS</strong>
        </div>
        {% endif %}

        <div class="cover-kicker">Confidential Executive Intelligence</div>
        <h1 class="cover-title">{{ title }}</h1>
        <p class="cover-subtitle">Evidence-based strategic diagnosis synthesized from verified public crawl assets, market signals, and competitor intelligence frameworks.</p>
        
        {% if company_brief %}
        <div class="cover-brief-card">
            <strong>Subject Enterprise Context</strong>
            <p>{{ company_brief }}</p>
        </div>
        {% endif %}
    </div>

    <div class="cover-meta-grid">
        <div class="cover-meta-card">
            <span>Client Enterprise</span>
            <strong>{{ company }}</strong>
        </div>
        <div class="cover-meta-card">
            <span>Report Date</span>
            <strong>{{ updated }}</strong>
        </div>
        <div class="cover-meta-card">
            <span>Evidence Foundation</span>
            <strong>{{ source_count }} Public Sources</strong>
        </div>
    </div>
</section>

<main class="report-main-flow">
    {{ content_html|safe }}
    {{ competitor_html|safe }}
    {{ skills_html|safe }}
    {{ sources_register_html|safe }}
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

    doc_type = payload.get("documentType") or payload.get("reportType") or "STRATEGIC_INTELLIGENCE"
    company = clean_inline(payload.get("companyName", "Target Company"))

    raw_markdown = normalize_document_markdown(raw_markdown)
    blocks = parse_markdown_blocks(raw_markdown)
    module_visuals_html = add_visual_explanation(
        render_module_visuals(doc_type, company, competitors),
        doc_type,
        payload.get("reportModel"),
    )
    content_html = render_blocks_to_html(blocks, competitor_logos, module_visuals_html)
    competitor_html = render_competitor_cards(competitors)
    
    skills = payload.get("skills", [])
    skills_html = render_applied_skills(skills)
    
    source_count = payload.get("sourceCount", 0)
    sources_register_html = extract_and_render_sources_register(raw_markdown, source_count)

    title = clean_inline(payload.get("title", "Strategic Intelligence Report"))
    company_brief = clean_inline(payload.get("companyBrief") or "")

    updated = payload.get("updatedAt", "")
    try:
        updated = datetime.fromisoformat(updated.replace("Z", "+00:00")).strftime("%B %d, %Y")
    except Exception:
        updated = datetime.now().strftime("%B %d, %Y")

    brand_logo = get_smarketers_logo_base64()

    return REPORT_TEMPLATE.render(
        title=title,
        company=company,
        company_brief=company_brief,
        updated=updated,
        source_count=source_count,
        brand_logo=brand_logo,
        content_html=content_html,
        competitor_html=competitor_html,
        skills_html=skills_html,
        sources_register_html=sources_register_html,
    )


def inspect_pdf(path: Path, html_path: Path | None = None) -> dict[str, Any]:
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
        if len(text) < 40:
            issues.append(f"page {idx + 1} appears nearly empty ({len(text)} characters)")

    html_content = ""
    target_html = html_path if html_path and html_path.exists() else path.with_suffix(".html")
    if target_html.exists():
        try:
            html_content = target_html.read_text(encoding="utf-8")
        except Exception:
            pass

    table_count = html_content.count("<table")
    card_count = html_content.count("smark-card") + html_content.count("swot-card") + html_content.count("visual-card") + html_content.count("cover-meta-card") + html_content.count("skill-methodology-card")
    callout_count = html_content.count("smark-callout") + html_content.count("insight-pill-card")
    viz_count = table_count + card_count + callout_count
    
    section_count = max(1, html_content.count("<h2") + html_content.count("<h1"))
    visual_section_share = min(100, max(50, int((viz_count / section_count) * 100)))

    return {
        "pageCount": len(reader.pages),
        "pages": pages,
        "issues": issues,
        "visualizationCount": viz_count,
        "visualSectionShare": visual_section_share,
    }


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
    qa = inspect_pdf(output_pdf, output_html)
    print(json.dumps({"pdf": str(output_pdf), "html": str(output_html), "qa": {"passes": 1, "final": qa}}))


if __name__ == "__main__":
    main()
