import { BadgeCheck, Banknote, RotateCcw, ShieldCheck } from "lucide-react";
import { getBrand } from "@/lib/store/repository";

/** বিশ্বাস-স্ট্রিপ — ড্রাগ লাইসেন্স ফিল্ড (Pending সহ), COD, রিটার্ন পলিসি */
export async function TrustStrip() {
  const brand = await getBrand();

  const items = [
    {
      icon: ShieldCheck,
      title: brand.drugLicense ? `ড্রাগ লাইসেন্স: ${brand.drugLicense}` : "ড্রাগ লাইসেন্স: Pending",
      text: brand.drugLicense
        ? "লাইসেন্সভিত্তিক পরিচালনা"
        : "লাইসেন্স নম্বর যাচাই চলছে — অনুমোদনের আগেই দেখানো হবে",
    },
    {
      icon: Banknote,
      title: "ক্যাশ অন ডেলিভারি",
      text: "পণ্য হাতে পেয়ে টাকা পরিশোধ করুন",
    },
    {
      icon: RotateCcw,
      title: "সহজ রিটার্ন",
      text: "ক্ষতিগ্রস্ত বা ভুল পণ্যে ২৪ ঘণ্টার মধ্যে জানান",
    },
    {
      icon: BadgeCheck,
      title: "লেবেলযুক্ত পণ্য",
      text: "উপাদান, মাত্রা ও মেয়াদ উল্লেখসহ",
    },
  ];

  return (
    <section className="section" aria-label="বিশ্বাস ও নীতি">
      <div className="container">
        <div className="trust-strip">
          {items.map((item) => (
            <div className="trust-item" key={item.title}>
              <item.icon aria-hidden="true" />
              <div>
                <span className="trust-title">{item.title}</span>
                <span className="trust-text">{item.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
