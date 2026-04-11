"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown, CircleUser, Search } from "lucide-react";
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

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [journalsMenuOpen, setJournalsMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(readDocumentScrollY() > 100);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link href="/" className="inline-flex">
              <Image
                src="/logos/logo-sciencelet.svg"
                alt="Sciencelet"
                width={60}
                height={10}
                className="h-7 w-auto"
                priority
              />
            </Link>
          </div>
          {!isScrolled && (
            <div className="flex w-full flex-shrink-0 flex-wrap items-center justify-end gap-3 sm:w-auto sm:gap-4">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 border-border bg-background font-medium"
                  >
                    <CircleUser className="h-4 w-4 shrink-0" aria-hidden />
                    Account
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
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
            </div>
          )}
        </div>
      </div>

      {isScrolled && <div className="h-12" aria-hidden="true" />}
      <nav
        className={cn(
          "z-50 border-t",
          isScrolled
            ? "fixed inset-x-0 top-0 border-teal-600 bg-teal-600 text-white shadow-md"
            : "relative border-border bg-white text-foreground",
        )}
      >
        <div
          className={cn(
            "mx-auto max-w-7xl px-4 py-2 text-sm sm:px-6",
            isScrolled && "flex items-center gap-2",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 items-center",
              isScrolled
                ? "flex-1 gap-x-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-x-4 [&::-webkit-scrollbar]:hidden"
                : "flex-wrap gap-x-6 gap-y-2",
            )}
          >
            <Link
              href="/"
              className={cn(
                "shrink-0 overflow-hidden whitespace-nowrap font-bold tracking-tight transition-all",
                isScrolled ? "mr-1 max-w-[180px] opacity-100" : "-ml-6 mr-0 max-w-0 opacity-0",
              )}
              aria-hidden={!isScrolled}
              tabIndex={isScrolled ? 0 : -1}
            >
              <Image
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
                className={cn(
                  "shrink-0 font-semibold transition-colors",
                  isScrolled ? "hover:text-teal-100" : "hover:text-primary",
                )}
              >
                {item.label}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex shrink-0 items-center gap-0.5 border-0 bg-transparent font-semibold shadow-none outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 data-[state=open]:underline",
                  isScrolled
                    ? "text-white ring-offset-teal-600 hover:text-teal-100 focus-visible:ring-white"
                    : "text-foreground hover:text-primary focus-visible:ring-primary focus-visible:ring-offset-2",
                )}
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

          {isScrolled && (
            <div className="flex shrink-0 items-center gap-2">
              <form
                action="/search"
                method="get"
                className="relative flex w-[min(100%,9rem)] min-w-0 items-center sm:w-56"
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <CircleUser className="h-7 w-7 cursor-pointer" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
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
            </div>
          )}
        </div>
        <JournalsNavDropdownPanel open={journalsMenuOpen} onClose={() => setJournalsMenuOpen(false)} />
      </nav>
    </header>
  );
}
