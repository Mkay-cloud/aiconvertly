import type { MetadataRoute } from "next";
import { tools } from "@/lib/tools";
import { getAllBlogPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

// Without this, Next treats sitemap.ts as a static route with no dynamic
// APIs in it and pre-renders it once, and Vercel's edge then serves that
// single build's output indefinitely rather than regenerating it on each
// new deployment the way /blog and /blog/[slug] already do (those read
// getAllBlogPosts() live and showed a just-published post correctly while
// /sitemap.xml kept serving a build from several posts back). Forcing this
// route to render fresh on every request keeps it in sync with whatever
// the newest deploy actually published, at the cost of one extra
// filesystem read per sitemap request -- a fine trade for a route search
// engines fetch occasionally, not on every page view.
export const revalidate = 0;

export default function sitemap(): MetadataRoute.Sitemap {
  const toolRoutes: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${SITE_URL}/tools/${tool.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const blogRoutes: MetadataRoute.Sitemap = getAllBlogPosts().map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishDate),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...toolRoutes,
    ...blogRoutes,
  ];
}
