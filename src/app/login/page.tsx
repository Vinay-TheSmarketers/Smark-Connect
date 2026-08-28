import { redirect } from "next/navigation";
import { AuthPage } from "@/components/auth-page";
import { currentUser } from "@/lib/auth-helpers";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  return <AuthPage mode="login" />;
}
