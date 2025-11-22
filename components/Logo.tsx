// web/components/Logo.tsx
"use client";
import Image from "next/image";
import React, { useState } from "react";

type Props = {
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
};

export default function Logo({
  width = 120,
  height = 40,
  className = "",
  alt = "Zyntra",
}: Props) {
  // Serve from public/ for production safety
  const publicSrc = "/assets/logo-zyntra.png";
  const [src, setSrc] = useState(publicSrc);

  return (
    <div className={`inline-flex items-center ${className}`} aria-hidden={false}>
      {/* next/image gives layout stability; fallback handled via onError */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority
        style={{ objectFit: "contain" }}
        onError={() => {
          // if next/image fails to load (very rare), fall back to the same public path
          if (src !== publicSrc) setSrc(publicSrc);
        }}
      />
      <span className="sr-only">{alt}</span>
    </div>
  );
}
