import Link from "next/link";
import {
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { getBrand } from "@/lib/store/repository";
import { listFooterPages } from "@/lib/store/repository";
import { mailLink, telLink, whatsappLink } from "@/lib/contact-links";
import { MEDICAL_DISCLAIMER } from "@/lib/config";

/** ফুটার — লোগো, বিবরণ, পেজ লিংক, যোগাযোগ, লাইসেন্স, ডিসক্লেইমার */
export async function StoreFooter() {
  const [brand, pages] = await Promise.all([getBrand(), listFooterPages()]);
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <BrandLogo variant="light" />
            </div>
            <p className="text-muted" style={{ maxWidth: "38ch" }}>
              {brand.description}
            </p>
            <div className="footer-contact mt-3">
              <span className="footer-contact-item">
                <MapPin aria-hidden="true" />
                {brand.address}
              </span>
              <span className="footer-contact-item">
                <Clock aria-hidden="true" />
                {brand.supportHours}
              </span>
            </div>
          </div>

          <div>
            <h3>পেজসমূহ</h3>
            <ul className="footer-list">
              {pages.map((page) => (
                <li key={page.slug}>
                  <Link href={`/${page.slug}`}>{page.title}</Link>
                </li>
              ))}
              <li>
                <Link href="/track-order">অর্ডার ট্র্যাক করুন</Link>
              </li>
              <li>
                <Link href="/faq">সাধারণ জিজ্ঞাসা</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3>যোগাযোগ</h3>
            <div className="footer-contact">
              <a className="footer-contact-item" href={telLink(brand)}>
                <Phone aria-hidden="true" />
                {brand.phone}
              </a>
              <a
                className="footer-contact-item"
                href={whatsappLink(brand)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden="true" />
                WhatsApp: {brand.phone}
              </a>
              <a className="footer-contact-item" href={mailLink(brand)}>
                <Mail aria-hidden="true" />
                {brand.email}
              </a>
            </div>
          </div>

          <div>
            <h3>বিশ্বাস ও নীতি</h3>
            <ul className="footer-list">
              <li>
                <span className="footer-contact-item">
                  <ShieldCheck aria-hidden="true" />
                  {brand.drugLicense ? `ড্রাগ লাইসেন্স: ${brand.drugLicense}` : "ড্রাগ লাইসেন্স: Pending"}
                </span>
              </li>
              <li>
                <Link href="/shipping">ডেলিভারি ও রিটার্ন নীতি</Link>
              </li>
              <li>
                <Link href="/terms">শর্তাবলি</Link>
              </li>
              <li>
                <Link href="/privacy">প্রাইভেসি নীতি</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-disclaimer">
            <Stethoscope aria-hidden="true" style={{ display: "inline", verticalAlign: "-4px" }} />{" "}
            {MEDICAL_DISCLAIMER} আমাদের পণ্যগুলো ওষুধের বিকল্প নয় এবং কোনো রোগ নিরাময়ের নিশ্চয়তা দেয় না।
          </p>
          <div className="row-between row-wrap">
            <span>
              © {year} {brand.name}। সর্বস্বত্ব সংরক্ষিত।
            </span>
            <span>সার্ভিস এরিয়া: {brand.serviceArea}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
