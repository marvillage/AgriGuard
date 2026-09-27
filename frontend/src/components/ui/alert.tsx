import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  default: CircleCheck,
  destructive: TriangleAlert,
  info: Info,
};

export function Alert({
  className,
  variant = "default",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive" | "info";
}) {
  const Icon = icons[variant];

  return (
    <div
      role={variant === "destructive" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        variant === "default" && "border-sun-300/70 bg-sun-50 text-sun-900",
        variant === "destructive" && "border-red-200 bg-red-50 text-red-900",
        variant === "info" && "border-navy-100 bg-navy-50/70 text-navy-900",
        className
      )}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
