import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { getAuthUser } from "@/lib/admin-api";
import { isSetupComplete } from "@/lib/auth";
import { isSupabaseAuthConfigured } from "@/lib/supabase/server";

export default async function AdminPage() {
  if (!isSupabaseAuthConfigured() && !(await isSetupComplete())) redirect("/admin/setup");
  const user = await getAuthUser();
  if (!user) redirect("/admin/login");
  return <AdminDashboard user={user} />;
}
