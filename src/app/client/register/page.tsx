import { redirect } from "next/navigation";
import { AdminToastProvider } from "@/components/admin/AdminToast";
import { ClientAuthForm } from "@/components/client/ClientAuthForm";
import { getClientUser } from "@/lib/client-auth";
import { isSupabaseAuthConfigured } from "@/lib/supabase/server";

export default async function ClientRegisterPage() {
  if (!isSupabaseAuthConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-300">
        <p>Client accounts are unavailable until Supabase Auth is configured.</p>
      </main>
    );
  }
  const user = await getClientUser();
  if (user) redirect("/client");

  return (
    <AdminToastProvider>
      <ClientAuthForm mode="register" />
    </AdminToastProvider>
  );
}
