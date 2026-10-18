import Link from "next/link";
import {
  BadgePercent,
  BarChart3,
  CreditCard,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Bell,
  Package,
  PackageSearch,
  Plug,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Store,
  Tags,
  Truck,
  Users,
  MessageSquareQuote,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { AdminShellClient } from "./admin-shell-client";
import type { AdminSession } from "@/lib/auth/session";
import { DEFAULT_BRAND } from "@/lib/config";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number };
type NavGroup = { title: string; items: NavItem[] };

/**
 * অ্যাডমিন নেভিগেশন — স্পেক ৭ড অনুযায়ী।
 * রিটার্গেটিং মেনু নেই — কোথাও থাকবে না।
 */
export function adminNavGroups(counts: { orders?: number; reviews?: number; fraud?: number }): NavGroup[] {
  return [
    {
      title: "Store",
      items: [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/products", label: "Products", icon: Package },
        { href: "/admin/categories", label: "Categories", icon: Tags },
        { href: "/admin/banners", label: "Banners", icon: ImageIcon },
        { href: "/admin/landing-pages", label: "Landing Pages", icon: Rocket },
        { href: "/admin/orders", label: "Orders", icon: ShoppingBag, badge: counts.orders },
        { href: "/admin/abandoned", label: "Abandoned", icon: PackageSearch },
        { href: "/admin/popups", label: "Popups", icon: MessageSquareQuote },
        { href: "/admin/coupons", label: "Coupons", icon: BadgePercent },
        { href: "/admin/reviews", label: "Reviews", icon: Users, badge: counts.reviews },
        { href: "/admin/leads", label: "Leads", icon: Users },
      ],
    },
    {
      title: "System",
      items: [
        { href: "/admin/reports", label: "Reports", icon: BarChart3 },
        { href: "/admin/fraud", label: "Fraud & IPs", icon: ShieldAlert, badge: counts.fraud },
        { href: "/admin/payments", label: "Payments", icon: CreditCard },
        { href: "/admin/couriers", label: "Couriers", icon: Truck },
        { href: "/admin/storage", label: "Storage (R2)", icon: ImageIcon },
        { href: "/admin/pages", label: "Pages", icon: FileText },
        { href: "/admin/notifications", label: "Notifications", icon: Bell },
        { href: "/admin/integrations", label: "Integrations", icon: Plug },
        { href: "/admin/settings", label: "Settings", icon: Settings },
        { href: "/admin/audit", label: "Audit log", icon: ShieldAlert },
      ],
    },
  ];
}

export function AdminShell({
  session,
  counts,
  children,
  title,
  subtitle,
}: {
  session: AdminSession;
  counts: { orders?: number; reviews?: number; fraud?: number };
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const groups = adminNavGroups(counts);

  return (
    <div className="admin-root">
      <div className="admin-layout">
        <AdminShellClient groups={groups} sessionName={session.name} sessionRole={session.role} />
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
