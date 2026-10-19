import Link from "next/link";
import { Store } from "lucide-react";
import { AdminShellClient } from "./admin-shell-client";
import type { AdminNavCounts } from "./admin-nav";
import type { AdminSession } from "@/lib/auth/session";
import { DEFAULT_BRAND } from "@/lib/config";

/**
 * অ্যাডমিন শেল — Server Component।
 *
 * এখানে ইচ্ছাকৃতভাবে কোনো আইকন/ফাংশন নেই: ক্লায়েন্ট কম্পোনেন্টে শুধু
 * primitive (string/number) প্রপ যায়। নেভিগেশন ও আইকন `admin-nav.ts`-এ,
 * যা ক্লায়েন্ট কম্পোনেন্ট নিজেই কল করে — নইলে RSC সিরিয়ালাইজেশনে
 * "Functions cannot be passed directly to Client Components" এরর হয়
 * এবং লগইনের পর পুরো অ্যাডমিন পানেল ৫০০ দেয়।
 */
export function AdminShell({
  session,
  counts,
  children,
  title,
  subtitle,
}: {
  session: AdminSession;
  counts: AdminNavCounts;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="admin-root">
      <div className="admin-layout">
        <AdminShellClient counts={counts} sessionName={session.name} sessionRole={session.role} />
        <div className="admin-main">
          <div className="admin-topbar">
            <div style={{ flex: "1 1 auto" }}>
              <h1 className="admin-topbar-title">{title}</h1>
              {subtitle ? <p className="admin-topbar-sub">{subtitle}</p> : null}
            </div>
            <Link className="btn btn-outline btn-sm" href="/" target="_blank">
              <Store aria-hidden="true" />
              View store
            </Link>
          </div>
          <div className="admin-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AdminBrandMark() {
  return (
    <span className="admin-brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-light.svg" alt={DEFAULT_BRAND.name} />
    </span>
  );
}
