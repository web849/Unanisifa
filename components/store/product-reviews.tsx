"use client";

import { useState } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { useToast } from "./toast";
import { formatDateBangla } from "@/lib/utils";
import { normalizeBdPhone } from "@/lib/orders/validation-client";

type ReviewView = {
  id: number;
  customerName: string;
  rating: number;
  comment: string | null;
  isVerified: boolean;
  createdAt: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-label={`${rating} তারকা`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden="true" className={i > rating ? "stars-muted" : undefined} />
      ))}
    </span>
  );
}

/**
 * রিভিউ সেকশন — approved রিভিউ দেখায়; নতুন রিভিউ সবসময় pending যায়
 * (PDP-তে সাথে সাথে দেখায় না)। delivered অর্ডার থাকলে "verified order" ব্যাজ।
 */
export function ProductReviews({
  productId,
  reviews,
}: {
  productId: number;
  reviews: ReviewView[];
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizeBdPhone(phone);
    if (!normalized) {
      setError("সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01712345678)");
      return;
    }
    if (comment.trim().length < 4) {
      setError("অনুগ্রহ করে অন্তত কয়েক শব্দ মন্তব্য লিখুন।");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, name: name.trim(), phone: normalized, rating, comment: comment.trim() }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "রিভিউ পাঠানো যায়নি। আবার চেষ্টা করুন।");
        return;
      }
      setSubmitted(true);
      toast("ধন্যবাদ! রিভিউটি যাচাইয়ের অপেক্ষায় আছে।", "success");
    } catch {
      setError("নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="section" aria-labelledby="reviews-title">
      <div className="container-narrow container">
        <p className="eyebrow">গ্রাহকের অভিজ্ঞতা</p>
        <h2 className="section-title" id="reviews-title">
          রিভিউ ({reviews.length})
        </h2>

        {reviews.length > 0 ? (
          <div className="mt-4">
            {reviews.map((review) => (
              <article className="review-item" key={review.id}>
                <div className="review-head">
                  <span className="review-author">{review.customerName}</span>
                  <Stars rating={review.rating} />
                  {review.isVerified ? (
                    <span className="badge badge-success">
                      <BadgeCheck aria-hidden="true" />
                      verified order
                    </span>
                  ) : null}
                  <span className="review-meta">{formatDateBangla(review.createdAt)}</span>
                </div>
                {review.comment ? <p className="mb-0 mt-2">{review.comment}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-muted">এখনো কোনো রিভিউ নেই। প্রথম রিভিউটি আপনিই দিন।</p>
        )}

        <div className="card card-plain card-pad-lg mt-5">
          <h3>রিভিউ লিখুন</h3>
          {submitted ? (
            <div className="alert alert-success">
              <BadgeCheck aria-hidden="true" />
              <span>
                আপনার রিভিউ জমা হয়েছে। মডারেশনের পর অনুমোদিত হলে এখানে দেখা যাবে।
              </span>
            </div>
          ) : (
            <form onSubmit={submit} className="stack stack-sm">
              <div className="field-row">
                <label className="field mb-0">
                  <span className="label">
                    নাম <span className="required-mark">*</span>
                  </span>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </label>
                <label className="field mb-0">
                  <span className="label">
                    মোবাইল <span className="required-mark">*</span>
                  </span>
                  <input
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="01XXXXXXXXX"
                    required
                  />
                </label>
              </div>

              <div className="field mb-0">
                <span className="label">রেটিং</span>
                <div className="star-input" role="radiogroup" aria-label="রেটিং">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={rating === value}
                      aria-label={`${value} তারকা`}
                      onClick={() => setRating(value)}
                    >
                      <Star aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>

              <label className="field mb-0">
                <span className="label">মন্তব্য</span>
                <textarea
                  className="textarea"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="পণ্যটি কেমন লেগেছে লিখুন। রোগ নিরাময়ের দাবি লিখবেন না — এমন রিভিউ অনুমোদিত হয় না।"
                  required
                />
              </label>

              {error ? <p className="error-text">{error}</p> : null}
              <button type="submit" className="btn btn-emerald" disabled={submitting}>
                {submitting ? "পাঠানো হচ্ছে…" : "রিভিউ পাঠান"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
