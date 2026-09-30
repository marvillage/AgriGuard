import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ImageSlot } from "@/components/ui/image-slot";
import { Reveal } from "@/components/ui/reveal";
import { siteImages } from "@/lib/site-images";

export function CtaBand() {
  return (
    <section className="bg-white px-5 pb-24 lg:px-8 lg:pb-32">
      <Reveal className="mx-auto max-w-7xl">
        <ImageSlot
          image={siteImages.cta}
          tone="sun"
          sizes="(min-width: 1280px) 1280px, 100vw"
          className="rounded-[2rem] shadow-lift"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-sun-400 via-sun-400/90 to-sun-400/30" aria-hidden="true" />
          <div className="relative px-6 py-16 sm:px-12 lg:py-20">
            <h2 className="max-w-xl font-display text-3xl leading-tight font-bold tracking-tight text-ink sm:text-4xl">
              Start measuring what your farm saves.
            </h2>
            <p className="mt-4 max-w-lg text-lg text-ink/75">
              Add your farm and fields in two minutes. Your phone does the
              rest: no hardware needed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className={buttonVariants({ variant: "dark", size: "lg" })}>
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className={buttonVariants({
                  variant: "secondary",
                  size: "lg",
                  className: "border-ink/10 bg-white/70 backdrop-blur hover:bg-white",
                })}
              >
                Sign in
              </Link>
            </div>
          </div>
        </ImageSlot>
      </Reveal>
    </section>
  );
}
