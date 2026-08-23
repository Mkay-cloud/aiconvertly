import type { Tool } from "./tools";
import type { BlogPostMeta } from "./blog";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "./site";

/**
 * schema.org SoftwareApplication for a single tool page, built entirely
 * from the shared tool registry (tools.ts) -- the same source the homepage
 * grid, footer, sitemap, and Format Catalog already read from -- so this
 * never drifts out of sync with what's actually shown on the page.
 *
 * offers.price "0" is the field that actually identifies the tool as free
 * to search engines; deliberately no aggregateRating/review/ratingCount --
 * those would be fabricated (we have no real reviews), and search engines
 * actively detect and penalize fake review markup.
 */
export function toolSoftwareApplicationSchema(tool: Tool) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.description,
    url: `${SITE_URL}/tools/${tool.slug}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

/**
 * schema.org BlogPosting for a single article page, built entirely from
 * that article's own frontmatter (blog.ts) -- the same "one source of
 * truth" approach as toolSoftwareApplicationSchema above. No author
 * byline field: articles are published under the site itself, not an
 * individual, so both author and publisher point at the same Organization.
 */
export function blogPostingSchema(post: BlogPostMeta) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url,
    datePublished: post.publishDate,
    dateModified: post.publishDate,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}

/**
 * Site-level WebSite + Organization schema for the homepage. A @graph
 * (rather than two separate <script> tags) is the standard way to attach
 * multiple linked entities to one page under a single JSON-LD context.
 */
export function siteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
      },
    ],
  };
}
