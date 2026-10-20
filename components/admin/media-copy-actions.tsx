"use client";

/**
 * ছবির লিংক / HTML কোড কপি করার বোতাম-সেট।
 *
 *  - "লিংক কপি": পূর্ণ (absolute) URL কপি হয় — R2 public URL থাকলে তাই,
 *    নইলে এই সাইটের /api/media/… লিংক পূর্ণ ঠিকানাসহ।
 *  - "HTML কপি": `<img … />` স্নিপেট কপি হয় — যেকোনো HTML ব্লক/পেজে
 *    পেস্ট করলেই রেসপন্সিভ ছবি দেখায়।
 */

import { useEffect, useRef, useState } from "react";
import { Check, Code2, ExternalLink, Link2 } from "lucide-react";
import { absoluteMediaUrl, imageHtmlSnippet } from "@/lib/media/snippet";

/** clipboard API না থাকলে (http/পুরনো ব্রাউজার) textarea ফলব্যাক দিয়ে কপি */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // নিচের ফলব্যাকে যাবে
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function MediaCopyActions({
  url,
  alt = "",
  compact = false,
  showOpen = true,
}: {
  url: string;
  alt?: string;
  compact?: boolean;
  showOpen?: boolean;
}) {
  const [copied, setCopied] = useState<"link" | "html" | "failed" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!url) return null;

  const markCopied = (kind: "link" | "html" | "failed") => {
    setCopied(kind);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2200);
  };

  const copyLink = async () => {
    const ok = await copyTextToClipboard(absoluteMediaUrl(url));
    markCopied(ok ? "link" : "failed");
  };

  const copyHtml = async () => {
    const ok = await copyTextToClipboard(imageHtmlSnippet(url, alt));
    markCopied(ok ? "html" : "failed");
  };

  return (
    <span className="media-copy-actions">
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => void copyLink()}
        title="ছবির পূর্ণ লিংক কপি করুন"
      >
        {copied === "link" ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        {compact ? (copied === "link" ? "কপি হয়েছে" : "লিংক") : copied === "link" ? "লিংক কপি হয়েছে" : "লিংক কপি"}
      </button>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => void copyHtml()}
        title="HTML <img> কোড কপি করুন — HTML ব্লকে পেস্ট করলেই ছবি দেখাবে"
      >
        {copied === "html" ? <Check aria-hidden="true" /> : <Code2 aria-hidden="true" />}
        {compact ? (copied === "html" ? "কপি হয়েছে" : "HTML") : copied === "html" ? "HTML কপি হয়েছে" : "HTML কপি"}
      </button>
      {showOpen ? (
        <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer" title="ছবিটি নতুন ট্যাবে খুলুন">
          <ExternalLink aria-hidden="true" />
          {compact ? "খুলুন" : "Open"}
        </a>
      ) : null}
      {copied === "failed" ? (
        <span className="error-text text-small" role="alert">
          কপি করা যায়নি — লিংকটি হাতে সিলেক্ট করে কপি করুন
        </span>
      ) : null}
    </span>
  );
}
