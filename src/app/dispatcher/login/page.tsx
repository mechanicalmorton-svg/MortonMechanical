import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/admin-api";
import { isSetupComplete } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { AdminToastProvider } from "@/components/admin/AdminToast";
import { isSupabaseAuthConfigured } from "@/lib/supabase/server";

export default async function DispatcherLoginPage() {
  if (!isSupabaseAuthConfigured() && !(await isSetupComplete())) redirect("/admin/setup");
  const user = await getAuthUser();
  if (user) redirect("/admin");
  return (
    <AdminToastProvider>
      <LoginForm useEmailLogin={isSupabaseAuthConfigured()} portal="dispatcher" />
    </AdminToastProvider>
  );
}
