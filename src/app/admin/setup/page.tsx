import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/admin-api";
import { isSetupComplete } from "@/lib/auth";
import { SetupForm } from "@/components/admin/SetupForm";
import { isSupabaseAuthConfigured } from "@/lib/supabase/server";

export default async function AdminSetupPage() {
  if (isSupabaseAuthConfigured()) redirect("/admin/login");
  if (await isSetupComplete()) {
    const user = await getAuthUser();
    redirect(user ? "/admin" : "/admin/login");
  }
  return <SetupForm />;
}
