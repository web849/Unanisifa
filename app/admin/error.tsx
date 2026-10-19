"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * অ্যাডমিন এরর বাউন্ডারি।
 *
 * সার্ভারে কোনো অপ্রত্যাশিত এরর হলে Next-এর ডিফল্ট "Application error:
 * a server-side exception has occurred" পেজের বদলে ব্যবহারকারী একটি
 * বোধগম্য স্ক্রিন ও "Try again" বাটন পাবে। প্রোডাকশনে আসল এরর মেসেজ
 * লুকানো থাকে — শুধু digest দেখানো হয়, যা দিয়ে Vercel লগে এরর খুঁজে
 * পাওয়া যায়।
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] unexpected server error", error);
  }, [error]);

  return (
    <div className="admin-root admin-login">
      <div className="admin-login-card">
        <div className="pending-note mb-4" role="alert">
          <AlertTriangle aria-hidden="true" />
          <span>Admin panel could not load.</span>
        </div>

        <h1 className="display" style={{ fontSize: "1.35rem" }}>
          Something went wrong
        </h1>
        <p className="text-muted">
          The server hit an unexpected error while loading this page. Try again — if it keeps
          happening, share the digest below with the developer so it can be found in the server logs.
        </p>

        {error.digest ? (
          <p className="text-small text-muted">
            Digest: <span className="mono">{error.digest}</span>
          </p>
        ) : null}

        <div className="stack stack-sm">
          <button type="button" className="btn btn-emerald btn-block" onClick={() => reset()}>
            <RotateCcw aria-hidden="true" />
            Try again
          </button>
          <Link className="btn btn-outline btn-block" href="/admin">
            Back to dashboard
          </Link>
          <Link className="btn btn-ghost btn-block" href="/">
            View store
          </Link>
        </div>
      </div>
    </div>
  );
}
