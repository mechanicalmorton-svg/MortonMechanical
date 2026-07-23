import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/admin-api";
import { isSetupComplete } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function AdminLoginPage() {
  if (!(await isSetupComplete())) redirect("/admin/setup");
  const user = await getAuthUser();
  if (user) redirect("/admin");
  return <LoginForm />;
}
