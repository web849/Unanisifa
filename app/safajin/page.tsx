import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Check, Clock3, LockKeyhole, PackageCheck, Truck } from "lucide-react";
import { LandingOrderForm } from "@/components/landing/landing-order-form";
import { getLandingCatalog, toLandingOrderProduct } from "@/lib/landing/products";
import { getBrand, getCommerce } from "@/lib/store/repository";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "সাফাজিন + সাফা আম্বারি | ইউনানী সিফা",
  description: "সাফাজিন সিরাপ ও সাফা আম্বারি ক্যাপসুল — সহজ অর্ডার, ক্যাশ অন ডেলিভারি।",
};

const PRODUCT_IMAGE = "https://prakritirshifa.com/wp-content/uploads/2026/04/ChatGPT-Image-Apr-20-2026-01_35_29-AM-683x1024.png";
const benefits = ["ভেষজ উপাদানে তৈরি পণ্য", "সারা বাংলাদেশে হোম ডেলিভারি", "পণ্য হাতে পেয়ে মূল্য পরিশোধ", "আপনার অর্ডারের তথ্য গোপন রাখা হয়"];

export default async function SafajinPage() {
  const [{ items }, brand, commerce] = await Promise.all([getLandingCatalog({ demoFallback: true }), getBrand(), getCommerce()]);
  const product = items.find((item) => /safajin|safa.?ambari|সাফাজিন/i.test(`${item.slug} ${item.name}`));
  if (!product) notFound();
  const orderProduct = { ...toLandingOrderProduct(product), image: product.image || PRODUCT_IMAGE };

  return <div className="safa-page">
    <header className="safa-header"><Link href="/" className="safa-logo">ইউনানী <b>সিফা</b></Link><a className="safa-header-order" href="#order_form">অর্ডার করুন</a></header>
    <main>
      <section className="safa-hero">
        <div className="safa-hero-copy"><span className="safa-kicker">প্রকৃতির যত্ন · সহজ অর্ডার</span><h1>সাফাজিন +<br/><em>সাফা আম্বারি</em></h1><p className="safa-lede">দৈনন্দিন সুস্থতা ও প্রাণশক্তির জন্য ভেষজ পণ্যের যত্নশীল সমন্বয়।</p>
          <div className="safa-price"><strong>৳১,০০০</strong><small>১ সেট</small></div>
          <a className="safa-cta" href="#order_form">এখনই অর্ডার করুন</a>
          <div className="safa-trust"><span><Truck/> সারা দেশে ডেলিভারি</span><span><LockKeyhole/> গোপনীয় প্যাকেজিং</span></div>
        </div>
        <div className="safa-visual"><div className="safa-image-frame"><Image src={orderProduct.image!} alt="সাফাজিন ও সাফা আম্বারি পণ্যের ছবি" width={683} height={1024} unoptimized/><span className="safa-seal">১০০%<br/>অরিজিনাল</span></div><div className="safa-image-caption">Safajin + Safa Ambari <span>একসাথে, এক সেট</span></div></div>
      </section>
      <section className="safa-assurance"><div><PackageCheck/><span>ক্যাশ অন ডেলিভারি</span></div><div><Truck/><span>ডেলিভারি চার্জ ফ্রি</span></div><div><LockKeyhole/><span>তথ্যের গোপনীয়তা</span></div></section>
      <section className="safa-details"><div className="safa-details-intro"><span className="safa-kicker">পণ্য পরিচিতি</span><h2>অর্ডার করা<br/>এখন আরও সহজ</h2><p>পছন্দ হলে নিচের ফর্মে নাম, ফোন ও ঠিকানা লিখুন। অর্ডার নিশ্চিত করতে আমরা ফোনে যোগাযোগ করব।</p></div><div className="safa-benefits">{benefits.map((b)=><div key={b}><Check/><span>{b}</span></div>)}<p className="safa-note">সাধারণত ৪৮–৭২ ঘণ্টার মধ্যে ডেলিভারি হয়; এলাকাভেদে সময় পরিবর্তিত হতে পারে। পণ্যের উপাদান, ব্যবহারবিধি ও আপনার উপযোগিতা সম্পর্কে প্যাকেটের নির্দেশনা পড়ুন।</p></div></section>
      <section className="safa-order-wrap"><div className="safa-order-heading"><span className="safa-kicker">নিরাপদ অর্ডার</span><h2>আপনার তথ্য দিন</h2><p>ফর্মটি পূরণ করতে সাহায্য লাগলে পরিবারের কাউকে বলুন।</p></div><LandingOrderForm product={orderProduct} landingSlug="safajin" couponCode={null} deliveryInside={0} deliveryOutside={0} brand={brand} maxQuantity={commerce.maxQuantity} title="অর্ডার নিশ্চিত করুন" subtitle="আপনার ঠিকানায় পৌঁছে দেব—পণ্য হাতে পেয়ে টাকা দিন।"/></section>
      <section className="safa-footer-note"><Clock3/><span>প্রশ্ন আছে? অর্ডার নিশ্চিত করার সময় আমাদের প্রতিনিধি আপনাকে সহায়তা করবেন।</span></section>
    </main>
    <footer className="safa-footer">© ইউনানী সিফা · সুস্থতার জন্য সচেতন পছন্দ</footer>
    <style>{` .safa-page{--safa-forest:#123d32;--safa-green:#1e634d;--safa-gold:#c69b55;--safa-paper:#f8f6ef;background:#f8f6ef;color:#17372e;min-height:100vh;padding-bottom:32px}.safa-header{height:72px;padding:0 max(5vw,22px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e8e3d7;background:#fbfaf6}.safa-logo{text-decoration:none;color:#153c31;font-size:21px;font-weight:500}.safa-logo b{font-weight:800}.safa-header-order{background:#123d32;color:white;border-radius:30px;padding:10px 20px;text-decoration:none;font-weight:700}.safa-header-order span{margin-left:8px}.safa-hero{max-width:1160px;margin:auto;padding:68px 28px 74px;display:grid;grid-template-columns:1.04fr .96fr;align-items:center;gap:7vw}.safa-kicker{color:#9a7137;text-transform:uppercase;letter-spacing:.11em;font-size:13px;font-weight:700}.safa-hero h1{font-size:clamp(42px,6vw,74px);line-height:1.12;letter-spacing:-.035em;margin:20px 0;color:#153c31}.safa-hero h1 em{font-style:normal;color:#a77c3e}.safa-lede{font-size:19px;color:#64756b;max-width:450px;margin-bottom:25px}.safa-price{display:flex;align-items:baseline;gap:14px;margin-bottom:22px}.safa-price strong{font-size:42px;color:#173e32}.safa-price small{color:#728077;font-size:14px}.safa-old{color:#879189;text-decoration:line-through;font-size:20px}.safa-cta{display:inline-flex;gap:25px;align-items:center;background:#bf9653;color:white;border-radius:10px;padding:15px 25px;text-decoration:none;font-size:18px;font-weight:700;box-shadow:0 8px 20px #a77c3e33}.safa-cta:hover,.safa-header-order:hover{color:white;filter:brightness(1.08)}.safa-trust{display:flex;gap:20px;margin-top:25px;color:#5c6c62;font-size:14px}.safa-trust span{display:flex;align-items:center;gap:7px}.safa-trust svg,.safa-assurance svg{width:18px;height:18px;color:#9a7137}.safa-visual{max-width:430px;width:100%;justify-self:center;position:relative}.safa-image-frame{height:485px;overflow:hidden;border-radius:220px 220px 24px 24px;background:#e9e3d5;position:relative;box-shadow:0 24px 60px #163b2a22}.safa-image-frame img{width:100%;height:100%;object-fit:cover;object-position:center 36%}.safa-seal{position:absolute;right:18px;top:26px;width:80px;height:80px;display:grid;place-content:center;text-align:center;border-radius:50%;background:#f8f4e8;color:#80602e;border:1px solid #c6a76c;line-height:1.2;font-weight:800;box-shadow:0 4px 14px #0002}.safa-image-caption{position:absolute;bottom:18px;left:-30px;background:white;padding:13px 18px;border-radius:12px;box-shadow:0 8px 25px #153c3118;font-weight:700}.safa-image-caption span{display:block;font-size:12px;font-weight:400;color:#718077}.safa-assurance{background:#153d32;color:#fff;display:flex;justify-content:center;gap:clamp(25px,8vw,110px);padding:22px;flex-wrap:wrap}.safa-assurance div{display:flex;align-items:center;gap:10px}.safa-assurance svg{color:#e0bd7b}.safa-details{max-width:1050px;margin:0 auto;padding:86px 28px;display:grid;grid-template-columns:1fr 1fr;gap:8vw}.safa-details h2,.safa-order-heading h2{font-size:clamp(32px,4vw,48px);margin:16px 0;color:#153c31}.safa-details-intro p,.safa-order-heading p{max-width:390px;color:#68786e;font-size:17px}.safa-benefits{padding-top:12px}.safa-benefits>div{display:flex;gap:12px;align-items:center;padding:15px 0;border-bottom:1px solid #e5e1d6;font-size:17px}.safa-benefits svg{color:#1e7658;width:20px;flex:none}.safa-note{font-size:13px;color:#7a827b;margin-top:20px}.safa-order-wrap{max-width:760px;margin:0 auto;background:#fff;border:1px solid #ebe7dc;border-radius:20px;padding:40px;box-shadow:0 15px 45px #153c3110}.safa-order-heading{text-align:center;margin-bottom:26px}.safa-order-heading p{margin:0 auto}.safa-order-wrap .lp-section{padding:0;background:transparent}.safa-order-wrap .lp-inner{width:100%;padding:0}.safa-order-wrap .lp-heading{display:none}.safa-order-wrap .lp-text{display:none}.safa-order-wrap .order-form-card{box-shadow:none;border:0;padding:0}.safa-footer-note{max-width:760px;margin:22px auto;display:flex;gap:10px;align-items:center;color:#6c7b71;font-size:14px;padding:0 12px}.safa-footer-note svg{flex:none;color:#9a7137}.safa-footer{text-align:center;border-top:1px solid #e8e3d7;padding:24px;color:#758078;font-size:13px}@media(max-width:720px){.safa-header{height:62px}.safa-hero{padding:42px 22px 48px;grid-template-columns:1fr;gap:35px}.safa-hero h1{font-size:49px}.safa-lede{font-size:17px}.safa-visual{max-width:360px}.safa-image-frame{height:390px}.safa-image-caption{left:-8px}.safa-trust{gap:12px;font-size:12px}.safa-assurance{justify-content:flex-start;gap:12px 24px;padding:20px 22px;font-size:14px}.safa-details{padding:55px 22px;grid-template-columns:1fr;gap:20px}.safa-order-wrap{margin:0 14px;padding:26px 20px}.safa-price strong{font-size:38px}}`}</style>
  </div>;
}
