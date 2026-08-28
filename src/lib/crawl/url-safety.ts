import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

const blockedHostnames = new Set(["localhost", "localhost.localdomain", "0.0.0.0"]);

function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) || parts[0] >= 224;
}

function isPrivateIPv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("::ffff:127.") || normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.");
}

export function normalizeWebsiteUrl(input: string): URL {
  const trimmed = input.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) throw new Error("Only public HTTP or HTTPS website URLs are allowed.");
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(candidate);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Only public HTTP or HTTPS website URLs are allowed.");
  if (url.username || url.password) throw new Error("Website URLs cannot contain credentials.");
  url.hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  url.hash = "";
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
  if (!url.pathname) url.pathname = "/";
  return url;
}

export async function assertPublicUrl(input: string | URL): Promise<URL> {
  const url = input instanceof URL ? input : normalizeWebsiteUrl(input);
  if (blockedHostnames.has(url.hostname) || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) throw new Error("Private network addresses cannot be audited.");
  if (isIP(url.hostname)) {
    if ((isIP(url.hostname) === 4 && isPrivateIPv4(url.hostname)) || (isIP(url.hostname) === 6 && isPrivateIPv6(url.hostname))) throw new Error("Private network addresses cannot be audited.");
    return url;
  }
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("The website hostname could not be resolved.");
  if (addresses.some(({ address, family }) => family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address))) throw new Error("The website resolves to a private network address and cannot be audited.");
  return url;
}

export function normalizedDomain(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}
