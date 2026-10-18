import Link from "next/link";
import { BadgeCheck, Banknote, MessageCircle, Truck } from "lucide-react";
import { getBrand } from "@/lib/store/repository";
import { whatsappLink } from "@/lib/contact-links";

/** হিরো — গাঢ় এমারেল্ড, ১৩৫° গ্রেডিয়েন্ট + উপরে-ডানে সোনালি গ্লো */
export async function HomeHero() {
  const brand = await getBrand();

  return (
    <section className="hero">
      <div className="container hero-inner">
        <div>
          <p className="eyebrow">ইউনানী ঐতিহ্য</p>
          <h1>{brand.tagline}</h1>
          <p className="hero-lead">
            নির্বাচিত ভেষজ ও ইউনানী প্রস্তুতি — টনিক, সিরাপ, চূর্ণ, ক্যাপসুল ও মালিশ পণ্য।
            প্রতিটি পণ্যের উপাদান, মাত্রা ও সতর্কতা স্পষ্টভাবে লেখা থাকে।
          </p>
          <ul className="hero-points">
            <li>
              <Banknote aria-hidden="true" />
              ক্যাশ অন ডেলিভারি
            </li>
            <li>
              <Truck aria-hidden="true" />
              {brand.serviceArea}
            </li>
            <li>
              <BadgeCheck aria-hidden="true" />
              লেবেলযুক্ত পণ্য
            </li>
          </ul>
          <div className="btn-group">
            <Link className="btn btn-lg" href="/products">
              পণ্য দেখুন
            </Link>
            <a
              className="btn btn-on-dark btn-lg"
              href={whatsappLink(brand)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle aria-hidden="true" />
              WhatsApp-এ অর্ডার
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
