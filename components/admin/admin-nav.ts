import {
  BadgePercent,
  BarChart3,
  Bell,
  CreditCard,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquareQuote,
  Package,
  PackageSearch,
  Plug,
  Rocket,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Tags,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * অ্যাডমিন নেভিগেশন — ক্লায়েন্ট-সেফ মডিউল।
 *
 * এখানে আইকন কম্পোনেন্ট (ফাংশন) থাকে, তাই এই ফাইলটি শুধু ক্লায়েন্ট
 * কম্পোনেন্ট থেকে কল করা যাবে। Server Component থেকে সরাসরি ফাংশন/আইকন
 * ক্লায়েন্ট কম্পোনেন্টে প্রপ হিসেবে পাঠানো যায় না — RSC সিরিয়ালাইজেশনে
 * "Functions cannot be passed directly to Client Components" এরর হয়।
 * সেই কারণেই নেভিগেশন এখানে তৈরি হয়, `AdminShell`-এ নয়।
 */

export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number };
export type NavGroup = { title: string; items: NavItem[] };
export type AdminNavCounts = { orders?: number; reviews?: number; fraud?: number };

/** স্পেক ৭ড অনুযায়ী নেভিগেশন — রিটার্গেটিং মেনু নেই, কোথাও থাকবে না। */
export function adminNavGroups(counts: AdminNavCounts): NavGroup[] {
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
