"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown, CircleUser, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { forAuthorsCoreLinks, forAuthorsPolicyLinks } from "@/lib/for-authors-nav";
import { JournalsNavDropdownPanel, JournalsNavTrigger } from "@/components/journals-nav-mega-menu";

const primaryNav = [
  { label: "About", href: "/about" },
  { label: "Latest Research", href: "/latest-research" },
] as const;

function readDocumentScrollY(): number {
  if (typeof window === "undefined") return 0;
  return (
    window.scrollY ||
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

function AccountDropdown(props: {
  align?: "start" | "end";
  iconOnly?: boolean;
  triggerClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={props.iconOnly ? "icon" : "default"}
          className={cn(
            !props.iconOnly && "gap-2 border-border bg-background font-medium",
            props.iconOnly && "shrink-0",
            props.triggerClassName,
          )}
        >
          <CircleUser className="h-4 w-4 shrink-0" aria-hidden />
          {!props.iconOnly && "Account"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={props.align ?? "end"} className="w-48">
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          Your account
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/auth/login">Log in</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/auth/sign-up">Sign up</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [journalsMenuOpen, setJournalsMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(readDocumentScrollY() > 100);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const mobileMenuButton = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        "shrink-0 border-border bg-background",
        isScrolled && "border-white/70 bg-transparent text-white hover:bg-white/15 hover:text-white",
      )}
      aria-label="Open menu"
      onClick={() => setMobileMenuOpen(true)}
    >
      <Menu className="h-5 w-5" aria-hidden />
    </Button>
  );

  const mobileAccount = (
    <AccountDropdown
      iconOnly
      align="end"
      triggerClassName={cn(
        "h-9 w-9 shrink-0",
        isScrolled &&
          "border-white/70 bg-transparent text-white hover:bg-white/15 hover:text-white",
      )}
    />
  );

  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/" className="inline-flex">
              <img
                src="/logos/logo-sciencelet.svg"
                alt="Sciencelet"
                width={60}
                height={10}
                className="h-7 w-auto"
              />
            </Link>
          </div>

          {!isScrolled && (
            <div className="hidden w-full flex-shrink-0 flex-wrap items-center justify-end gap-3 sm:flex sm:w-auto sm:gap-4">
              <form
                action="/search"
                method="get"
                className="relative flex min-w-0 flex-1 items-center sm:max-w-[240px]"
                role="search"
              >
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  name="q"
                  type="search"
                  placeholder="Search..."
                  className="h-9 w-full pl-9 pr-3"
                  aria-label="Search site"
                />
              </form>
              <Button
                asChild
                size="default"
                className="bg-teal-500 text-white shadow-sm hover:bg-teal-600"
              >
                <Link href="/author/submissions/new">Publish with us</Link>
              </Button>
              <AccountDropdown />
            </div>
          )}

          {!isScrolled && (
            <div className="flex items-center gap-2 sm:hidden">
              {mobileMenuButton}
              {mobileAccount}
            </div>
          )}
        </div>
      </div>

      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent
          className={cn(
            "left-auto right-0 top-0 flex h-full max-h-[100dvh] w-[min(100vw,20rem)] max-w-[100vw] translate-x-0 translate-y-0 flex-col gap-0 overflow-y-auto rounded-none border-l p-0 shadow-xl",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100",
          )}
        >
          <DialogTitle className="sr-only">Site menu</DialogTitle>
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Menu</p>
          </div>
          <div className="flex flex-col gap-4 px-4 py-4">
            <form
              action="/search"
              method="get"
              className="relative flex w-full items-center"
              role="search"
              onSubmit={() => setMobileMenuOpen(false)}
            >
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                name="q"
                type="search"
                placeholder="Search..."
                className="h-9 w-full pl-9 pr-3"
                aria-label="Search site"
              />
            </form>
            <Button
              asChild
              className="w-full bg-teal-500 text-white shadow-sm hover:bg-teal-600"
            >
              <Link href="/author/submissions/new" onClick={() => setMobileMenuOpen(false)}>
                Publish with us
              </Link>
            </Button>
            <nav className="flex flex-col gap-1 border-t border-border pt-4 text-sm font-semibold">
              <Link
                href="/journals"
                className="rounded-md px-3 py-2.5 text-foreground hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                Journals
              </Link>
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2.5 text-foreground hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <p className="px-3 pt-2 text-xs font-normal uppercase tracking-wide text-muted-foreground">
                For authors
              </p>
              {forAuthorsCoreLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 font-medium text-foreground hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <p className="px-3 pt-2 text-xs font-normal uppercase tracking-wide text-muted-foreground">
                Policies &amp; charges
              </p>
              {forAuthorsPolicyLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 font-medium text-foreground hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </DialogContent>
      </Dialog>

      {isScrolled && <div className="h-12" aria-hidden="true" />}
      <nav
        className={cn(
          "z-50 border-t",
          !isScrolled && "hidden sm:block",
          isScrolled
            ? "fixed inset-x-0 top-0 border-teal-600 bg-teal-600 text-white shadow-md"
            : "relative border-border bg-white text-foreground",
        )}
      >
        {isScrolled ? (
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6">
            <div className="flex w-full items-center justify-between gap-2 sm:hidden">
              <Link
                href="/"
                className="mr-1 max-w-[180px] shrink-0 overflow-hidden whitespace-nowrap font-bold tracking-tight"
              >
                <img
                  src="/logos/logo-sciencelet-w.svg"
                  alt="Sciencelet"
                  width={108}
                  height={24}
                  className="h-6 w-auto"
                />
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                {mobileMenuButton}
                {mobileAccount}
              </div>
            </div>

            <div className="hidden min-w-0 flex-1 items-center gap-x-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:flex sm:gap-x-4 [&::-webkit-scrollbar]:hidden">
              <Link
                href="/"
                className="mr-1 max-w-[180px] shrink-0 overflow-hidden whitespace-nowrap font-bold tracking-tight"
              >
                <img
                  src="/logos/logo-sciencelet-w.svg"
                  alt="Sciencelet"
                  width={108}
                  height={24}
                  className="h-6 w-auto"
                />
              </Link>
              <JournalsNavTrigger
                isOpen={journalsMenuOpen}
                onToggle={() => setJournalsMenuOpen((o) => !o)}
                isScrolled={isScrolled}
              />
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 font-semibold transition-colors hover:text-teal-100"
                >
                  {item.label}
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex shrink-0 items-center gap-0.5 border-0 bg-transparent font-semibold text-white shadow-none outline-none ring-offset-background transition-colors hover:text-teal-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-600 data-[state=open]:underline"
                >
                  For Authors
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="z-[100] w-64">
                  {forAuthorsCoreLinks.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href}>{item.label}</Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Policies &amp; charges
                  </DropdownMenuLabel>
                  {forAuthorsPolicyLinks.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href}>{item.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <form
                action="/search"
                method="get"
                className="relative flex w-56 min-w-0 items-center"
                role="search"
              >
                <Search
                  className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  name="q"
                  type="search"
                  placeholder="Search..."
                  className="h-8 border-white/30 bg-white py-1 pl-8 pr-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:border-white focus-visible:ring-white/40"
                  aria-label="Search site"
                />
              </form>
              <Button
                asChild
                size="sm"
                className="h-8 shrink-0 border-0 bg-white px-3 text-xs font-semibold text-teal-700 shadow-sm hover:bg-teal-50 sm:text-sm"
              >
                <Link href="/author/submissions/new">Publish with us</Link>
              </Button>
              <AccountDropdown
                iconOnly
                align="end"
                triggerClassName="h-8 w-8 border-white/70 bg-transparent text-white hover:bg-white/15 hover:text-white"
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 text-sm sm:px-6">
            <Link
              href="/"
              className="-ml-6 mr-0 max-w-0 overflow-hidden whitespace-nowrap font-bold tracking-tight opacity-0 transition-all"
              aria-hidden
              tabIndex={-1}
            >
              <img
                src="/logos/logo-sciencelet-w.svg"
                alt="Sciencelet"
                width={108}
                height={24}
                className="h-6 w-auto"
              />
            </Link>
            <JournalsNavTrigger
              isOpen={journalsMenuOpen}
              onToggle={() => setJournalsMenuOpen((o) => !o)}
              isScrolled={isScrolled}
            />
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-semibold transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center gap-0.5 border-0 bg-transparent font-semibold text-foreground shadow-none outline-none ring-offset-background transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 data-[state=open]:underline"
              >
                For Authors
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="z-[100] w-64">
                {forAuthorsCoreLinks.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Policies &amp; charges
                </DropdownMenuLabel>
                {forAuthorsPolicyLinks.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <JournalsNavDropdownPanel open={journalsMenuOpen} onClose={() => setJournalsMenuOpen(false)} />
      </nav>
    </header>
  );
}
