import { load } from "cheerio";
import { assertPublicUrl } from "./url-safety";

export type CrawledPage = {
  url: string;
  title: string;
  description: string;
  content: string;
  statusCode: number;
  wordCount: number;
  links: string[];
};

const pageHints = ["about", "product", "service", "solution", "platform", "pricing", "customer", "case-stud", "feature", "industry", "resource", "blog", "insight", "guide", "use-case", "faq"];
const excludedHints = ["/login", "/sign-in", "/signup", "/cart", "/checkout", "/privacy", "/terms", "/cookie", "/author/", "/tag/", "/wp-admin"];

async function fetchWithSafeRedirects(initial: URL): Promise<Response> {
  let current = initial;
  for (let redirect = 0; redirect < 5; redirect += 1) {
    await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(current, {
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers: { "User-Agent": "SmarkConnectAuditBot/1.0 (+https://smarkconnect.local)", Accept: "text/html,application/xhtml+xml" },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("The website returned an invalid redirect.");
        current = new URL(location, current);
        continue;
      }
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("The website took too long to respond.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("The website redirected too many times.");
}

export async function crawlPage(url: URL): Promise<CrawledPage> {
  const response = await fetchWithSafeRedirects(url);
  if (!response.ok) throw new Error(`The website returned HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("The URL did not return an HTML page.");
  const html = (await response.text()).slice(0, 2_000_000);
  const $ = load(html);
  const links = $("a[href]").map((_, element) => {
    try { return new URL($(element).attr("href")!, response.url || url).href; } catch { return null; }
  }).get().filter((link): link is string => Boolean(link));
  $("script, style, noscript, svg, canvas, iframe, template, nav, footer").remove();
  const title = $("title").first().text().replace(/\s+/g, " ").trim();
  const description = $('meta[name="description"]').attr("content")?.replace(/\s+/g, " ").trim() ?? "";
  const root = $("main").first().length ? $("main").first() : $("body").first();
  const content = root.text().replace(/\s+/g, " ").trim().slice(0, 30_000);
  return { url: response.url || url.href, title, description, content, statusCode: response.status, wordCount: content ? content.split(/\s+/).length : 0, links };
}

function normalizedCandidate(href: string, origin: string): string | null {
  try {
    const url = new URL(href);
    url.hash = "";
    if (url.origin !== origin || /\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|mp4|mp3|xml)(?:$|\?)/i.test(url.href)) return null;
    if (excludedHints.some((hint) => url.pathname.toLowerCase().includes(hint))) return null;
    return url.href.replace(/\/$/, "") || `${origin}/`;
  } catch {
    return null;
  }
}

function candidateScore(href: string): number {
  const pathname = new URL(href).pathname.toLowerCase();
  return pageHints.reduce((total, hint) => total + (pathname.includes(hint) ? 3 : 0), 0) - pathname.split("/").length * 0.15 - (pathname.match(/\d{4}/) ? 1 : 0);
}

async function discoverSitemapUrls(origin: string): Promise<string[]> {
  const sitemap = new URL("/sitemap.xml", origin);
  try {
    const response = await fetchWithSafeRedirects(sitemap);
    if (!response.ok) return [];
    const xml = (await response.text()).slice(0, 4_000_000);
    const $ = load(xml, { xmlMode: true });
    const locations = $("loc").map((_, element) => $(element).text().trim()).get().filter(Boolean);
    const nested = locations.filter((value) => /\.xml(?:$|\?)/i.test(value)).slice(0, 8);
    const pageLocations = locations.filter((value) => !/\.xml(?:$|\?)/i.test(value));
    const nestedResults = await Promise.allSettled(nested.map(async (value) => {
      const nestedUrl = new URL(value, origin);
      if (nestedUrl.origin !== origin) return [];
      const nestedResponse = await fetchWithSafeRedirects(nestedUrl);
      if (!nestedResponse.ok) return [];
      const nestedXml = (await nestedResponse.text()).slice(0, 4_000_000);
      const parsed = load(nestedXml, { xmlMode: true });
      return parsed("loc").map((_, element) => parsed(element).text().trim()).get().filter((location) => location && !/\.xml(?:$|\?)/i.test(location));
    }));
    return [...pageLocations, ...nestedResults.flatMap((result) => result.status === "fulfilled" ? result.value : [])];
  } catch {
    return [];
  }
}

export async function crawlWebsite(input: URL, maxPages = 48, onProgress?: (pagesRead: number, target: number) => Promise<void>): Promise<CrawledPage[]> {
  const home = await crawlPage(input);
  if (home.wordCount < 25) throw new Error("The homepage did not contain enough readable text. This site may require browser rendering.");
  const origin = new URL(home.url).origin;
  const results: CrawledPage[] = [home];
  const seen = new Set<string>([normalizedCandidate(home.url, origin) ?? home.url]);
  const queued = new Set<string>();
  const queue: string[] = [];
  const enqueue = (hrefs: string[]) => {
    for (const href of hrefs) {
      const candidate = normalizedCandidate(href, origin);
      if (!candidate || seen.has(candidate) || queued.has(candidate)) continue;
      queued.add(candidate);
      queue.push(candidate);
    }
    queue.sort((a, b) => candidateScore(b) - candidateScore(a));
  };

  enqueue(home.links);
  enqueue(await discoverSitemapUrls(origin));
  await onProgress?.(results.length, maxPages);

  while (queue.length && results.length < maxPages) {
    const batch = queue.splice(0, Math.min(6, maxPages - results.length));
    batch.forEach((href) => { queued.delete(href); seen.add(href); });
    const settled = await Promise.allSettled(batch.map((href) => crawlPage(new URL(href))));
    for (const result of settled) {
      if (result.status !== "fulfilled" || result.value.wordCount < 20) continue;
      results.push(result.value);
      enqueue(result.value.links);
    }
    await onProgress?.(results.length, maxPages);
  }
  return results.slice(0, maxPages);
}
