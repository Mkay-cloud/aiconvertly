"use client";

import { useEffect, useState } from "react";
import { Container } from "./Container";
import { ToolCard } from "./ToolCard";
import {
  homeCategories,
  toolsForHomeCategory,
  TOOL_CATEGORY_NAV_EVENT,
  type HomeCategoryId,
} from "@/lib/toolCategories";
import { tools } from "@/lib/tools";

type Filter = "all" | HomeCategoryId;

const hashToFilter: Record<string, Filter> = {
  "#tools-pdf": "pdf",
  "#tools-image": "image",
  "#tools-video-audio": "video-audio",
};

const sections = homeCategories.map((category) => ({
  ...category,
  tools: toolsForHomeCategory(category.id),
}));

export function ToolsSection() {
  const [filter, setFilter] = useState<Filter>("all");

  // Lets the header's Tools dropdown (or any /#tools-<category> link, from
  // any page) jump straight to a filtered category.
  useEffect(() => {
    function scrollToTop() {
      requestAnimationFrame(() => {
        document.getElementById("tools")?.scrollIntoView({ block: "start" });
      });
    }
    // Handles landing here fresh -- a cross-page link, a bookmark, or the
    // browser's back/forward buttons, all of which set the hash before (or
    // without ever re-mounting) this component.
    function applyHash() {
      const next = hashToFilter[window.location.hash];
      if (next) {
        setFilter(next);
        scrollToTop();
      }
    }
    // Handles clicking the dropdown while already on this page: a same-page
    // hash-only link updates the URL via history.pushState, which -- unlike
    // a real navigation -- never fires the native `hashchange` event, so
    // the header dispatches this instead.
    function applyEvent(event: Event) {
      const detail = (event as CustomEvent<Filter>).detail;
      setFilter(detail);
      scrollToTop();
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    window.addEventListener(TOOL_CATEGORY_NAV_EVENT, applyEvent);
    return () => {
      window.removeEventListener("hashchange", applyHash);
      window.removeEventListener(TOOL_CATEGORY_NAV_EVENT, applyEvent);
    };
  }, []);

  return (
    <section id="tools" className="scroll-mt-20 py-20 sm:py-24">
      <Container className="flex flex-col gap-12">
        <div className="flex flex-col gap-4 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {tools.length} tools. Zero friction.
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-secondary">
            Every tool below runs entirely client-side — your files are
            processed on your device and never touch a server.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-accent text-accent-foreground"
                : "border border-card-border text-secondary hover:text-foreground"
            }`}
          >
            All
          </button>
          {homeCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setFilter(category.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === category.id
                  ? "bg-accent text-accent-foreground"
                  : "border border-card-border text-secondary hover:text-foreground"
              }`}
            >
              {category.tabLabel}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-14">
          {sections.map((section) => (
            <div
              key={section.id}
              id={`tools-${section.id}`}
              className={`scroll-mt-20 flex flex-col gap-6 ${
                filter === "all" || filter === section.id ? "" : "hidden"
              }`}
            >
              <h3 className="font-display text-xl font-semibold text-foreground">
                {section.sectionLabel}
              </h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {section.tools.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
