"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { adminNavGroups, type AdminNavCounts } from "./admin-nav";
import { DEFAULT_BRAND } from "@/lib/config";

export function AdminShellClient({
  counts,
  sessionName,
  sessionRole,
}: {
  counts: AdminNavCounts;
  sessionName: string;
  sessionRole: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // নেভিগেশন এখানেই তৈরি হয় — Server Component থেকে আইকন (ফাংশন) প্রপ হিসেবে
  // পাঠানো যায় না, তাই ক্লায়েন্টেই কনফিগ থেকে গ্রুপ বানানো হয়।
  const groups = adminNavGroups(counts);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        className="icon-btn admin-mobile-toggle"
        style={{ position: "fixed", top: 10, left: 10, zIndex: 110 }}
        aria-label="Toggle navigation"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>

      {open ? <div className="drawer-backdrop" onClick={() => setOpen(false)} aria-hidden="true" /> : null}

      <aside className="admin-sidebar" data-open={open} aria-label="Admin navigation">
        <Link href="/admin" className="admin-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.svg" alt="" width={34} height={34} />
          <span>
            <span className="admin-brand-name">{DEFAULT_BRAND.name}</span>
            <span className="admin-brand-sub">Admin</span>
          </span>
        </Link>

        {groups.map((group) => (
          <nav className="admin-nav-group" key={group.title} aria-label={group.title}>
            <p className="admin-nav-title">{group.title}</p>
            {group.items.map((item) => {
              const active =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  className="admin-nav-link"
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon aria-hidden="true" />
                  {item.label}
                  {item.badge ? <span className="admin-nav-badge">{item.badge}</span> : null}
                </Link>
              );
            })}
          </nav>
        ))}

        <div style={{ marginTop: "auto" }} className="stack stack-sm">
          <p className="text-small" style={{ color: "var(--sage)", padding: "0 12px" }}>
            {sessionName} · <span style={{ textTransform: "capitalize" }}>{sessionRole}</span>
          </p>
          <button type="button" className="admin-nav-link" onClick={logout} style={{ width: "100%" }}>
            <LogOut aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
