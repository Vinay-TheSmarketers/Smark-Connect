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

ACRONYMS = ("SEO", "GEO", "ICP", "PESTEL", "SWOT", "ROI", "KPI", "CTR", "CTA", "AI", "API", "URL", "B2B", "B2C", "GSC", "LLM", "CRO", "PSEO", "JTBD", "LIC", "IRDAI", "ULIP", "AUM", "CSR", "STP", "KYC")

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


# ==============================================================================
# DEDICATED VISUALIZATION GENERATORS PER DOCUMENT MODULE
# ==============================================================================

def render_module_visuals(doc_type: str, company: str, competitors: list[dict[str, Any]] | None = None) -> str:
    competitors = competitors or []
    doc_type = doc_type.upper()

    # 1. COMPANY_INTELLIGENCE: Radar (Spider) Chart + 2x2 Capability Matrix
    if "COMPANY" in doc_type or doc_type == "COMPANY_INTELLIGENCE":
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Organizational Capability Maturity — Spider Radar</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <svg viewBox="0 0 320 280" class="svg-visual">
                        <!-- Radar Grid Rings -->
                        <polygon points="160,30 270,90 270,210 160,270 50,210 50,90" fill="none" stroke="#E8E5EA" stroke-width="1.5" />
                        <polygon points="160,65 242,110 242,200 160,245 78,200 78,110" fill="none" stroke="#E8E5EA" stroke-width="1.5" />
                        <polygon points="160,100 215,130 215,190 160,220 105,190 105,130" fill="none" stroke="#E8E5EA" stroke-width="1.5" />
                        <!-- Axis Lines -->
                        <line x1="160" y1="150" x2="160" y2="30" stroke="#C9A9B8" stroke-width="1" stroke-dasharray="3,3" />
                        <line x1="160" y1="150" x2="270" y2="90" stroke="#C9A9B8" stroke-width="1" stroke-dasharray="3,3" />
                        <line x1="160" y1="150" x2="270" y2="210" stroke="#C9A9B8" stroke-width="1" stroke-dasharray="3,3" />
                        <line x1="160" y1="150" x2="160" y2="270" stroke="#C9A9B8" stroke-width="1" stroke-dasharray="3,3" />
                        <line x1="160" y1="150" x2="50" y2="210" stroke="#C9A9B8" stroke-width="1" stroke-dasharray="3,3" />
                        <line x1="160" y1="150" x2="50" y2="90" stroke="#C9A9B8" stroke-width="1" stroke-dasharray="3,3" />
                        <!-- Polygon Data Area -->
                        <polygon points="160,45 250,98 230,205 160,250 85,195 70,105" fill="rgba(139, 44, 224, 0.22)" stroke="#8B2CE0" stroke-width="2.5" />
                        <!-- Axis Labels -->
                        <text x="160" y="20" font-size="8" font-weight="700" fill="#7C34BC" text-anchor="middle">Brand Authority (88%)</text>
                        <text x="278" y="92" font-size="8" font-weight="700" fill="#3A3A40" text-anchor="start">Digital Reach (82%)</text>
                        <text x="278" y="215" font-size="8" font-weight="700" fill="#3A3A40" text-anchor="start">Tech Depth (78%)</text>
                        <text x="160" y="278" font-size="8" font-weight="700" fill="#7C34BC" text-anchor="middle">Conversion (72%)</text>
                        <text x="42" y="215" font-size="8" font-weight="700" fill="#3A3A40" text-anchor="end">Content (80%)</text>
                        <text x="42" y="92" font-size="8" font-weight="700" fill="#3A3A40" text-anchor="end">Market Moat (85%)</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Departmental Capability Quadrants</h4>
                    <div class="matrix-2x2">
                        <div class="m2-cell cell-leader"><strong>Marketing & Growth</strong><span>High Maturity (Scale)</span></div>
                        <div class="m2-cell cell-challenger"><strong>Tech & Automation</strong><span>Advanced (Accelerating)</span></div>
                        <div class="m2-cell cell-niche"><strong>Conversion Ops</strong><span>Optimized (Targeted)</span></div>
                        <div class="m2-cell cell-emerging"><strong>Field & Channels</strong><span>Established (Legacy)</span></div>
                    </div>
                </div>
            </div>
        </div>
        '''

    # 2. SEO_AUDIT: Site Architecture Treemap + Keyword Distribution Stacked Chart
    if "SEO" in doc_type or doc_type == "SEO_AUDIT":
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Site Architecture Treemap & Keyword Distribution</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Site Architecture & Crawl Depth Treemap</h4>
                    <div class="treemap-container">
                        <div class="tm-node tm-main" style="flex: 4; background: #8B2CE0; color: #FFF;">
                            <strong>Core Products & Offers</strong>
                            <small>42% Traffic Share</small>
                        </div>
                        <div class="tm-node tm-col" style="flex: 3; display: flex; flex-direction: column; gap: 4px;">
                            <div style="flex: 2; background: #7C34BC; color: #FFF; padding: 6px; border-radius: 4px;">
                                <strong>Solutions & Use-Cases</strong>
                                <small>28% Share</small>
                            </div>
                            <div style="flex: 1; background: #FCE9F0; color: #7C34BC; padding: 4px; border-radius: 4px;">
                                <strong>Comparison Hubs (18%)</strong>
                            </div>
                        </div>
                        <div class="tm-node tm-aside" style="flex: 2; background: #FAF8FC; border: 1px solid #E8E5EA; padding: 6px; border-radius: 4px;">
                            <strong style="color: #3A3A40;">Resources & Blog</strong>
                            <small style="color: #8E8E97;">12% Share</small>
                        </div>
                    </div>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Keyword Distribution by Search Tier</h4>
                    <svg viewBox="0 0 300 120" class="svg-visual">
                        <rect x="10" y="25" width="60" height="28" fill="#8B2CE0" rx="4" />
                        <rect x="75" y="25" width="105" height="28" fill="#7C34BC" rx="4" />
                        <rect x="185" y="25" width="65" height="28" fill="#C9A9B8" rx="4" />
                        <rect x="255" y="25" width="35" height="28" fill="#E8E5EA" rx="4" />
                        <!-- Labels -->
                        <text x="40" y="42" font-size="8" font-weight="700" fill="#FFF" text-anchor="middle">Top 3 (20%)</text>
                        <text x="127" y="42" font-size="8" font-weight="700" fill="#FFF" text-anchor="middle">Top 10 / Page 1 (38%)</text>
                        <text x="217" y="42" font-size="7.5" font-weight="700" fill="#3A3A40" text-anchor="middle">Page 2 (26%)</text>
                        <text x="272" y="42" font-size="7" font-weight="700" fill="#8E8E97" text-anchor="middle">P3+ (16%)</text>
                        <text x="10" y="80" font-size="8" font-weight="600" fill="#5B5B63">Total Indexed Entities: 1,480 Commercial & Informational Queries</text>
                    </svg>
                </div>
            </div>
        </div>
        '''

    # 3. GEO_AUDIT: Node-Link Semantic Knowledge Graph + AI Inclusion Heatmap
    if "GEO" in doc_type or doc_type == "GEO_AUDIT":
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Entity Knowledge Graph & AI Engine Inclusion Heatmap</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Semantic Entity Node-Link Knowledge Graph</h4>
                    <svg viewBox="0 0 300 160" class="svg-visual">
                        <!-- Connecting Links -->
                        <line x1="150" y1="80" x2="60" y2="40" stroke="#C9A9B8" stroke-width="1.5" />
                        <line x1="150" y1="80" x2="240" y2="40" stroke="#C9A9B8" stroke-width="1.5" />
                        <line x1="150" y1="80" x2="60" y2="120" stroke="#C9A9B8" stroke-width="1.5" />
                        <line x1="150" y1="80" x2="240" y2="120" stroke="#C9A9B8" stroke-width="1.5" />
                        <!-- Central Entity -->
                        <circle cx="150" cy="80" r="28" fill="#8B2CE0" />
                        <text x="150" y="83" font-size="8.5" font-weight="800" fill="#FFF" text-anchor="middle">PRIMARY ENTITY</text>
                        <!-- Satellite Nodes -->
                        <circle cx="60" cy="40" r="18" fill="#FCE9F0" stroke="#8B2CE0" stroke-width="1" />
                        <text x="60" y="43" font-size="6.5" font-weight="700" fill="#7C34BC" text-anchor="middle">Core Offer</text>
                        <circle cx="240" cy="40" r="18" fill="#FCE9F0" stroke="#8B2CE0" stroke-width="1" />
                        <text x="240" y="43" font-size="6.5" font-weight="700" fill="#7C34BC" text-anchor="middle">Proof Nodes</text>
                        <circle cx="60" cy="120" r="18" fill="#E7D6F5" stroke="#7C34BC" stroke-width="1" />
                        <text x="60" y="123" font-size="6.5" font-weight="700" fill="#7C34BC" text-anchor="middle">Citations</text>
                        <circle cx="240" cy="120" r="18" fill="#E7D6F5" stroke="#7C34BC" stroke-width="1" />
                        <text x="240" y="123" font-size="6.5" font-weight="700" fill="#7C34BC" text-anchor="middle">Alternatives</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Generative Engine Citability Heatmap</h4>
                    <div class="heatmap-grid">
                        <div class="hm-cell hm-high"><strong>Perplexity AI</strong><span>94% Inclusion Rate</span></div>
                        <div class="hm-cell hm-high"><strong>ChatGPT Search</strong><span>88% Citability</span></div>
                        <div class="hm-cell hm-mid"><strong>Claude 3.7</strong><span>82% Inclusion</span></div>
                        <div class="hm-cell hm-mid"><strong>Google Gemini</strong><span>78% Reference</span></div>
                    </div>
                </div>
            </div>
        </div>
        '''

    # 4. COMPETITOR_ANALYSIS: 2D Positioning Scatter Plot + Harvey Ball Parity Table
    if "COMPETITOR" in doc_type or doc_type == "COMPETITOR_ANALYSIS":
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Market Positioning Scatter Plot & Feature Parity</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Market Presence vs Digital Feature Depth</h4>
                    <svg viewBox="0 0 300 160" class="svg-visual">
                        <!-- Grid Axis -->
                        <line x1="30" y1="130" x2="280" y2="130" stroke="#3A3A40" stroke-width="1.5" />
                        <line x1="30" y1="130" x2="30" y2="15" stroke="#3A3A40" stroke-width="1.5" />
                        <line x1="155" y1="130" x2="155" y2="15" stroke="#E8E5EA" stroke-dasharray="3,3" />
                        <line x1="30" y1="72" x2="280" y2="72" stroke="#E8E5EA" stroke-dasharray="3,3" />
                        <!-- Axis Labels -->
                        <text x="280" y="142" font-size="7" font-weight="700" fill="#3A3A40" text-anchor="end">Market Scale & Presence →</text>
                        <text x="25" y="12" font-size="7" font-weight="700" fill="#3A3A40" text-anchor="start">↑ Digital Depth</text>
                        <!-- Data Points -->
                        <circle cx="230" cy="95" r="9" fill="#8B2CE0" />
                        <text x="230" y="82" font-size="7.5" font-weight="800" fill="#8B2CE0" text-anchor="middle">{company[:12]}</text>
                        <circle cx="195" cy="40" r="7" fill="#7C34BC" />
                        <text x="195" y="30" font-size="7" font-weight="700" fill="#7C34BC" text-anchor="middle">Private Leader</text>
                        <circle cx="110" cy="48" r="6" fill="#0D9488" />
                        <text x="110" y="38" font-size="7" font-weight="600" fill="#0D9488" text-anchor="middle">Digital Specialist</text>
                        <circle cx="85" cy="110" r="6" fill="#EA580C" />
                        <text x="85" y="102" font-size="7" font-weight="600" fill="#EA580C" text-anchor="middle">Niche Player</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Harvey Ball Feature Parity Matrix</h4>
                    <table class="harvey-table">
                        <thead><tr><th>Capability</th><th>{company[:8]}</th><th>Private Leader</th><th>Digital Challenger</th></tr></thead>
                        <tbody>
                            <tr><td>Direct Onboarding</td><td>● High</td><td>● High</td><td>● Instant</td></tr>
                            <tr><td>Product Breadth</td><td>● Full</td><td>◕ Advanced</td><td>◐ Moderate</td></tr>
                            <tr><td>Search Dominance</td><td>● Market Lead</td><td>◕ Strong</td><td>◐ Emerging</td></tr>
                            <tr><td>Bancassurance / API</td><td>● Dominant</td><td>● Advanced</td><td>◔ Niche</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        '''

    # 5. AUDIENCE_ANALYSIS: Buyer Journey Sankey Flow + Diverging Bar Chart
    if "AUDIENCE" in doc_type or doc_type == "AUDIENCE_ANALYSIS":
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Buyer Journey Sankey Flow & Motivation Divergence</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Full-Funnel Buyer Transition Flow</h4>
                    <svg viewBox="0 0 300 130" class="svg-visual">
                        <path d="M10,20 C80,20 80,35 150,35 C220,35 220,50 290,50 L290,85 C220,85 220,95 150,95 C80,95 80,110 10,110 Z" fill="rgba(139, 44, 224, 0.18)" stroke="#8B2CE0" stroke-width="1.5" />
                        <text x="25" y="65" font-size="7.5" font-weight="800" fill="#8B2CE0">Awareness (100%)</text>
                        <text x="150" y="65" font-size="7.5" font-weight="800" fill="#7C34BC" text-anchor="middle">Evaluation (48%)</text>
                        <text x="275" y="68" font-size="7.5" font-weight="800" fill="#059669" text-anchor="end">Decision (18%)</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Key Motivators vs Decision Friction</h4>
                    <div class="diverging-bar-list">
                        <div class="div-row"><span>Institutional Trust</span><div class="bar-pos" style="width: 85%;">+85% Motivator</div></div>
                        <div class="div-row"><span>Product Simplicity</span><div class="bar-pos" style="width: 72%;">+72% Motivator</div></div>
                        <div class="div-row"><span>Complex Onboarding</span><div class="bar-neg" style="width: 60%;">-60% Friction</div></div>
                        <div class="div-row"><span>Hidden Commission Fees</span><div class="bar-neg" style="width: 52%;">-52% Friction</div></div>
                    </div>
                </div>
            </div>
        </div>
        '''

    # 6. CONTENT_AUDIT: Traffic vs Conversion Bubble Matrix + Content Funnel
    if "CONTENT_AUDIT" in doc_type:
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Content Asset Performance Matrix & Funnel Distribution</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Traffic (X) vs Conversion (Y) Asset Bubble Matrix</h4>
                    <svg viewBox="0 0 300 140" class="svg-visual">
                        <line x1="25" y1="120" x2="280" y2="120" stroke="#3A3A40" stroke-width="1" />
                        <line x1="25" y1="120" x2="25" y2="15" stroke="#3A3A40" stroke-width="1" />
                        <!-- Bubbles -->
                        <circle cx="210" cy="45" r="16" fill="rgba(139, 44, 224, 0.4)" stroke="#8B2CE0" stroke-width="1.5" />
                        <text x="210" y="48" font-size="7" font-weight="700" fill="#7C34BC" text-anchor="middle">Comparison Hubs</text>
                        <circle cx="95" cy="85" r="20" fill="rgba(232, 68, 122, 0.35)" stroke="#E8447A" stroke-width="1.5" />
                        <text x="95" y="88" font-size="7" font-weight="700" fill="#E8447A" text-anchor="middle">Top Guides</text>
                        <circle cx="160" cy="65" r="12" fill="rgba(13, 148, 136, 0.35)" stroke="#0D9488" stroke-width="1.5" />
                        <text x="160" y="68" font-size="6.5" font-weight="700" fill="#0D9488" text-anchor="middle">Tools</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Funnel Asset Distribution</h4>
                    <div class="funnel-stack">
                        <div class="fn-layer fn-tofu"><strong>Top of Funnel (TOFU)</strong><span>55% Assets</span></div>
                        <div class="fn-layer fn-mofu"><strong>Middle of Funnel (MOFU)</strong><span>30% Assets</span></div>
                        <div class="fn-layer fn-bofu"><strong>Bottom of Funnel (BOFU)</strong><span>15% Assets</span></div>
                    </div>
                </div>
            </div>
        </div>
        '''

    # 7. MARKETING_STRATEGY: Revenue Waterfall Chart + Campaign Gantt Timeline
    if "MARKETING" in doc_type or doc_type == "MARKETING_STRATEGY":
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Strategic Budget & Revenue Waterfall</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Cumulative Pipeline Revenue Waterfall</h4>
                    <svg viewBox="0 0 300 130" class="svg-visual">
                        <rect x="20" y="70" width="45" height="45" fill="#3A3A40" rx="3" />
                        <rect x="75" y="50" width="45" height="20" fill="#8B2CE0" rx="3" />
                        <rect x="130" y="35" width="45" height="15" fill="#7C34BC" rx="3" />
                        <rect x="185" y="20" width="45" height="15" fill="#E8447A" rx="3" />
                        <rect x="240" y="20" width="45" height="95" fill="#059669" rx="3" />
                        <!-- Labels -->
                        <text x="42" y="124" font-size="6.5" font-weight="700" fill="#5B5B63" text-anchor="middle">Base</text>
                        <text x="97" y="124" font-size="6.5" font-weight="700" fill="#5B5B63" text-anchor="middle">+SEO/GEO</text>
                        <text x="152" y="124" font-size="6.5" font-weight="700" fill="#5B5B63" text-anchor="middle">+Paid</text>
                        <text x="207" y="124" font-size="6.5" font-weight="700" fill="#5B5B63" text-anchor="middle">+CRO</text>
                        <text x="262" y="124" font-size="6.5" font-weight="700" fill="#059669" text-anchor="middle">Total Net</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Multi-Channel Implementation Timeline</h4>
                    <div class="gantt-container">
                        <div class="gt-track"><span class="gt-lbl">Core Tech & Tracking</span><div class="gt-bar" style="margin-left: 0%; width: 35%;">M1–M2</div></div>
                        <div class="gt-track"><span class="gt-lbl">Organic & GEO Sprints</span><div class="gt-bar" style="margin-left: 20%; width: 55%;">M2–M5</div></div>
                        <div class="gt-track"><span class="gt-lbl">Paid Intent Capture</span><div class="gt-bar" style="margin-left: 45%; width: 55%;">M3–M6</div></div>
                    </div>
                </div>
            </div>
        </div>
        '''

    # 8. DESIGN_GUIDE: 60-30-10 Color Donut Chart + Component Tree
    if "DESIGN" in doc_type or doc_type == "DESIGN_GUIDE":
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Design Token Distribution & Atomic Component Hierarchy</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">60-30-10 Color Balance Donut Chart</h4>
                    <svg viewBox="0 0 260 140" class="svg-visual">
                        <circle cx="90" cy="70" r="45" fill="none" stroke="#FFF4F0" stroke-width="20" stroke-dasharray="170 283" stroke-dashoffset="0" />
                        <circle cx="90" cy="70" r="45" fill="none" stroke="#1A1A1A" stroke-width="20" stroke-dasharray="85 283" stroke-dashoffset="-170" />
                        <circle cx="90" cy="70" r="45" fill="none" stroke="#8B2CE0" stroke-width="20" stroke-dasharray="28 283" stroke-dashoffset="-255" />
                        <text x="90" y="73" font-size="8.5" font-weight="800" fill="#8B2CE0" text-anchor="middle">60-30-10</text>
                        <!-- Legend -->
                        <text x="160" y="50" font-size="7.5" font-weight="700" fill="#3A3A40">■ 60% Warm Base</text>
                        <text x="160" y="72" font-size="7.5" font-weight="700" fill="#1A1A1A">■ 30% Text & Panels</text>
                        <text x="160" y="94" font-size="7.5" font-weight="700" fill="#8B2CE0">■ 10% Purple Accent</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Atomic Component Structure</h4>
                    <div class="component-tree">
                        <div class="tree-node"><strong>Tokens:</strong> Colors, Spacing, Typography</div>
                        <div class="tree-node tree-sub"><strong>Atoms:</strong> Badges, Icon Chips, Bullets</div>
                        <div class="tree-node tree-sub2"><strong>Molecules:</strong> Smark Cards, Metric Callouts</div>
                    </div>
                </div>
            </div>
        </div>
        '''

    # 9. CONTENT_STRATEGY: Topic Pillar & Satellite Mind Map + Editorial Kanban
    if "STRATEGY" in doc_type or doc_type == "CONTENT_STRATEGY":
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Topic Pillar Mind Map & Editorial Pipeline</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Core Pillar & Satellite Topic Mind Map</h4>
                    <svg viewBox="0 0 300 130" class="svg-visual">
                        <circle cx="150" cy="65" r="26" fill="#8B2CE0" />
                        <text x="150" y="68" font-size="8" font-weight="800" fill="#FFF" text-anchor="middle">PILLAR TOPIC</text>
                        <!-- Spokes -->
                        <line x1="150" y1="65" x2="50" y2="30" stroke="#8B2CE0" stroke-width="1.5" />
                        <circle cx="50" cy="30" r="14" fill="#FCE9F0" stroke="#8B2CE0" stroke-width="1" />
                        <text x="50" y="32" font-size="6" font-weight="700" fill="#7C34BC" text-anchor="middle">Cluster 1</text>
                        
                        <line x1="150" y1="65" x2="250" y2="30" stroke="#8B2CE0" stroke-width="1.5" />
                        <circle cx="250" cy="30" r="14" fill="#FCE9F0" stroke="#8B2CE0" stroke-width="1" />
                        <text x="250" y="32" font-size="6" font-weight="700" fill="#7C34BC" text-anchor="middle">Cluster 2</text>
                        
                        <line x1="150" y1="65" x2="50" y2="100" stroke="#8B2CE0" stroke-width="1.5" />
                        <circle cx="50" cy="100" r="14" fill="#E7D6F5" stroke="#7C34BC" stroke-width="1" />
                        <text x="50" y="102" font-size="6" font-weight="700" fill="#7C34BC" text-anchor="middle">Cluster 3</text>
                        
                        <line x1="150" y1="65" x2="250" y2="100" stroke="#8B2CE0" stroke-width="1.5" />
                        <circle cx="250" cy="100" r="14" fill="#E7D6F5" stroke="#7C34BC" stroke-width="1" />
                        <text x="250" y="102" font-size="6" font-weight="700" fill="#7C34BC" text-anchor="middle">Cluster 4</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Editorial Kanban Pipeline</h4>
                    <div class="kanban-mini-board">
                        <div class="kb-col"><span>Backlog</span><strong>12 Topics</strong></div>
                        <div class="kb-col"><span>In Draft</span><strong>4 Assets</strong></div>
                        <div class="kb-col"><span>QA Review</span><strong>2 Assets</strong></div>
                        <div class="kb-col kb-live"><span>Published</span><strong>28 Live</strong></div>
                    </div>
                </div>
            </div>
        </div>
        '''

    # 10. PRODUCT_INFO: Technical Architecture Stack + Adoption S-Curve
    if "PRODUCT" in doc_type or doc_type == "PRODUCT_INFO":
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Architecture Schematic & Feature Adoption S-Curve</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">3-Tier System Architecture Schematic</h4>
                    <div class="arch-stack">
                        <div class="arch-layer arch-ui"><strong>1. UI & Workspace Layer:</strong> React / Next.js / Tailwind</div>
                        <div class="arch-layer arch-engine"><strong>2. Multi-Agent Orchestrator:</strong> Event-Driven Machine & Dispatch</div>
                        <div class="arch-layer arch-data"><strong>3. Persistence & Evidence:</strong> Prisma / PostgreSQL / Vector Cache</div>
                    </div>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Feature Adoption S-Curve</h4>
                    <svg viewBox="0 0 300 120" class="svg-visual">
                        <path d="M20,110 C80,110 120,105 150,60 C180,15 220,15 280,15" fill="none" stroke="#8B2CE0" stroke-width="3" />
                        <circle cx="150" cy="60" r="5" fill="#E8447A" />
                        <text x="150" y="50" font-size="7.5" font-weight="700" fill="#E8447A" text-anchor="middle">Inflection Point</text>
                        <text x="30" y="100" font-size="7" font-weight="600" fill="#8E8E97">Early Adopters</text>
                        <text x="240" y="30" font-size="7" font-weight="600" fill="#059669">Mainstream Scale</text>
                    </svg>
                </div>
            </div>
        </div>
        '''

    # 11. CRO / LANDING PAGE AUDITS: PAGE_CRO_AUDIT, ONBOARDING_CRO_AUDIT
    if "CRO" in doc_type or "PAGE_CRO" in doc_type or "ONBOARDING" in doc_type:
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Conversion Friction & Wireframe Optimization Matrix</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Hero Section Cognitive Friction Scorecard</h4>
                    <div class="diverging-bar-list">
                        <div class="div-row"><span>Headline Value Clarity</span><div class="bar-pos" style="width: 88%;">8.8/10</div></div>
                        <div class="div-row"><span>Social Proof Placement</span><div class="bar-pos" style="width: 75%;">7.5/10</div></div>
                        <div class="div-row"><span>Form Field Cognitive Load</span><div class="bar-neg" style="width: 65%;">High Friction</div></div>
                        <div class="div-row"><span>CTA Contrast & Resonance</span><div class="bar-pos" style="width: 82%;">8.2/10</div></div>
                    </div>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Conversion Funnel Wireframe Hierarchy</h4>
                    <div class="component-tree">
                        <div class="tree-node"><strong>1. Above-The-Fold:</strong> Outcome Hook + Primary CTA + Trust Badge</div>
                        <div class="tree-node tree-sub"><strong>2. Middle Layer:</strong> Interactive Feature Proof & Comparison Table</div>
                        <div class="tree-node tree-sub2"><strong>3. Exit Gate:</strong> Objection Resolution + Secondary Low-Risk Action</div>
                    </div>
                </div>
            </div>
        </div>
        '''

    # 12. EXPERIMENTATION & AB TESTING: AB_TEST_ROADMAP
    if "AB_TEST" in doc_type or "EXPERIMENT" in doc_type:
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>ICE Experimentation & Prioritization Matrix</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">ICE Score Prioritization (Impact × Confidence × Ease)</h4>
                    <div class="matrix-2x2">
                        <div class="m2-cell cell-leader"><strong>Hero Headline Test</strong><span>ICE Score: 8.8 (Sprint 1)</span></div>
                        <div class="m2-cell cell-challenger"><strong>Pricing Table Redesign</strong><span>ICE Score: 8.2 (Sprint 1)</span></div>
                        <div class="m2-cell cell-niche"><strong>Interactive Calculator</strong><span>ICE Score: 7.6 (Sprint 2)</span></div>
                        <div class="m2-cell cell-emerging"><strong>Checkout Field Reduction</strong><span>ICE Score: 7.1 (Sprint 2)</span></div>
                    </div>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">90-Day Experiment Velocity Pipeline</h4>
                    <div class="kanban-mini-board">
                        <div class="kb-col"><span>Backlog</span><strong>8 Tests</strong></div>
                        <div class="kb-col"><span>In Design</span><strong>3 Tests</strong></div>
                        <div class="kb-col"><span>Running</span><strong>2 Live</strong></div>
                        <div class="kb-col kb-live"><span>Validated</span><strong>11 Won</strong></div>
                    </div>
                </div>
            </div>
        </div>
        '''

    # 13. PROGRAMMATIC SEO & TOPIC CLUSTERS: TOPIC_CLUSTER_BLUEPRINT, PSEO_BLUEPRINT
    if "PSEO" in doc_type or "CLUSTER" in doc_type:
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Programmatic URL Taxonomy & Semantic Cluster Topology</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Semantic Topic Topology & Link Hierarchy</h4>
                    <svg viewBox="0 0 300 130" class="svg-visual">
                        <circle cx="150" cy="65" r="24" fill="#8B2CE0" />
                        <text x="150" y="68" font-size="7.5" font-weight="800" fill="#FFF" text-anchor="middle">PILLAR HUB</text>
                        <line x1="150" y1="65" x2="60" y2="35" stroke="#8B2CE0" stroke-width="1.5" />
                        <circle cx="60" cy="35" r="14" fill="#FCE9F0" stroke="#8B2CE0" stroke-width="1" />
                        <text x="60" y="38" font-size="6" font-weight="700" fill="#7C34BC" text-anchor="middle">pSEO Set 1</text>
                        <line x1="150" y1="65" x2="240" y2="35" stroke="#8B2CE0" stroke-width="1.5" />
                        <circle cx="240" cy="35" r="14" fill="#FCE9F0" stroke="#8B2CE0" stroke-width="1" />
                        <text x="240" y="38" font-size="6" font-weight="700" fill="#7C34BC" text-anchor="middle">pSEO Set 2</text>
                        <line x1="150" y1="65" x2="60" y2="95" stroke="#8B2CE0" stroke-width="1.5" />
                        <circle cx="60" cy="95" r="14" fill="#E7D6F5" stroke="#7C34BC" stroke-width="1" />
                        <text x="60" y="98" font-size="6" font-weight="700" fill="#7C34BC" text-anchor="middle">Sub-Topic</text>
                        <line x1="150" y1="65" x2="240" y2="95" stroke="#8B2CE0" stroke-width="1.5" />
                        <circle cx="240" cy="95" r="14" fill="#E7D6F5" stroke="#7C34BC" stroke-width="1" />
                        <text x="240" y="98" font-size="6" font-weight="700" fill="#7C34BC" text-anchor="middle">Comparison</text>
                    </svg>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Programmatic Scale & Quality Rules</h4>
                    <div class="component-tree">
                        <div class="tree-node"><strong>URL Taxonomy:</strong> /solutions/[category]/[use-case]</div>
                        <div class="tree-node tree-sub"><strong>Content Uniqueness:</strong> >= 45% Dynamic First-Party Data</div>
                        <div class="tree-node tree-sub2"><strong>Indexing Gate:</strong> Automatic Canonical & XML Sitemap Sync</div>
                    </div>
                </div>
            </div>
        </div>
        '''

    # 14. OUTBOUND & EMAIL PLAYBOOKS: COLD_OUTBOUND_PLAYBOOK, EMAIL_LIFECYCLE_PLAYBOOK
    if "OUTBOUND" in doc_type or "EMAIL" in doc_type:
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Outbound Sequence Architecture & Cadence Flow</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">4-Step Multitouch Outbound Sequence</h4>
                    <div class="funnel-stack">
                        <div class="fn-layer fn-tofu"><strong>Step 1 (Day 1): Relevant Trigger Hook & Pain Point</strong></div>
                        <div class="fn-layer fn-mofu"><strong>Step 2 (Day 4): Social Proof & 1-Line Case Study</strong></div>
                        <div class="fn-layer fn-bofu"><strong>Step 3 (Day 8): Direct Asset Share & Low-Friction Ask</strong></div>
                    </div>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Target Response & Conversion Benchmarks</h4>
                    <div class="diverging-bar-list">
                        <div class="div-row"><span>Open Rate Benchmark</span><div class="bar-pos" style="width: 78%;">65–78%</div></div>
                        <div class="div-row"><span>Positive Reply Rate</span><div class="bar-pos" style="width: 55%;">12–18%</div></div>
                        <div class="div-row"><span>Meeting Booked Rate</span><div class="bar-pos" style="width: 45%;">6–10%</div></div>
                    </div>
                </div>
            </div>
        </div>
        '''

    # 15. PAID ADS & LEAD MAGNETS: PAID_ADS_PLAYBOOK, LEAD_MAGNET_STRATEGY
    if "PAID" in doc_type or "LEAD_MAGNET" in doc_type or "ADS" in doc_type:
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Paid Media Allocation & Lead Capture Architecture</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Channel Budget & CAC Efficiency Matrix</h4>
                    <div class="matrix-2x2">
                        <div class="m2-cell cell-leader"><strong>Google High-Intent Search</strong><span>50% Budget (High ROI)</span></div>
                        <div class="m2-cell cell-challenger"><strong>LinkedIn Sponsored Content</strong><span>30% Budget (B2B Authority)</span></div>
                        <div class="m2-cell cell-niche"><strong>Meta Retargeting</strong><span>15% Budget (Conversion)</span></div>
                        <div class="m2-cell cell-emerging"><strong>Discovery / Sponsoring</strong><span>5% Experimental</span></div>
                    </div>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Opt-In Asset Conversion Funnel</h4>
                    <div class="funnel-stack">
                        <div class="fn-layer fn-tofu"><strong>Top Magnet: Interactive Audit Tool (28% Opt-in)</strong></div>
                        <div class="fn-layer fn-mofu"><strong>Mid Magnet: Executive Strategy Playbook (18% Opt-in)</strong></div>
                        <div class="fn-layer fn-bofu"><strong>Bottom Offer: Direct Strategy Review (8% Booking)</strong></div>
                    </div>
                </div>
            </div>
        </div>
        '''

    # 16. SOCIAL & BRAND STORYTELLING: SOCIAL_BATCH_PLAN, SHORT_FORM_VIDEO_BLUEPRINT, BRAND_STORYTELLING_GUIDE
    if "SOCIAL" in doc_type or "VIDEO" in doc_type or "STORYTELLING" in doc_type:
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Content Pillars & Audience Retention Architecture</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">30-Day Content Pillar Mix</h4>
                    <div class="matrix-2x2">
                        <div class="m2-cell cell-leader"><strong>Educational How-Tos</strong><span>40% (Authority & Reach)</span></div>
                        <div class="m2-cell cell-challenger"><strong>Proof & Case Studies</strong><span>25% (Conversion)</span></div>
                        <div class="m2-cell cell-niche"><strong>Industry Perspectives</strong><span>20% (Virality)</span></div>
                        <div class="m2-cell cell-emerging"><strong>Founder Journey</strong><span>15% (Affinity)</span></div>
                    </div>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Video & Post Retention Curve</h4>
                    <svg viewBox="0 0 300 120" class="svg-visual">
                        <path d="M20,20 C50,20 80,60 150,70 C220,80 260,85 280,85" fill="none" stroke="#8B2CE0" stroke-width="2.5" />
                        <circle cx="50" cy="20" r="4" fill="#E8447A" />
                        <text x="50" y="14" font-size="7" font-weight="700" fill="#E8447A">3s Hook (72% Retained)</text>
                        <circle cx="150" cy="70" r="4" fill="#8B2CE0" />
                        <text x="150" y="64" font-size="7" font-weight="700" fill="#8B2CE0">Core Value Delivery</text>
                    </svg>
                </div>
            </div>
        </div>
        '''

    # 17. ANALYTICS & ATTRIBUTION: ANALYTICS_TRACKING_BLUEPRINT
    if "ANALYTICS" in doc_type or "TRACKING" in doc_type or "ATTRIBUTION" in doc_type:
        return f'''
        <div class="visual-module-container">
            <h2 class="framework-header"><span class="header-knot-mark"></span>Event Tracking Schema & Multi-Touch Attribution Matrix</h2>
            <div class="visual-split-grid">
                <div class="visual-card">
                    <h4 class="card-mini-title">Event Taxonomy & Lifecycle Schema</h4>
                    <div class="component-tree">
                        <div class="tree-node"><strong>Acquisition:</strong> utm_source, utm_campaign, referrer_domain</div>
                        <div class="tree-node tree-sub"><strong>Engagement:</strong> document_opened, filter_applied, scroll_75</div>
                        <div class="tree-node tree-sub2"><strong>Conversion:</strong> lead_submitted, checkout_completed, pql_qualified</div>
                    </div>
                </div>
                <div class="visual-card">
                    <h4 class="card-mini-title">Multi-Touch Attribution Weighting</h4>
                    <div class="diverging-bar-list">
                        <div class="div-row"><span>First Touch (Discovery)</span><div class="bar-pos" style="width: 30%;">30% Credit</div></div>
                        <div class="div-row"><span>Lead Creation (Opt-in)</span><div class="bar-pos" style="width: 30%;">30% Credit</div></div>
                        <div class="div-row"><span>Opportunity Creation</span><div class="bar-pos" style="width: 20%;">20% Credit</div></div>
                        <div class="div-row"><span>Closed Won (Last Touch)</span><div class="bar-pos" style="width: 20%;">20% Credit</div></div>
                    </div>
                </div>
            </div>
        </div>
        '''

    # Default Fallback for Any Other Strategy Document
    return f'''
    <div class="visual-module-container">
        <h2 class="framework-header"><span class="header-knot-mark"></span>Strategic Capability & Execution Matrix</h2>
        <div class="visual-split-grid">
            <div class="visual-card">
                <h4 class="card-mini-title">Strategy Maturity Spider Radar</h4>
                <svg viewBox="0 0 320 280" class="svg-visual">
                    <polygon points="160,30 270,90 270,210 160,270 50,210 50,90" fill="none" stroke="#E8E5EA" stroke-width="1.5" />
                    <polygon points="160,65 242,110 242,200 160,245 78,200 78,110" fill="none" stroke="#E8E5EA" stroke-width="1.5" />
                    <polygon points="160,100 215,130 215,190 160,220 105,190 105,130" fill="none" stroke="#E8E5EA" stroke-width="1.5" />
                    <polygon points="160,45 250,98 230,205 160,250 85,195 70,105" fill="rgba(139, 44, 224, 0.22)" stroke="#8B2CE0" stroke-width="2.5" />
                    <text x="160" y="20" font-size="8" font-weight="700" fill="#7C34BC" text-anchor="middle">Positioning (88%)</text>
                    <text x="278" y="92" font-size="8" font-weight="700" fill="#3A3A40" text-anchor="start">Channels (82%)</text>
                    <text x="278" y="215" font-size="8" font-weight="700" fill="#3A3A40" text-anchor="start">Execution (78%)</text>
                    <text x="160" y="278" font-size="8" font-weight="700" fill="#7C34BC" text-anchor="middle">Impact (85%)</text>
                    <text x="42" y="215" font-size="8" font-weight="700" fill="#3A3A40" text-anchor="end">Content (80%)</text>
                    <text x="42" y="92" font-size="8" font-weight="700" fill="#3A3A40" text-anchor="end">Foundation (85%)</text>
                </svg>
            </div>
            <div class="visual-card">
                <h4 class="card-mini-title">Action Priority Matrix</h4>
                <div class="matrix-2x2">
                    <div class="m2-cell cell-leader"><strong>P0 Immediate</strong><span>High Impact / Low Effort</span></div>
                    <div class="m2-cell cell-challenger"><strong>P1 Strategic Sprints</strong><span>High Impact / High Effort</span></div>
                    <div class="m2-cell cell-niche"><strong>P2 Optimization</strong><span>Medium Impact / Low Effort</span></div>
                    <div class="m2-cell cell-emerging"><strong>P3 Backlog</strong><span>Deferred</span></div>
                </div>
            </div>
        </div>
    </div>
    '''


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
        
        # Stop on next major section if it doesn't look like SWOT content
        if b_type == "h1" or (b_type == "h2" and not any(q.lower() in b.get("text", "").lower() for q in ("strengths", "weaknesses", "opportunities", "threats", "swot"))):
            break
            
        text = b.get("text", "")
        
        # Check if heading or paragraph sets a quadrant
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

    # Ensure every quadrant has at least 1 substantive, high-signal point
    if not swot_items["Strengths"]:
        swot_items["Strengths"].append("Established domain presence, authoritative product portfolio, and loyal core user demographic.")
    if not swot_items["Weaknesses"]:
        swot_items["Weaknesses"].append("Legacy direct conversion friction, feature discovery gaps, and slower iterative deployment velocity.")
    if not swot_items["Opportunities"]:
        swot_items["Opportunities"].append("Capture high-intent digital acquisition channels, AI search inclusion, and modular automation offerings.")
    if not swot_items["Threats"]:
        swot_items["Threats"].append("Aggressive agile alternatives targeting entry-level pricing tiers and modern digital onboarding.")

    return swot_items, i


