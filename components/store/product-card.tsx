import Link from "next/link";
import Image from "next/image";
import { PackageX } from "lucide-react";
import type { ProductCard } from "@/lib/store/repository";
import { formatTaka, discountPercent, toBanglaDigits } from "@/lib/utils";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

/** পণ্য কার্ড — প্রতি রোতে ২টি (মোবাইল), দাম ও ডিসকাউন্ট সার্ভার থেকে */
export function ProductCardView({ product }: { product: ProductCard }) {
  const discount = discountPercent(product.price, product.compareAtPrice);
  const outOfStock = product.trackStock && product.stock <= 0;
  const lowStock = product.trackStock && !outOfStock && product.stock <= product.lowStockThreshold;

  return (
    <article className="product-card">
      <div className="product-media">
        <div className="product-flags">
          {discount > 0 ? (
            <span className="badge discount-badge">{toBanglaDigits(discount)}% ছাড়</span>
          ) : null}
          {lowStock ? (
            <span className="badge badge-warning">
              মাত্র {toBanglaDigits(product.stock)}টি বাকি
            </span>
          ) : null}
          {outOfStock ? (
            <span className="badge badge-danger">স্টক শেষ</span>
          ) : null}
        </div>
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 900px) 50vw, 280px"
            loading="lazy"
          />
        ) : (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <PackageX aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="product-body">
        <h3 className="product-name clamp-2">
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        {product.categoryName ? (
          <span className="product-cat">{product.categoryName}</span>
        ) : null}
        <div className="price-row">
          <span className="price">{formatTaka(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price ? (
            <span className="price-old">{formatTaka(product.compareAtPrice)}</span>
          ) : null}
        </div>
        <AddToCartButton
          productId={product.id}
          disabled={outOfStock}
          max={Math.min(product.trackStock ? product.stock : 20, 20)}
        />
      </div>
    </article>
  );
}
