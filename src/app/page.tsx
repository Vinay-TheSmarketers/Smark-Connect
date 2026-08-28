import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.llmVerifiedAt) redirect("/onboarding/ai");
  const company = await db.company.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, include: { auditJobs: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!company) redirect("/onboarding/company");
  if (company.status !== "ACTIVE" && company.auditJobs[0]) redirect(`/onboarding/audit/${company.auditJobs[0].id}`);
  redirect(`/dashboard/${company.id}`);
}
