import { initials } from "@/lib/format";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
  xl: "size-16 text-lg",
};

export function PersonAvatar({
  person,
  size = "md",
  className,
}: {
  person: Pick<Person, "firstName" | "lastName" | "hue">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight", SIZES[size], className)}
      style={{
        backgroundColor: `oklch(0.93 0.05 ${person.hue})`,
        color: `oklch(0.38 0.1 ${person.hue})`,
      }}
    >
      {initials(person)}
    </span>
  );
}
