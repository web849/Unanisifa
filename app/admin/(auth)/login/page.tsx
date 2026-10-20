import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isDatabaseConfigured } from "@/lib/db";
import { getBrand } from "@/lib/store/repository";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const brand = await getBrand();
  const customLogo = (brand.logoUrl || brand.logoLightUrl || "").trim();

  return (
    <div className="admin-root admin-login">
      <div className="admin-login-card">
        <div className="text-center mb-4">
          {customLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={customLogo}
              alt={brand.name}
              style={{
                height: 52,
                width: "auto",
                maxWidth: 220,
                objectFit: "contain",
                margin: "0 auto 12px",
                display: "block",
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brand/mark.svg" alt="" width={56} height={56} style={{ margin: "0 auto 12px" }} />
          )}
          <h1 className="display" style={{ fontSize: "1.5rem" }}>
            {brand.name}
          </h1>
          <p className="text-muted text-small mb-0">Admin Dashboard</p>
        </div>

        {!isDatabaseConfigured ? (
          <div className="pending-note mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>
              Pending — database not configured. Set <span className="mono">DATABASE_URL</span>, then run{" "}
              <span className="mono">npm run db:migrate</span> and{" "}
              <span className="mono">npm run db:seed</span> to create the owner account.
            </span>
          </div>
        ) : null}

        <AdminLoginForm disabled={!isDatabaseConfigured} />
      </div>
    </div>
  );
}
