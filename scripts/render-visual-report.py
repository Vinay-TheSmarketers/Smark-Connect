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
