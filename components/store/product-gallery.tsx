"use client";

import { useState } from "react";
import Image from "next/image";

/** PDP গ্যালারি — মূল ছবি + থাম্বনেইল, কীবোর্ড নেভিগেশনসহ */
export function ProductGallery({
  images,
  name,
}: {
  images: Array<{ url: string; alt: string | null }>;
  name: string;
}) {
  const [active, setActive] = useState(0);
  const list = images.length > 0 ? images : [];
  const current = list[active] ?? list[0];

  if (!current) {
    return (
      <div className="gallery-main" aria-label={`${name}-এর ছবি নেই`}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted)",
          }}
        >
          ছবি যোগ করা হয়নি
        </div>
      </div>
    );
  }

  return (
    <div className="gallery">
      <div className="gallery-main">
        <Image
          src={current.url}
          alt={current.alt || name}
          fill
          sizes="(max-width: 900px) 100vw, 560px"
          priority
        />
      </div>
      {list.length > 1 ? (
        <div className="gallery-thumbs" role="tablist" aria-label="পণ্যের ছবি">
          {list.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              className="gallery-thumb"
              role="tab"
              aria-current={index === active}
              aria-label={`ছবি ${index + 1}`}
              onClick={() => setActive(index)}
            >
              <Image src={image.url} alt="" width={68} height={68} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
