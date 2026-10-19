"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { LogOut } from "lucide-react";
import { useToast } from "./toast";
import { isValidBdPhone } from "@/lib/orders/validation-client";

/** লগইন/রেজিস্ট্রেশন ট্যাব ফর্ম — কাস্টমার অ্যাকাউন্ট (ঐচ্ছিক) */
export function AccountAuthForm() {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidBdPhone(phone)) {
      setError("সঠিক বাংলাদেশি মোবাইল নম্বর দিন");
      return;
    }
    if (password.length < (mode === "register" ? 8 : 1)) {
      setError(mode === "register" ? "পাসওয়ার্ড কমপক্ষে ৮ অক্ষর" : "পাসওয়ার্ড দিন");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/account/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "কিছু একটা সমস্যা হয়েছে।");
        return;
      }
      toast(mode === "login" ? "লগইন সফল" : "অ্যাকাউন্ট তৈরি হয়েছে", "success");
      router.refresh();
    } catch {
      setError("নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="stack stack-sm">
      <div className="tabs" role="tablist" aria-label="অ্যাকাউন্ট">
        <button
          type="button"
          className="tab"
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => setMode("login")}
        >
          লগইন
        </button>
        <button
          type="button"
          className="tab"
          role="tab"
          aria-selected={mode === "register"}
          onClick={() => setMode("register")}
        >
          নতুন অ্যাকাউন্ট
        </button>
      </div>

      {mode === "register" ? (
        <label className="field">
          <span className="label">নাম</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
      ) : null}

      <label className="field">
        <span className="label">মোবাইল নম্বর</span>
        <input
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
          inputMode="numeric"
          autoComplete="tel"
        />
      </label>

      <label className="field">
        <span className="label">পাসওয়ার্ড</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>

      {error ? <p className="error-text">{error}</p> : null}

      <button type="submit" className="btn btn-block" disabled={submitting}>
        {mode === "login" ? <LogIn aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
        {mode === "login" ? "লগইন করুন" : "অ্যাকাউন্ট খুলুন"}
      </button>
    </form>
  );
}

export function AccountLogoutButton() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void fetch("/api/account/logout", { method: "POST" })
          .then(() => {
            toast("লগআউট হয়েছে", "success");
            router.refresh();
          })
          .catch(() => toast("লগআউট করা যায়নি", "error"))
          .finally(() => setBusy(false));
      }}
    >
      <LogOut aria-hidden="true" />
      লগআউট
    </button>
  );
}
