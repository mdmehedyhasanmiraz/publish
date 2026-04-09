"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Journals", href: "/j/demo-journal" },
  { label: "Subjects", href: "#" },
  { label: "Latest Research", href: "#" },
  { label: "News & Views", href: "#" },
  { label: "For Authors", href: "/dashboard/submissions" },
];

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="border-b border-border bg-white">
      <div className="border-b border-border">
        <div className="mx-auto bg-teal-500 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-xs">
            <p>Part of PublisherOS Journals</p>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="hover:text-foreground">
                Login
              </Link>
              <Link href="/dashboard/settings" className="hover:text-foreground">
                Subscribe
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-5">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Scholarly Publishing</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight">PublisherOS</h1>
          </div>
          <p className="max-w-md text-right text-sm text-muted-foreground">
            Trusted research journals, editorial excellence, and open scholarly communication.
          </p>
        </div>
      </div>

      {isScrolled && <div className="h-[49px]" aria-hidden="true" />}
      <nav
        className={`border-t transition-colors ${
          isScrolled
            ? "fixed inset-x-0 top-0 z-50 border-teal-700 bg-teal-600 text-white shadow-md"
            : "border-border bg-white text-foreground"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 text-sm">
          <Link
            href="/"
            className={`overflow-hidden whitespace-nowrap font-semibold tracking-tight transition-all ${
              isScrolled ? "mr-2 max-w-[180px] opacity-100" : "mr-0 max-w-0 opacity-0"
            }`}
            aria-hidden={!isScrolled}
            tabIndex={isScrolled ? 0 : -1}
          >
            PublisherOS
          </Link>
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`font-medium transition-colors ${
                isScrolled ? "hover:text-teal-100" : "hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
