import { requireApiUser } from "@/lib/auth-helpers";
import { discoverCompanyLogo, fetchCompanyLogoAsset } from "@/lib/company-logo";
import { db } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ companyId: string }> }) {
  const user = await requireApiUser();
  if (!user) return new Response(null, { status: 401 });
  const { companyId } = await context.params;
  const company = await db.company.findFirst({ where: { id: companyId, userId: user.id }, select: { id: true, websiteUrl: true, logoUrl: true } });
  if (!company) return new Response(null, { status: 404 });

  let logoUrl = company.logoUrl;
  if (!logoUrl) {
    logoUrl = await discoverCompanyLogo(new URL(company.websiteUrl)).catch(() => null);
    if (logoUrl) await db.company.update({ where: { id: company.id }, data: { logoUrl } });
  }
  if (!logoUrl) return new Response(null, { status: 404, headers: { "Cache-Control": "private, max-age=300" } });

  const asset = await fetchCompanyLogoAsset(logoUrl).catch(() => null);
  if (!asset) return new Response(null, { status: 404, headers: { "Cache-Control": "private, max-age=300" } });
  return new Response(asset.body, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