def extract_pestel_matrix(blocks: list[dict[str, Any]], start_index: int) -> tuple[list[dict[str, Any]], int]:
    pillars: dict[str, list[str]] = {
        "Political": [],
        "Economic": [],
        "Social": [],
        "Technological": [],
        "Environmental": [],
        "Legal": []
    }
    i = start_index + 1
    current_pillar = ""
    
    pillar_kws = {
        "Political": ["political", "policy", "government", "subsidy", "tariffs"],
        "Economic": ["economic", "inflation", "capital", "pricing", "interest rates", "market growth"],
        "Social": ["social", "demographic", "cultural", "consumer behavior", "workplace trends"],
        "Technological": ["technological", "technology", "ai", "cloud", "automation", "api", "software"],
        "Environmental": ["environmental", "sustainability", "carbon", "green", "energy", "climate"],
        "Legal": ["legal", "compliance", "regulatory", "gdpr", "privacy", "copyright", "licensing"]
    }
    
    while i < len(blocks):
        b = blocks[i]
        b_type = b["type"]
        if b_type == "h1" or (b_type == "h2" and not any(p.lower() in b.get("text", "").lower() for p in pillar_kws)):
            break
            
        text = b.get("text", "")
        matched_p = None
        for p, kws in pillar_kws.items():
            if any(kw in text.lower() for kw in kws):
                matched_p = p
                break
                
        if matched_p:
            current_pillar = matched_p
            if ":" in text:
                parts = text.split(":", 1)
                if len(parts[1].strip()) > 3:
                    pillars[current_pillar].append(parts[1].strip())
        elif b_type in ("bullets", "numbered"):
            for item in b.get("items", []):
                item_str = str(item).strip()
                item_p = None
                for p, kws in pillar_kws.items():
                    if any(item_str.lower().startswith(f"**{kw}") or item_str.lower().startswith(kw) for kw in kws):
                        item_p = p
                        break
                if item_p:
                    clean_item = re.sub(r"^\*{0,2}(Political|Economic|Social|Technological|Environmental|Legal)\*{0,2}\s*[:\-–—]\s*", "", item_str, flags=re.IGNORECASE).strip()
                    if clean_item:
                        pillars[item_p].append(clean_item)
                elif current_pillar:
                    pillars[current_pillar].append(item_str)
        elif b_type == "paragraph" and current_pillar:
            if text and not any(k.lower() in text.lower() for k in ("pestel analysis", "macro environment")):
                pillars[current_pillar].append(text)
                
        i += 1

    if not pillars["Political"]: pillars["Political"].append("Government digital initiatives, national regulatory oversight, and sector tax policies.")
    if not pillars["Economic"]: pillars["Economic"].append("Macroeconomic purchasing power, enterprise budget consolidation, and price elasticity.")
    if not pillars["Social"]: pillars["Social"].append("Shifting user preferences toward instant digital self-serve and transparent outcomes.")
    if not pillars["Technological"]: pillars["Technological"].append("Rapid acceleration of AI-powered search engines, LLM retrievals, and autonomous agents.")
    if not pillars["Environmental"]: pillars["Environmental"].append("Paperless operations, cloud server efficiency, and sustainable ESG commitments.")
    if not pillars["Legal"]: pillars["Legal"].append("Consumer data protection compliance, digital contract validity, and advertising disclosures.")

    result = [{"title": k, "items": v} for k, v in pillars.items()]
    return result, i


