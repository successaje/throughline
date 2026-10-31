import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Person routes read the dynamic [id] param, so the static shell renders this
// fallback and the record streams in at request time.
export default function PersonLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-10">
          <Skeleton className="mb-3 h-16 w-16 rounded-full" />
          <Skeleton className="mb-10 h-8 w-72" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
