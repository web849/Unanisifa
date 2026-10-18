import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";

/**
 * অ্যাডমিন ড্যাশবোর্ড লেআউট — সেশন না থাকলে লগইনে (মিডলওয়্যারও গার্ড করে)।
 */
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <>{children}</>;
}
