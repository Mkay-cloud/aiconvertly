import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { JsonLd } from "@/components/JsonLd";
import { RelatedToolCta } from "@/components/RelatedToolCta";
import { getBlogPost, getBlogSlugs, formatPublishDate } from "@/lib/blog";
import { getTool } from "@/lib/tools";
import { blogPostingSchema } from "@/lib/structuredData";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: `${post.title} | AI convertly`,
      description: post.description,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishDate,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  // getAllBlogPosts() already asserts relatedTool matches a real tool slug
  // (see blog.ts), so this lookup can't silently miss.
  const relatedTool = post.relatedTool ? getTool(post.relatedTool) : undefined;

  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-20">
      <JsonLd data={blogPostingSchema(post)} />
      <div className="flex flex-col gap-4">
        <Link
          href="/blog"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-secondary transition-colors hover:text-foreground"
        >
          <span aria-hidden>&larr;</span> Blog
        </Link>
        <div className="flex items-center gap-3 text-xs font-medium text-secondary">
          <span className="rounded-full border border-card-border px-2.5 py-1 text-accent">
            {post.category}
          </span>
          <time dateTime={post.publishDate}>{formatPublishDate(post.publishDate)}</time>
        </div>
        <h1 className="font-display max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {post.title}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-secondary">{post.description}</p>
      </div>

      <div className="blog-prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

      {relatedTool && <RelatedToolCta tool={relatedTool} />}
    </Container>
  );
}

// This dynamic route only ever serves the pre-rendered slugs from
// generateStaticParams -- getBlogPost() reads from content/blog at build
// time, so an unknown slug can only reach here via a stale/guessed URL,
// not a real published article. Fail with a real 404 rather than a
// broken page, same as any not-found route.
export const dynamicParams = false;
