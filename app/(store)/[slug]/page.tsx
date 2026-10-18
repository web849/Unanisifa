import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircle, PhoneCall } from "lucide-react";
import { getCmsPage, getBrand } from "@/lib/store/repository";
import { renderCmsBody } from "@/lib/cms/render";
import { telLink, whatsappLink } from "@/lib/contact-links";

const RESERVED = new Set([
  "products",
  "cart",
  "checkout",
  "thank-you",
  "track-order",
  "account",
  "offer",
  "admin",
  "api",
]);

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED.has(slug)) notFound();
  const page = await getCmsPage(slug);
  if (!page) return { title: "পেজ পাওয়া যায়নি" };
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
    alternates: { canonical: `/${page.slug}` },
  };
}

export const revalidate = 120;

/** CMS পেজ — about, contact, shipping, terms, privacy, faq (অ্যাডমিন থেকে এডিটেবল) */
export default async function CmsPageView({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (RESERVED.has(slug)) notFound();
  const [page, brand] = await Promise.all([getCmsPage(slug), getBrand()]);
  if (!page) notFound();

  return (
    <section className="section">
      <div className="container container-narrow">
        <p className="eyebrow">{brand.name}</p>
        <h1 className="section-title">{page.title}</h1>
        {renderCmsBody(page.body)}

        {slug === "contact" ? (
          <div className="btn-group mt-5">
            <a className="btn btn-whatsapp" href={whatsappLink(brand)} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" />
              WhatsApp-এ বার্তা
            </a>
            <a className="btn btn-outline" href={telLink(brand)}>
              <PhoneCall aria-hidden="true" />
              {brand.phone}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
