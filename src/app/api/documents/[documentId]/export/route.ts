import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { createBrandedDocx } from "@/lib/documents/docx";
import { createBrandedHtml, createBrandedPdf } from "@/lib/documents/pdf";
import { createBrandedXlsx } from "@/lib/documents/xlsx";
import type { VisualReportCompetitor } from "@/lib/documents/pdf";
import { safeFilename } from "@/lib/documents/content";
import { fetchCompanyLogoAsset } from "@/lib/company-logo";
import { CORE_DOCUMENTS } from "@/lib/skills/registry";

export const runtime = "nodejs";

type ReportMetadata = { sources?: unknown[]; competitors?: VisualReportCompetitor[] };

async function reportCompetitors(metadata: ReportMetadata): Promise<VisualReportCompetitor[]> {
  const competitors = Array.isArray(metadata.competitors) ? metadata.competitors.slice(0, 10) : [];
  return Promise.all(competitors.map(async (competitor) => {
    if (!competitor.logoUrl) return competitor;
    try {
      const asset = await fetchCompanyLogoAsset(competitor.logoUrl);
      return asset ? { ...competitor, logoDataUrl: `data:${asset.contentType};base64,${Buffer.from(asset.body).toString("base64")}` } : competitor;
    } catch { return competitor; }
  }));
}

export async function GET(request: Request, context: { params: Promise<{ documentId: string }> }) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to export documents." }, { status: 401 });
  const { documentId } = await context.params;
  const document = await db.document.findFirst({ where: { id: documentId, company: { userId: user.id } }, include: { company: true } });
  if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
  const url = new URL(request.url);
  const requestedFormat = url.searchParams.get("format");
  const format = requestedFormat === "docx" || requestedFormat === "html" || requestedFormat === "xlsx" ? requestedFormat : "pdf";
  const disposition = url.searchParams.get("preview") === "1" ? "inline" : "attachment";
  const metadata = (document.metadata as ReportMetadata | null) ?? {};
  const coreOrder = new Map(CORE_DOCUMENTS.map((definition, index) => [definition.type, index]));
  const siblingDocuments = format === "docx" ? [] : await db.document.findMany({ where: { companyId: document.companyId }, orderBy: { updatedAt: "desc" } });
  const coreDocuments = siblingDocuments.filter((item) => coreOrder.has(item.type)).sort((left, right) => (coreOrder.get(left.type) ?? 99) - (coreOrder.get(right.type) ?? 99));
  const modules = await Promise.all(coreDocuments.map(async (item) => {
    const itemMetadata = (item.metadata as ReportMetadata | null) ?? {};
    return { type: item.type, title: item.title, markdown: item.contentMarkdown, competitors: item.type === "COMPETITOR_ANALYSIS" ? await reportCompetitors(itemMetadata) : [] };
  }));
  const args = { companyName: document.company.name, title: modules.length > 1 ? "Strategic Intelligence Report" : document.title, markdown: document.contentMarkdown, updatedAt: document.updatedAt, sourceCount: modules.length > 1 ? coreDocuments.reduce((total, item) => { const itemMetadata = (item.metadata as ReportMetadata | null) ?? {}; return total + (Array.isArray(itemMetadata.sources) ? itemMetadata.sources.length : 0); }, 0) : Array.isArray(metadata.sources) ? metadata.sources.length : 0, modules: modules.length > 1 ? modules : undefined };
  const body = format === "docx" ? await createBrandedDocx(args) : format === "xlsx" ? await createBrandedXlsx(args) : format === "html" ? await createBrandedHtml(args) : await createBrandedPdf(args);
  const extension = format;
  const contentType = format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : format === "html" ? "text/html; charset=utf-8" : "application/pdf";
  return new Response(new Uint8Array(body), { headers: { "Content-Type": contentType, "Content-Disposition": `${disposition}; filename="${safeFilename(`${document.company.name}-${document.title}`)}.${extension}"`, "Cache-Control": "private, no-store" } });
}
