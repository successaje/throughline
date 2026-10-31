"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Database, Settings, Sparkles, Users } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { PersonAvatar } from "@/components/person-avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useStatus } from "@/hooks/use-status";
import { AGENCY } from "@/lib/sample/seed";
import { currentStaff, useHydrated, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Today", icon: CalendarCheck },
  { href: "/people", label: "People", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function DataModeChip({ className }: { className?: string }) {
  const status = useStatus();
  if (!status) return <span className={cn("h-5 w-24 animate-pulse rounded-full bg-muted", className)} />;
  const live = status.qloo === "live";
  return (
    <Link
      href="/settings"
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[11px] font-medium transition-colors hover:bg-muted",
        live ? "border-primary/25 text-primary" : "border-lit/40 text-lit-strong",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", live ? "bg-primary" : "bg-lit")} />
      {live ? "Live Qloo data" : "Sample data"}
      {status.agent !== "rules" && <Sparkles className="size-3" />}
    </Link>
  );
}

/** Reads the URL, so it renders inside Suspense; the fallback shows no active item. */
function WithPathname({ children }: { children: (pathname: string) => React.ReactNode }) {
  return (
    <Suspense fallback={children("")}>
      <PathnameReader>{children}</PathnameReader>
    </Suspense>
  );
}

function PathnameReader({ children }: { children: (pathname: string) => React.ReactNode }) {
  return <>{children(usePathname())}</>;
}

function AppSidebar() {
  const hydrated = useHydrated();
  const people = useStore((s) => s.people);
  const outings = useStore((s) => s.outings);
  const waiting = outings.filter((o) => o.status === "planned").length;

  return (
    <Sidebar variant="inset" className="print:hidden">
      <SidebarHeader className="px-3 pt-3">
        <Link href="/" className="rounded-md px-1 py-1">
          <Wordmark />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <WithPathname>
              {(pathname) => (
                <SidebarMenu>
                  {NAV.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive(pathname, item.href)}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.href === "/" && hydrated && waiting > 0 && <SidebarMenuBadge>{waiting}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              )}
            </WithPathname>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Your people</SidebarGroupLabel>
          <SidebarGroupContent>
            <WithPathname>
              {(pathname) => (
                <SidebarMenu>
                  {hydrated &&
                    people.map((p) => (
                      <SidebarMenuItem key={p.id}>
                        <SidebarMenuButton asChild isActive={pathname.startsWith(`/people/${p.id}`)}>
                          <Link href={`/people/${p.id}`}>
                            <PersonAvatar person={p} size="sm" className="-ml-1 size-5 text-[9px]" />
                            <span>
                              {p.firstName} {p.lastName}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                </SidebarMenu>
              )}
            </WithPathname>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 p-3">
        <DataModeChip className="self-start" />
        <div className="flex items-center gap-2.5 rounded-lg border bg-background/60 p-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            KM
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium">{currentStaff.name}</p>
            <p className="truncate text-xs text-muted-foreground">{AGENCY}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

/** Bottom tab bar for phones, where most support staff will use this. */
function MobileNav() {
  return <WithPathname>{(pathname) => <MobileNavBar pathname={pathname} />}</WithPathname>;
}

function MobileNavBar({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden print:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground",
              isActive(pathname, item.href) && "text-primary",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 print:m-0 print:shadow-none">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-md md:hidden print:hidden">
          <SidebarTrigger />
          <Wordmark className="[&_svg]:size-6" />
          <DataModeChip className="ml-auto" />
        </header>
        <div className="flex-1 pb-24 md:pb-10 print:pb-0">{children}</div>
      </SidebarInset>
      <MobileNav />
    </SidebarProvider>
  );
}

export function SampleBanner() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Database className="size-3.5" />
      Fictional people and sample history, for demonstration.
    </div>
  );
}
