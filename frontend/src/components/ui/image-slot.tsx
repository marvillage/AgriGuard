"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import type { SiteImage } from "@/lib/site-images";

const tones = {
  navy: "bg-gradient-to-br from-navy-800 via-navy-900 to-ink",
  sun: "bg-gradient-to-br from-sun-200 via-sun-300 to-sun-500",
  light: "bg-gradient-to-br from-navy-50 via-white to-sun-50",
};

type Status = "loading" | "loaded" | "missing";

export function ImageSlot({
  image,
  className,
  tone = "navy",
  sizes = "100vw",
  eager = false,
  unoptimized = false,
  children,
}: {
  image: SiteImage;
  className?: string;
  tone?: keyof typeof tones;
  sizes?: string;
  eager?: boolean;
  unoptimized?: boolean;
  children?: React.ReactNode;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const standalone = !children;

  // Catches images that finished (or failed) before hydration attached the event handlers.
  const checkImage = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) setStatus(img.naturalWidth > 0 ? "loaded" : "missing");
  }, []);

  return (
    <div
      className={cn("relative overflow-hidden", tones[tone], className)}
      role={standalone ? "img" : undefined}
      aria-label={standalone ? image.alt : undefined}
    >
      <div
        className={cn(
          "absolute inset-0",
          tone === "navy" ? "bg-aurora" : "bg-mist opacity-60"
        )}
        aria-hidden="true"
      />
      {status === "missing" && process.env.NODE_ENV === "development" ? (
        <span
          className={cn(
            "absolute right-3 bottom-3 rounded-md px-2 py-1 font-mono text-[10px]",
            tone === "navy"
              ? "bg-white/10 text-white/60"
              : "bg-navy-950/10 text-navy-900/60"
          )}
          aria-hidden="true"
        >
          {image.src}
        </span>
      ) : null}
      {status !== "missing" ? (
        <Image
          ref={checkImage}
          src={image.src}
          alt=""
          fill
          unoptimized={unoptimized}
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : undefined}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("missing")}
          className={cn(
            "object-cover transition-opacity duration-700",
            status === "loaded" ? "opacity-100" : "opacity-0"
          )}
        />
      ) : null}
      {children}
    </div>
  );
}
