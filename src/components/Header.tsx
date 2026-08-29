"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { homeCategories, TOOL_CATEGORY_NAV_EVENT } from "@/lib/toolCategories";

export function Header() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-card-border/60 bg-bg/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-3 sm:gap-6">
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-haspopup="true"
              className="flex items-center gap-1 text-sm font-medium text-secondary transition-colors hover:text-foreground"
            >
              Tools
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              >
                <path
                  d="m6 9 6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {open && (
              <div
                role="menu"
                className="absolute right-0 top-full z-10 mt-2 w-56 overflow-hidden rounded-2xl border border-card-border bg-card p-2 shadow-xl"
              >
                <Link
                  href="/#tools"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    window.dispatchEvent(new CustomEvent(TOOL_CATEGORY_NAV_EVENT, { detail: "all" }));
                  }}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-bg"
                >
                  All tools
                </Link>
                <div className="my-1 h-px bg-card-border" />
                {homeCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/#tools-${category.id}`}
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      window.dispatchEvent(
                        new CustomEvent(TOOL_CATEGORY_NAV_EVENT, { detail: category.id })
                      );
                    }}
                    className="block rounded-lg px-3 py-2.5 text-sm text-secondary transition-colors hover:bg-bg hover:text-foreground"
                  >
                    {category.sectionLabel}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <ThemeToggle />
          <Link
            href="/blog"
            className="text-sm font-medium text-secondary transition-colors hover:text-foreground"
          >
            Blog
          </Link>
          <Link
            href="/#tools"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Get started
          </Link>
        </nav>
      </Container>
    </header>
  );
}
