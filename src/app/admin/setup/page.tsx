import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/admin-api";
import { isSetupComplete } from "@/lib/auth";
import { SetupForm } from "@/components/admin/SetupForm";

export default async function AdminSetupPage() {
  if (await isSetupComplete()) {
    const user = await getAuthUser();
    redirect(user ? "/admin" : "/admin/login");
  }
  return <SetupForm />;
}
