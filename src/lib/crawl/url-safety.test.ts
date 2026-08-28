import { describe, expect, it } from "vitest";
import { normalizeWebsiteUrl, normalizedDomain } from "./url-safety";

describe("normalizeWebsiteUrl", () => {
  it("adds https and normalizes the hostname", () => {
    const url = normalizeWebsiteUrl("WWW.Example.COM");
    expect(url.href).toBe("https://www.example.com/");
    expect(normalizedDomain(url)).toBe("example.com");
  });

  it("rejects non-web protocols and embedded credentials", () => {
    expect(() => normalizeWebsiteUrl("file:///etc/passwd")).toThrow();
    expect(() => normalizeWebsiteUrl("https://user:pass@example.com")).toThrow();
  });
});
