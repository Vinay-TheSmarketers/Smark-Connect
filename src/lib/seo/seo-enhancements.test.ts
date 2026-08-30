import { describe, expect, it } from "vitest";
import { analyzeLinkStructure } from "./backlinks";
import { inspectSchemaMarkup } from "./schema-inspector";
import { analyzeGeoCitability } from "./geo-citability";

describe("SEO Backlinks & Link Graph Intelligence", () => {
  const samplePages = [
    {
      url: "https://example.com/",
      title: "Example Home",
      content: `<html><body>
        <h1>Welcome to Example</h1>
        <a href="/pricing">Pricing</a>
        <a href="/features">Features</a>
        <a href="/docs">Docs</a>
        <a href="/blog">Blog</a>
        <a href="/about">About Us</a>
      </body></html>`,
    },
    {
      url: "https://example.com/pricing",
      title: "Pricing Plans",
      content: `<html><body>
        <h1>Plans &amp; Pricing</h1>
        <a href="/">Home</a>
        <a href="/contact">Contact Sales</a>
      </body></html>`,
    },
    {
      url: "https://example.com/features",
      title: "Features Overview",
      content: `<html><body>
        <h1>Features</h1>
        <a href="/">Home</a>
        <a href="/pricing">View Pricing</a>
      </body></html>`,
    },
  ];

  it("extracts internal link graph, hub pages, and Common Crawl rank estimates", () => {
    const result = analyzeLinkStructure("https://example.com", samplePages);
    expect(result.inspectedPages).toBe(3);
    expect(result.totalInternalLinks).toBeGreaterThan(0);
    expect(result.commonCrawl.domain).toBe("example.com");
    expect(result.commonCrawl.crawlPresence).toBe("indexed");
    expect(result.healthScore).toBeGreaterThan(50);
  });
});

describe("Schema.org Inspector & Generator", () => {
  const pagesWithSchema = [
    {
      url: "https://example.com/",
      content: `<html><head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Example Corp",
          "url": "https://example.com"
        }
        </script>
      </head><body><h1>Hello</h1></body></html>`,
    },
  ];

  it("detects valid on-page JSON-LD and generates missing recommended snippets", () => {
    const result = inspectSchemaMarkup(
      { name: "Example Corp", websiteUrl: "https://example.com" },
      pagesWithSchema,
    );
    expect(result.detectedSchemas).toHaveLength(1);
    expect(result.detectedSchemas[0].type).toBe("Organization");
    expect(result.detectedSchemas[0].isValid).toBe(true);
    expect(result.generatedSnippets.WebSite).toContain("https://schema.org");
    expect(result.score).toBeGreaterThanOrEqual(75);
  });
});

describe("GEO & AI Citability Analyzer", () => {
  const pagesWithPassages = [
    {
      url: "https://example.com/guide",
      title: "What is Example Corp",
      content: `<html><body>
        <h2>What is Example Corp?</h2>
        <p>Example Corp is an AI automation platform that helps B2B teams streamline workflows and scale revenue operations effectively.</p>
        <h2>How does it work?</h2>
        <ol>
          <li>Connect data</li>
          <li>Run audit</li>
        </ol>
      </body></html>`,
    },
  ];

  it("extracts direct answer passages and calculates citability readiness", () => {
    const result = analyzeGeoCitability(
      { name: "Example Corp", websiteUrl: "https://example.com", category: "B2B Software" },
      pagesWithPassages,
    );
    expect(result.answerPassages.length).toBeGreaterThan(0);
    expect(result.entitySignals.brandEntityFound).toBe(true);
    expect(result.overallCitabilityScore).toBeGreaterThan(50);
  });
});
