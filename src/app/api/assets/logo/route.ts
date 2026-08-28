import { requireApiUser } from "@/lib/auth-helpers";
import { fetchCompanyLogoAsset } from "@/lib/company-logo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to view logo assets." }, { status: 401 });
  const url = new URL(request.url).searchParams.get("url")?.trim();
  if (!url) return Response.json({ error: "A logo URL is required." }, { status: 400 });
  try {
    const asset = await fetchCompanyLogoAsset(url);
    if (!asset) return Response.json({ error: "The official logo could not be loaded." }, { status: 404 });
    return new Response(new Uint8Array(asset.body), { headers: { "Content-Type": asset.contentType, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ error: "The official logo could not be loaded." }, { status: 404 });
  }
}
