import { cn } from "@/lib/utils";

/** A line running through three moments: the record that carries across shifts. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M6 20.5c4.5 0 5.5-9 10-9s5.5 9 10 9" fill="none" strokeWidth="2.4" strokeLinecap="round" className="stroke-primary-foreground" />
      <circle cx="7" cy="20.5" r="2.4" className="fill-primary-foreground" />
      <circle cx="16" cy="11.5" r="2.4" className="fill-lit" />
      <circle cx="25" cy="20.5" r="2.4" className="fill-primary-foreground" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight">Throughline</span>
    </span>
  );
}
