export type PageSpeedResult = {
  strategy: "mobile" | "desktop";
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  lcp: number | null;
  fcp: number | null;
  tbt: number | null;
  cls: number | null;
  source: string;
};

function score(value: unknown): number | null {
  return typeof value === "number" ? Math.round(value * 100) : null;
}

async function runLocalLighthouse(websiteUrl: string, strategy: "mobile" | "desktop"): Promise<PageSpeedResult> {
  const [{ default: lighthouse }, chromeLauncher] = await Promise.all([import("lighthouse"), import("chrome-launcher")]);
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
  try {
    const desktop = strategy === "desktop";
    const result = await lighthouse(websiteUrl, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      formFactor: desktop ? "desktop" : "mobile",
      screenEmulation: desktop ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false } : undefined,
    });
    const lhr = result?.lhr;
    if (!lhr) throw new Error("Local Lighthouse returned no result.");
    return {
      strategy,
      performance: score(lhr.categories.performance?.score),
      accessibility: score(lhr.categories.accessibility?.score),
      bestPractices: score(lhr.categories["best-practices"]?.score),
      seo: score(lhr.categories.seo?.score),
      lcp: lhr.audits["largest-contentful-paint"]?.numericValue ?? null,
      fcp: lhr.audits["first-contentful-paint"]?.numericValue ?? null,
      tbt: lhr.audits["total-blocking-time"]?.numericValue ?? null,
      cls: lhr.audits["cumulative-layout-shift"]?.numericValue ?? null,
      source: "Local Lighthouse headless-browser audit",
    };
  } finally {
    await chrome.kill();
  }
}

export async function runPageSpeed(websiteUrl: string, strategy: "mobile" | "desktop"): Promise<PageSpeedResult> {
  const url = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  url.searchParams.set("url", websiteUrl);
  url.searchParams.set("strategy", strategy);
  for (const category of ["performance", "accessibility", "best-practices", "seo"]) url.searchParams.append("category", category);
  if (process.env.GOOGLE_PAGESPEED_API_KEY) url.searchParams.set("key", process.env.GOOGLE_PAGESPEED_API_KEY);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    const data = await response.json() as { error?: { message?: string }; lighthouseResult?: { categories?: Record<string, { score?: number }>; audits?: Record<string, { numericValue?: number }> } };
    if (!response.ok || data.error) throw new Error(data.error?.message ?? `PageSpeed returned HTTP ${response.status}.`);
    const result = data.lighthouseResult;
    if (!result) throw new Error("PageSpeed returned no Lighthouse result.");
    return {
      strategy,
      performance: score(result.categories?.performance?.score),
      accessibility: score(result.categories?.accessibility?.score),
      bestPractices: score(result.categories?.["best-practices"]?.score),
      seo: score(result.categories?.seo?.score),
      lcp: result.audits?.["largest-contentful-paint"]?.numericValue ?? null,
      fcp: result.audits?.["first-contentful-paint"]?.numericValue ?? null,
      tbt: result.audits?.["total-blocking-time"]?.numericValue ?? null,
      cls: result.audits?.["cumulative-layout-shift"]?.numericValue ?? null,
      source: "Google PageSpeed Insights API v5",
    };
  } catch (error) {
    const officialError = error instanceof Error && error.name === "AbortError" ? "PageSpeed Insights timed out." : error instanceof Error ? error.message : "PageSpeed Insights failed.";
    try {
      return await runLocalLighthouse(websiteUrl, strategy);
    } catch (localError) {
      throw new Error(`${officialError} Local Lighthouse fallback also failed: ${localError instanceof Error ? localError.message : "unknown error"}`);
    }
  } finally {
    clearTimeout(timer);
  }
}
