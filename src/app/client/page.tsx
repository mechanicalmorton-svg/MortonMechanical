import { redirect } from "next/navigation";
import { AdminToastProvider } from "@/components/admin/AdminToast";
import { ClientPortal } from "@/components/client/ClientPortal";
import { getClientUser } from "@/lib/client-auth";
import { isSupabaseAuthConfigured } from "@/lib/supabase/server";

export default async function ClientHomePage() {
  if (!isSupabaseAuthConfigured()) redirect("/client/login");
  const user = await getClientUser();
  if (!user) redirect("/client/login");

  return (
    <AdminToastProvider>
      <ClientPortal />
    </AdminToastProvider>
  );
}
