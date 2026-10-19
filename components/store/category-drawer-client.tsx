"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PackageSearch, X } from "lucide-react";
import type { DrawerCategory } from "./category-drawer";
import { categoryIcon } from "./category-icons";

export function CategoryDrawerClient({ categories }: { categories: DrawerCategory[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-label="ক্যাটাগরি মেনু খুলুন"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </button>

      {open ? (
        <>
          <div
            className="drawer-backdrop"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="ক্যাটাগরি তালিকা">
            <div className="drawer-title">
              <strong>ক্যাটাগরি</strong>
              <button
                type="button"
                className="icon-btn"
                aria-label="মেনু বন্ধ করুন"
                onClick={() => setOpen(false)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <nav className="stack stack-sm" aria-label="ক্যাটাগরি">
              <Link className="drawer-link" href="/products" onClick={() => setOpen(false)}>
                <PackageSearch aria-hidden="true" />
                সব পণ্য
              </Link>
              {categories.map((category) => {
                const Icon = categoryIcon(category.icon);
                return (
                  <Link
                    key={category.id}
                    className="drawer-link"
                    href={`/products?category=${category.slug}`}
                    onClick={() => setOpen(false)}
                  >
                    <Icon aria-hidden="true" />
                    {category.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      ) : null}
    </>
  );
}
