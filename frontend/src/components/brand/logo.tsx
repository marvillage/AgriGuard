import Image from "next/image";
import { cn } from "@/lib/utils";

const marks = {
  onLight: "/brand/logo-mark.png",
  onDark: "/brand/logo-mark-on-dark.png",
};

export function LogoMark({
  className,
  variant = "onLight",
}: {
  className?: string;
  variant?: keyof typeof marks;
}) {
  return (
    <Image
      src={marks[variant]}
      alt=""
      aria-hidden="true"
      width={128}
      height={128}
      loading="eager"
      className={cn("object-contain", className)}
    />
  );
}

export function Logo({
  variant = "onLight",
  className,
  subtitle,
}: {
  variant?: keyof typeof marks;
  className?: string;
  subtitle?: string;
}) {
  const dark = variant === "onDark";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark variant={variant} className="h-9 w-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-lg font-bold tracking-tight",
            dark ? "text-white" : "text-ink"
          )}
        >
          Agri<span className={dark ? "text-sun-400" : "text-navy-800"}>Guard</span>
        </span>
        {subtitle ? (
          <span
            className={cn(
              "mt-1 text-[11px] font-medium tracking-wide",
              dark ? "text-white/50" : "text-slate-500"
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
