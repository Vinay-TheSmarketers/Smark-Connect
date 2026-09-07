import "server-only";

import { load } from "cheerio";
import { assertPublicUrl } from "@/lib/crawl/url-safety";

const MAX_LOGO_BYTES = 2_000_000;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"]);

async function fetchPublicUrl(initial: URL, accept: string): Promise<Response> {
  let current = initial;
  for (let redirect = 0; redirect < 5; redirect += 1) {
    await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(current, {
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "SmarkConnectLogoBot/1.0 (+https://smarkconnect.local)", Accept: accept },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("The logo source returned an invalid redirect.");
        current = new URL(location, current);
        continue;
      }
      return response;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("The logo source redirected too many times.");
}

function iconCandidates(html: string, baseUrl: string): string[] {
  const $ = load(html);
  const scored = $("link[href]").map((_, element) => {
    const rel = ($(element).attr("rel") ?? "").toLowerCase();
    if (!rel.includes("icon")) return null;
    const href = $(element).attr("href");
    if (!href) return null;
    const sizes = $(element).attr("sizes") ?? "";
    const largestSize = Math.max(0, ...Array.from(sizes.matchAll(/(\d+)x\d+/gi), (match) => Number(match[1])));
    const score = (rel.includes("apple-touch-icon") ? 500 : 0) + (rel.includes("shortcut") ? 50 : 100) + Math.min(largestSize, 400);
    try { return { url: new URL(href, baseUrl).href, score }; } catch { return null; }
  }).get().filter((item): item is { url: string; score: number } => Boolean(item));
  const socialLogo = $('meta[property="og:logo"], meta[name="logo"]').first().attr("content");
  if (socialLogo) {
    try { scored.push({ url: new URL(socialLogo, baseUrl).href, score: 900 }); } catch { /* Ignore malformed metadata. */ }
  }
  return [...new Set(scored.sort((a, b) => b.score - a.score).map((item) => item.url))];
}

function normalizedImageType(response: Response): string | null {
  const type = (response.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
  return IMAGE_TYPES.has(type) ? type : null;
}

export async function discoverCompanyLogo(websiteUrl: URL): Promise<string | null> {
  const homepage = await fetchPublicUrl(websiteUrl, "text/html,application/xhtml+xml");
  if (!homepage.ok) return null;
  const contentType = homepage.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) return null;
  const html = (await homepage.text()).slice(0, 2_000_000);
  const resolvedHome = homepage.url || websiteUrl.href;
  const origin = new URL(resolvedHome).origin;
  const candidates = [...iconCandidates(html, resolvedHome), new URL("/apple-touch-icon.png", origin).href, new URL("/favicon.ico", origin).href];

  for (const candidate of [...new Set(candidates)].slice(0, 10)) {
    try {
      const response = await fetchPublicUrl(new URL(candidate), "image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.5");
      const length = Number(response.headers.get("content-length") ?? 0);
      if (response.ok && normalizedImageType(response) && (!length || length <= MAX_LOGO_BYTES)) {
        await response.body?.cancel();
        return response.url || candidate;
      }
      await response.body?.cancel();
    } catch { /* Try the next website-provided icon. */ }
  }
  return null;
}

export async function fetchCompanyLogoAsset(logoUrl: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  if (logoUrl.startsWith("data:")) {
    const match = logoUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/);
    if (!match) return null;
    const contentType = match[1] || "image/png";
    const isBase64 = Boolean(match[2]);
    const rawData = match[3];
    const buffer = isBase64 ? Buffer.from(rawData, "base64") : Buffer.from(decodeURIComponent(rawData), "utf8");
    if (!buffer.byteLength || buffer.byteLength > MAX_LOGO_BYTES) return null;
    return { body: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), contentType };
  }
  const response = await fetchPublicUrl(new URL(logoUrl), "image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.5");
  const contentType = normalizedImageType(response);
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (!response.ok || !contentType || declaredLength > MAX_LOGO_BYTES) return null;
  const body = await response.arrayBuffer();
  if (!body.byteLength || body.byteLength > MAX_LOGO_BYTES) return null;
  return { body, contentType };
}