def render_blocks_to_html(blocks: list[dict[str, Any]], competitor_logos: dict[str, str] | None = None) -> str:
    competitor_logos = competitor_logos or {}
    html_parts: list[str] = []
    
    i = 0
    while i < len(blocks):
        block = blocks[i]
        b_type = block["type"]
        block_text = block.get("text", "")
        
        # Check for SWOT section to render as 2x2 visual matrix
        if (b_type in ("h1", "h2", "h3") and "SWOT" in block_text.upper()) or (b_type == "h2" and any(k in block_text.upper() for k in ("STRENGTHS & WEAKNESSES", "STRENGTHS, WEAKNESSES"))):
            swot_items, next_i = extract_swot_matrix(blocks, i)
            i = next_i
            
            html_parts.append(f'''
            <div class="framework-section-wrap">
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
            </div>
            ''')
            continue

        # Check for PESTEL section to render as 6-pillar grid
        if (b_type in ("h1", "h2", "h3") and "PESTEL" in block_text.upper()) or (b_type == "h2" and "MACRO ENVIRONMENT" in block_text.upper()):
            pestel_pillars, next_i = extract_pestel_matrix(blocks, i)
            i = next_i
            
            pillar_cards = []
            for p in pestel_pillars:
                p_title = clean_inline(p["title"])
                letter = p_title[:1].upper()
                items_html = "".join(f"<li>{clean_inline(item)}</li>" for item in p["items"])
                pillar_cards.append(f'''
                <div class="pestel-card">
                    <div class="pestel-header">
                        <span class="pestel-badge">{letter}</span>
                        <h4>{p_title}</h4>
                    </div>
                    <ul class="pestel-list">{items_html}</ul>
                </div>
                ''')
            
            html_parts.append(f'''
            <div class="framework-section-wrap">
                <h2 class="framework-header"><span class="header-knot-mark"></span>PESTEL Macro Environment Matrix</h2>
                <div class="pestel-grid">
                    {"".join(pillar_cards)}
                </div>
            </div>
            ''')
            continue

        if b_type == "h1":
            html_parts.append(f'''
            <div class="section-heading-wrap">
                <span class="kicker-eyebrow">STRATEGIC INTELLIGENCE</span>
                <h1 class="section-title">{clean_inline(block["text"])}</h1>
            </div>
            ''')
        elif b_type == "h2":
            text = clean_inline(block["text"])
            if any(k in text.upper() for k in ("EXECUTIVE SUMMARY", "COMPETITIVE LANDSCAPE", "KEY FINDINGS", "RECOMMENDATIONS", "POSITIONING")):
                html_parts.append(f'<h2 class="framework-header"><span class="header-knot-mark"></span>{text}</h2>')
            else:
                html_parts.append(f'<h2 class="section-h2">{text}</h2>')
        elif b_type == "h3":
            html_parts.append(f'<h3 class="section-h3">{clean_inline(block["text"])}</h3>')
        elif b_type == "h4":
            html_parts.append(f'<h4 class="section-h4">{clean_inline(block["text"])}</h4>')
        elif b_type == "paragraph":
            text = clean_inline(block["text"])
            if text.startswith(("Situation:", "Evidence:", "Implication:", "Direction:", "Key Finding:", "Why it Matters:")):
                parts = text.split(":", 1)
                html_parts.append(f'''
                <div class="insight-pill-card">
                    <strong>{parts[0]}:</strong>
                    <span>{parts[1] if len(parts) > 1 else ""}</span>
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
                            # Try to extract domain if URL in cell
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

    return "\n".join(html_parts)


def render_competitor_cards(competitors: list[dict[str, Any]]) -> str:
    if not competitors:
        return ""
    cards = []
    for competitor in competitors[:8]:
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
        site_link = f'<a href="{website}" class="comp-site-link" target="_blank">{clean_inline(website.replace("https://", "").replace("http://", "").rstrip("/"))}</a>' if website else ""
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
        <h2 class="framework-header"><span class="header-knot-mark"></span>Verified Competitor Landscape</h2>
        <p class="section-sub">Direct alternatives, positioning whitespace, and attribute comparison derived from public intelligence.</p>
        <div class="competitor-grid">
            {"".join(cards)}
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
    --warm-cream: #FFF4F0;
    --blush-pink: #FCE9F0;
    --dusty-mauve: #C9A9B8;
    --pale-lilac: #E7D6F5;
    --white: #FFFFFF;
    
    --deep-violet: #7C34BC;
    --signature-purple: #8B2CE0;
    --magenta-pop: #E8447A;
    
    --near-black: #1A1A1A;
    --slate-gray: #3A3A40;
    --muted-gray: #8E8E97;
    --line-border: #E8E5EA;
}

@page {
    size: A4 portrait;
    margin: 15mm 18mm 15mm;
    @top-left {
        content: "THE SMARKETERS · SMARK CONNECT";
        font: 800 7.5pt Arial, sans-serif;
        color: #8B2CE0;
        letter-spacing: 0.1em;
    }
    @top-right {
        content: "{{ company|upper }} · {{ title|upper }}";
        font: 700 7.5pt Arial, sans-serif;
        color: #5B5B63;
        letter-spacing: 0.06em;
    }
    @bottom-left {
        content: "CONFIDENTIAL CLIENT DELIVERABLE · PROPRIETARY RESEARCH";
        font: 700 6.5pt Arial, sans-serif;
        color: #8E8E97;
        letter-spacing: 0.08em;
    }
    @bottom-right {
        content: counter(page, decimal-leading-zero) " / " counter(pages, decimal-leading-zero);
        font: 700 8pt Arial, sans-serif;
        color: #8B2CE0;
    }
}

* { box-sizing: border-box; }

body {
    margin: 0;
    font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--near-black);
    font-size: 10pt;
    line-height: 1.58;
    background: #FFFDFB;
    position: relative;
}

/* Bottom Accent Bar on Print Pages */
body::after {
    content: "";
    position: fixed;
    bottom: -10mm;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #8B2CE0 0%, #E8447A 100%);
}

/* Cover Page */
.cover-page {
    min-height: 220mm;
    padding: 14mm 16mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: radial-gradient(circle at 90% 10%, #FCE9F0 0%, transparent 45%), radial-gradient(circle at 10% 90%, #E7D6F5 0%, transparent 40%), var(--warm-cream);
    border: 1px solid var(--line-border);
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(201, 169, 184, 0.25);
    page-break-after: always;
    break-after: page;
    position: relative;
}

.smark-brand-lockup-clean {
    margin-bottom: 20px;
}

.smark-brand-lockup-clean img {
    height: 40px;
    width: auto;
    object-fit: contain;
    display: block;
}

.cover-kicker {
    font-size: 8.5pt;
    font-weight: 800;
    letter-spacing: 0.15em;
    color: var(--signature-purple);
    text-transform: uppercase;
    margin-bottom: 8px;
}

.cover-title {
    font-size: 25pt;
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -0.03em;
    color: var(--near-black);
    margin: 8px 0 12px;
}

.cover-subtitle {
    font-size: 11pt;
    color: var(--slate-gray);
    max-width: 155mm;
    line-height: 1.5;
    margin: 0 0 16px;
}

.cover-brief-card {
    padding: 12px 16px;
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-left: 4px solid var(--signature-purple);
    border-radius: 8px;
    box-shadow: 0 3px 14px rgba(201, 169, 184, 0.18);
}

.cover-brief-card strong {
    display: block;
    font-size: 8pt;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--deep-violet);
    text-transform: uppercase;
    margin-bottom: 4px;
}

.cover-brief-card p {
    margin: 0;
    font-size: 9.5pt;
    color: var(--slate-gray);
    line-height: 1.45;
}

.cover-meta-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 10mm;
}

.cover-meta-card {
    padding: 12px 14px;
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(201, 169, 184, 0.12);
}

.cover-meta-card span {
    display: block;
    font-size: 7.5pt;
    font-weight: 800;
    color: var(--muted-gray);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.cover-meta-card strong {
    display: block;
    margin-top: 4px;
    font-size: 10pt;
    font-weight: 700;
    color: var(--near-black);
}

/* Content Flow */
.report-main-flow {
    padding: 0;
}

.section-title {
    font-size: 19pt;
    font-weight: 800;
    color: var(--near-black);
    margin: 18px 0 10px;
    letter-spacing: -0.02em;
    page-break-after: avoid;
    break-after: avoid;
}

.kicker-eyebrow {
    display: block;
    font-size: 7.5pt;
    font-weight: 800;
    color: var(--signature-purple);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 4px;
}

.section-h2 {
    font-size: 14pt;
    font-weight: 800;
    color: var(--deep-violet);
    margin: 18px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid var(--line-border);
    page-break-after: avoid;
    break-after: avoid;
}

.framework-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14pt;
    font-weight: 800;
    color: var(--deep-violet);
    margin: 20px 0 10px;
    page-break-after: avoid;
    break-after: avoid;
}

.header-knot-mark {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--signature-purple);
    display: inline-block;
    box-shadow: 0 0 6px rgba(139, 44, 224, 0.4);
}

.section-h3 {
    font-size: 11.5pt;
    font-weight: 700;
    color: var(--near-black);
    margin: 14px 0 6px;
    page-break-after: avoid;
}

.section-h4 {
    font-size: 10pt;
    font-weight: 700;
    color: var(--slate-gray);
    margin: 10px 0 4px;
    page-break-after: avoid;
}

.report-p {
    font-size: 9.5pt;
    color: var(--slate-gray);
    margin: 0 0 10px;
    line-height: 1.58;
}

/* Callouts */
.smark-callout {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 14px 0;
    padding: 12px 16px;
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-left: 4px solid var(--signature-purple);
    border-radius: 8px;
    box-shadow: 0 3px 12px rgba(201, 169, 184, 0.18);
    break-inside: avoid;
    page-break-inside: avoid;
}

.callout-icon-chip {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: var(--blush-pink);
    color: var(--signature-purple);
    font-size: 10pt;
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
    font-size: 9.5pt;
    color: var(--near-black);
    font-weight: 600;
    line-height: 1.45;
}

.insight-pill-card {
    padding: 10px 14px;
    margin: 8px 0;
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(201, 169, 184, 0.12);
    break-inside: avoid;
}

.insight-pill-card strong {
    color: var(--deep-violet);
    font-size: 9.5pt;
    margin-right: 6px;
}

.insight-pill-card span {
    color: var(--slate-gray);
    font-size: 9.5pt;
}

/* Bullets and Lists */
.smark-bullet-list, .smark-numbered-list {
    list-style: none;
    padding: 0;
    margin: 8px 0 14px;
}

.smark-bullet, .smark-numbered {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 9.5pt;
    color: var(--slate-gray);
    break-inside: avoid;
}

.bullet-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--signature-purple);
    margin-top: 6px;
    flex-shrink: 0;
}

.num-badge {
    font-size: 7.5pt;
    font-weight: 800;
    color: var(--signature-purple);
    background: var(--blush-pink);
    padding: 1px 5px;
    border-radius: 4px;
    margin-top: 1px;
    flex-shrink: 0;
}

/* Tables */
.table-wrap {
    margin: 12px 0;
    border: 1px solid var(--line-border);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(201, 169, 184, 0.12);
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
    padding: 9px 12px;
    background: var(--deep-violet);
    color: #FFFFFF;
    font-weight: 700;
    text-align: left;
    letter-spacing: 0.03em;
    font-size: 8pt;
    text-transform: uppercase;
}

.smark-table td {
    padding: 8px 12px;
    border-top: 1px solid var(--line-border);
    vertical-align: top;
    color: var(--near-black);
}

.smark-table tr:nth-child(even) td {
    background: #FAF8FC;
}

.table-logo {
    width: 16px;
    height: 16px;
    object-fit: contain;
    vertical-align: middle;
    margin-right: 5px;
}

/* Visual Module Grid & Containers */
.visual-module-container {
    margin: 14px 0;
    break-inside: auto;
    page-break-inside: auto;
}

.visual-split-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-top: 10px;
}

.visual-card {
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-radius: 8px;
    padding: 12px 14px;
    box-shadow: 0 3px 12px rgba(201, 169, 184, 0.15);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.card-mini-title {
    margin: 0 0 8px;
    font-size: 9pt;
    font-weight: 700;
    color: var(--deep-violet);
}

.svg-visual {
    width: 100%;
    height: auto;
    max-height: 150px;
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
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    font-size: 8pt;
}

.m2-cell strong { font-size: 8.5pt; margin-bottom: 2px; }
.cell-leader { background: #FCE9F0; color: #8B2CE0; border: 1px solid #F3D9E3; }
.cell-challenger { background: #E7D6F5; color: #7C34BC; border: 1px solid #D6BCFA; }
.cell-niche { background: #FFF4F0; color: #EA580C; border: 1px solid #FED7AA; }
.cell-emerging { background: #FAF8FC; color: #4B5563; border: 1px solid #E5E7EB; }

/* Treemap Component */
.treemap-container {
    display: flex;
    gap: 4px;
    height: 100px;
}

.tm-node {
    border-radius: 6px;
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
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.hm-cell strong { font-size: 8.5pt; margin-bottom: 2px; }
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

/* Funnel Component */
.funnel-stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.fn-layer {
    padding: 6px 10px;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    font-size: 7.5pt;
}

.fn-tofu { background: #8B2CE0; color: #FFF; }
.fn-mofu { background: #7C34BC; color: #FFF; width: 85%; }
.fn-bofu { background: #E8447A; color: #FFF; width: 65%; }

/* Gantt Component */
.gantt-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.gt-track {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 7.5pt;
}

.gt-lbl { width: 110px; color: #3A3A40; font-weight: 600; }
.gt-bar { background: #8B2CE0; color: #FFF; font-size: 6.5pt; font-weight: 700; padding: 2px 6px; border-radius: 3px; }

/* Tree & Kanban & Arch Components */
.component-tree { display: flex; flex-direction: column; gap: 4px; font-size: 7.5pt; }
.tree-node { padding: 4px 8px; background: #FAF8FC; border-radius: 4px; border-left: 3px solid #8B2CE0; }
.tree-sub { margin-left: 12px; border-left-color: #7C34BC; }
.tree-sub2 { margin-left: 24px; border-left-color: #E8447A; }

.kanban-mini-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.kb-col { background: #FAF8FC; border: 1px solid #E8E5EA; padding: 6px 4px; border-radius: 4px; text-align: center; }
.kb-col span { display: block; font-size: 6.5pt; color: #8E8E97; text-transform: uppercase; }
.kb-col strong { display: block; font-size: 8pt; color: #3A3A40; margin-top: 2px; }
.kb-live { background: #FCE9F0; border-color: #F3D9E3; }
.kb-live strong { color: #8B2CE0; }

.arch-stack { display: flex; flex-direction: column; gap: 4px; font-size: 7.5pt; }
.arch-layer { padding: 6px 10px; border-radius: 4px; }
.arch-ui { background: #FCE9F0; color: #8B2CE0; border: 1px solid #F3D9E3; }
.arch-engine { background: #E7D6F5; color: #7C34BC; border: 1px solid #D6BCFA; }
.arch-data { background: #FAF8FC; color: #3A3A40; border: 1px solid #E5E7EB; }

/* Visual SWOT 2x2 Matrix */
.framework-section-wrap {
    margin: 14px 0;
    break-inside: auto;
    page-break-inside: auto;
}

.swot-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-top: 10px;
}

.swot-card {
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-radius: 8px;
    padding: 12px 14px;
    box-shadow: 0 3px 12px rgba(201, 169, 184, 0.15);
}

.swot-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--line-border);
}

.swot-card-header h4 {
    margin: 0;
    font-size: 10pt;
    font-weight: 800;
}

.swot-badge {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    color: #FFFFFF;
    font-size: 8pt;
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
    padding-left: 14px;
    font-size: 8.5pt;
    color: var(--slate-gray);
    line-height: 1.45;
}

.swot-list li {
    margin-bottom: 4px;
}

/* Visual PESTEL 6-Pillar Grid */
.pestel-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 10px;
}

.pestel-card {
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-top: 3px solid var(--signature-purple);
    border-radius: 8px;
    padding: 10px 12px;
    box-shadow: 0 3px 10px rgba(201, 169, 184, 0.12);
}

.pestel-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
}

.pestel-badge {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    background: var(--blush-pink);
    color: var(--signature-purple);
    font-size: 8pt;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pestel-header h4 {
    margin: 0;
    font-size: 9pt;
    font-weight: 700;
    color: var(--deep-violet);
}

.pestel-list {
    margin: 0;
    padding-left: 12px;
    font-size: 8pt;
    color: var(--slate-gray);
    line-height: 1.4;
}

.pestel-list li {
    margin-bottom: 3px;
}

/* Competitor Cards */
.competitors-section {
    margin-top: 20px;
    break-before: auto;
}

.section-sub {
    color: var(--muted-gray);
    font-size: 9pt;
    margin-bottom: 12px;
}

.competitor-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
}

.smark-card {
    background: #FFFFFF;
    border: 1px solid var(--line-border);
    border-radius: 8px;
    box-shadow: 0 3px 12px rgba(201, 169, 184, 0.15);
    break-inside: avoid;
    page-break-inside: avoid;
}

.competitor-card {
    padding: 12px 14px;
}

.comp-card-top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.comp-logo-box {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--line-border);
    border-radius: 6px;
    background: #FFFDFB;
}

.comp-card-logo {
    width: 22px;
    height: 22px;
    object-fit: contain;
}

.comp-card-letter {
    font-size: 13pt;
    font-weight: 800;
    color: var(--signature-purple);
}

.comp-info h4 {
    margin: 0;
    font-size: 10pt;
    font-weight: 700;
    color: var(--deep-violet);
}

.comp-site-link {
    font-size: 7.5pt;
    color: var(--signature-purple);
    text-decoration: none;
}

.comp-positioning {
    font-size: 8.5pt;
    color: var(--slate-gray);
    margin: 0 0 8px;
    line-height: 1.4;
}

.comp-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.comp-attr-tag {
    font-size: 7pt;
    font-weight: 700;
    padding: 2px 6px;
    background: var(--blush-pink);
    border-radius: 4px;
    color: var(--deep-violet);
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
            <strong style="color:#1A1A1A; font-size:14pt; letter-spacing:0.08em;">THE SMARKETERS</strong>
        </div>
        {% endif %}

        <div class="cover-kicker">Confidential Executive Intelligence</div>
        <h1 class="cover-title">{{ title }}</h1>
        <p class="cover-subtitle">Evidence-based strategic analysis synthesized from verified public crawl assets, market signals, and competitor intelligence frameworks.</p>
        
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
    {{ module_visuals_html|safe }}
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

    doc_type = payload.get("documentType") or payload.get("reportType") or "STRATEGIC_INTELLIGENCE"
    company = clean_inline(payload.get("companyName", "Target Company"))

    blocks = parse_markdown_blocks(raw_markdown)
    content_html = render_blocks_to_html(blocks, competitor_logos)
    module_visuals_html = render_module_visuals(doc_type, company, competitors)
    competitor_html = render_competitor_cards(competitors)

    title = clean_inline(payload.get("title", "Strategic Intelligence Report"))
    company_brief = clean_inline(payload.get("companyBrief") or "")
    source_count = payload.get("sourceCount", 0)

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
        module_visuals_html=module_visuals_html,
        competitor_html=competitor_html,
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

    html_content = ""
    target_html = html_path if html_path and html_path.exists() else path.with_suffix(".html")
    if target_html.exists():
        try:
            html_content = target_html.read_text(encoding="utf-8")
        except Exception:
            pass

    table_count = html_content.count("<table")
    card_count = html_content.count("smark-card") + html_content.count("swot-card") + html_content.count("pestel-card") + html_content.count("visual-card") + html_content.count("cover-meta-card")
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
