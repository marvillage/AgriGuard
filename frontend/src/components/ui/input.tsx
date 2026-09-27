import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-ink transition-all placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-sun-400 focus-visible:ring-4 focus-visible:ring-sun-400/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
