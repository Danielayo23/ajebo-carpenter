"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

export default function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const safeImages = useMemo(() => images.filter(Boolean), [images]);
  const [active, setActive] = useState(0);

  const main = safeImages[active] ?? safeImages[0];

  return (
    <div className="space-y-5">
      {/* Main Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-gray-100 shadow-md">
        {main ? (
          <Image
            src={main}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 700px"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            No image available
          </div>
        )}
      </div>

      {/* Thumbnail Gallery */}
      {safeImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {safeImages.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 transition-all duration-300 ${
                i === active
                  ? "ring-4 ring-[#04209d] shadow-lg"
                  : "ring-2 ring-transparent hover:ring-gray-300"
              }`}
              aria-label={`View image ${i + 1}`}
            >
              <Image
                src={url}
                alt={`${alt} thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="128px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}