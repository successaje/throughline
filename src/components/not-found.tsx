import Link from "next/link";
import { UserX } from "lucide-react";
import { EmptyState, Page } from "@/components/page";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <Page>
      <EmptyState icon={UserX} title="We couldn't find that person" action={<Button asChild variant="outline"><Link href="/people">Back to people</Link></Button>}>
        They may have been removed, or the demo data was reset.
      </EmptyState>
    </Page>
  );
}
