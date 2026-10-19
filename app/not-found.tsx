import Link from "next/link";
import { Compass } from "lucide-react";

export const metadata = {
  title: "পেজ পাওয়া যায়নি",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="section">
      <div className="container container-narrow">
        <div className="empty-state" style={{ paddingBlock: "5rem" }}>
          <Compass aria-hidden="true" />
          <p className="empty-state-title">পেজটি খুঁজে পাওয়া যায়নি</p>
          <p>লিংকটি বদলে গেছে বা পেজটি সরানো হয়েছে।</p>
          <div className="btn-group" style={{ justifyContent: "center" }}>
            <Link className="btn" href="/">
              হোমে ফিরুন
            </Link>
            <Link className="btn btn-outline" href="/products">
              পণ্য দেখুন
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
